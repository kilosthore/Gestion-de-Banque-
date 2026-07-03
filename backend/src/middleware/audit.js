const crypto = require('crypto');
const { sequelize, AuditLog, AuditChainState } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware d'audit trail (E2). À placer APRÈS protect() sur les routes sensibles,
 * ou directement sur les routes anonymes (login) — la route peut alors renseigner
 * req.auditUserId pour identifier l'utilisateur concerné.
 *
 * Intégrité (E8) : les entrées sont chaînées par SHA-256 (chaque entrée contient
 * le hash de la précédente). L'état de la chaîne est sérialisé via un verrou
 * FOR UPDATE sur la ligne unique d'AuditChainState. Toute altération d'une
 * entrée casse la chaîne → détectable via verifierChaine().
 *
 * Ne bloque jamais la requête : si l'écriture audit échoue, on log et on continue.
 */
function auditLog(action) {
  return async (req, res, next) => {
    // Hook sur la fin de la réponse pour capturer le statut
    res.on('finish', async () => {
      try {
        const payload = {
          statusCode: res.statusCode,
          method: req.method,
          path: req.originalUrl,
          // On stocke un sous-ensemble du body pour traçabilité, jamais les secrets
          ...(req.body && typeof req.body === 'object' && {
            params: nettoyerPayload(req.body),
          }),
        };
        await ecrireEntreeChainee({
          userId: req.user?._id || req.auditUserId || null,
          action,
          // req.ip est fiable grâce à trust proxy — pas de fallback sur
          // x-forwarded-for brut (falsifiable par le client)
          ipAddress: (req.ip || '').toString().slice(0, 45),
          userAgent: (req.headers['user-agent'] || '').slice(0, 500),
          payload,
        });
      } catch (err) {
        logger.error({ err: err.message, action }, 'audit_log_failed');
      }
    });
    next();
  };
}

/** Écrit une entrée d'audit chaînée au précédent hash (sérialisé par verrou). */
async function ecrireEntreeChainee(champs) {
  await sequelize.transaction(async (t) => {
    // Verrou exclusif sur l'état de la chaîne : sérialise les écritures
    let etat = await AuditChainState.findByPk(1, { lock: t.LOCK.UPDATE, transaction: t });
    if (!etat) {
      etat = await AuditChainState.create({ _id: 1, dernierHash: 'GENESE' }, { transaction: t });
      await etat.reload({ lock: t.LOCK.UPDATE, transaction: t });
    }

    const entree = {
      _id: crypto.randomUUID(),
      createdAt: new Date(),
      hashPrecedent: etat.dernierHash,
      ...champs,
    };
    entree.empreinte = calculerEmpreinte(entree);

    await AuditLog.create(entree, { transaction: t });
    await etat.update({ dernierHash: entree.empreinte }, { transaction: t });
  });
}

/** SHA-256 canonique d'une entrée (mêmes champs à l'écriture et à la vérification). */
function calculerEmpreinte(e) {
  // Sous MariaDB (XAMPP), le type JSON est un alias de LONGTEXT : Sequelize
  // renvoie alors une chaîne à la relecture. On la re-parse pour que le hash
  // soit identique à l'écriture (objet) et à la vérification (chaîne).
  let payload = e.payload || null;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { /* chaîne brute conservée */ }
  }
  const base = [
    e.hashPrecedent,
    e._id,
    e.userId || '',
    e.action,
    e.ipAddress || '',
    e.userAgent || '',
    jsonCanonique(payload),
    new Date(e.createdAt).toISOString(),
  ].join('|');
  return crypto.createHash('sha256').update(base, 'utf8').digest('hex');
}

/** JSON déterministe (clés triées récursivement) — MySQL ne préserve pas
 *  l'ordre des clés JSON, il faut donc canoniser avant de hacher. */
function jsonCanonique(valeur) {
  if (valeur === null || typeof valeur !== 'object') return JSON.stringify(valeur);
  if (Array.isArray(valeur)) return `[${valeur.map(jsonCanonique).join(',')}]`;
  const cles = Object.keys(valeur).sort();
  return `{${cles.map((k) => `${JSON.stringify(k)}:${jsonCanonique(valeur[k])}`).join(',')}}`;
}

/**
 * Vérifie l'intégrité de toute la chaîne d'audit.
 * Retourne { valide, total, verifiees, anciennes, anomalies[] } :
 *  - anciennes : entrées créées avant l'activation du chaînage (sans empreinte)
 *  - anomalies : entrées dont l'empreinte ou le chaînage ne correspond plus
 */
async function verifierChaine() {
  const entrees = await AuditLog.findAll({ order: [['seq', 'ASC']] });
  const anomalies = [];
  let anciennes = 0;
  let attendu = 'GENESE';

  for (const e of entrees) {
    if (!e.empreinte) { anciennes += 1; continue; } // legacy, avant le chaînage
    if (e.hashPrecedent !== attendu) {
      anomalies.push({ seq: e.seq, _id: e._id, probleme: 'chaînage rompu (entrée modifiée, insérée ou supprimée)' });
    }
    if (calculerEmpreinte(e) !== e.empreinte) {
      anomalies.push({ seq: e.seq, _id: e._id, probleme: 'empreinte invalide (contenu altéré)' });
    }
    attendu = e.empreinte;
  }

  // L'état de la chaîne doit pointer sur la dernière empreinte
  const etat = await AuditChainState.findByPk(1);
  if (etat && etat.dernierHash !== attendu) {
    anomalies.push({ seq: null, _id: null, probleme: 'état de chaîne incohérent (entrées finales supprimées ?)' });
  }

  return {
    valide: anomalies.length === 0,
    total: entrees.length,
    verifiees: entrees.length - anciennes,
    anciennes,
    anomalies,
  };
}

/** Retire les champs sensibles (mots de passe, codes, tokens, photos) avant audit */
function nettoyerPayload(body) {
  const interdits = [
    'motDePasse', 'confirmationMotDePasse', 'codeDemo', 'code',
    'tempToken', 'token', 'imageCheque', 'codeHache',
  ];
  const clean = {};
  for (const [k, v] of Object.entries(body)) {
    if (interdits.includes(k)) continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      clean[k] = nettoyerPayload(v);
    } else if (typeof v === 'string' && v.length > 500) {
      clean[k] = v.slice(0, 500) + '…';
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

module.exports = { auditLog, verifierChaine };
