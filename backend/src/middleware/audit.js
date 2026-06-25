const { AuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware d'audit trail (E2). À placer APRÈS protect() sur les routes sensibles.
 * Persiste : qui (userId), quoi (action), d'où (IP + UA), avec quoi (payload nettoyé).
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
        await AuditLog.create({
          userId: req.user?._id || null,
          action,
          ipAddress: (req.ip || req.headers['x-forwarded-for'] || '').toString().slice(0, 45),
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

module.exports = { auditLog };
