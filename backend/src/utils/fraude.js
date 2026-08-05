/**
 * Moteur d'alertes anti-fraude (idée 3) — branché sur l'audit trail chaîné.
 * Évalué en best-effort (setImmediate) après chaque opération financière
 * auditée : ne ralentit ni ne bloque JAMAIS l'opération elle-même.
 *
 * Règles (seuils ajustables ci-dessous) :
 *  R1 — Montant élevé      : opération ≥ MONTANT_ABSOLU $
 *  R2 — Montant inhabituel : ≥ MULTIPLE_MOYENNE × la moyenne des dernières opérations
 *  R3 — Vélocité           : ≥ VELOCITE_NB opérations en VELOCITE_MINUTES minutes
 *  R4 — Nouvelle IP        : première opération financière depuis cette adresse
 */
const { Op } = require('sequelize');

const SEUILS = {
  MONTANT_ABSOLU: 5000,     // $ CAD
  MULTIPLE_MOYENNE: 3,      // × la moyenne personnelle
  MOYENNE_MIN_OPERATIONS: 5, // R2 inactive avant 5 opérations (pas d'historique fiable)
  VELOCITE_NB: 5,
  VELOCITE_MINUTES: 5,
  ANTI_SPAM_MINUTES: 30,    // pas deux fois la même alerte en 30 min
};

const ACTIONS_FINANCIERES = /^(transaction|paypal|virement|pret)\./;

/** Notifie le client + tous les admins, avec anti-spam par règle. */
async function alerter(userId, regle, detail) {
  const { User, Notification } = require('../models');
  const prefixe = `Alerte sécurité (${regle})`;
  const depuis = new Date(Date.now() - SEUILS.ANTI_SPAM_MINUTES * 60000);

  const dejaEnvoyee = await Notification.findOne({
    where: { client: userId, message: { [Op.like]: `${prefixe}%` }, date: { [Op.gte]: depuis } },
  });
  if (dejaEnvoyee) return;

  await Notification.envoyer(userId, `${prefixe} : ${detail} Si vous n'êtes pas à l'origine de cette opération, contactez-nous immédiatement.`);

  const admins = await User.findAll({ where: { role: 'admin' } });
  await Promise.all(admins.map((a) =>
    Notification.envoyer(a._id, `${prefixe} : ${detail} [client ${userId}]`)
  ));
}

/**
 * Évalue toutes les règles pour une opération financière déjà auditée.
 * @param {object} ctx { userId, action, ip, montant }
 */
async function evaluerRisque({ userId, action, ip, montant }) {
  if (!userId || !ACTIONS_FINANCIERES.test(action || '')) return;
  const { Transaction, AuditLog } = require('../models');
  const montantNum = Number(montant);

  /* R1 — montant élevé (absolu) */
  if (montantNum >= SEUILS.MONTANT_ABSOLU) {
    await alerter(userId, 'montant élevé',
      `opération de ${montantNum.toFixed(2)} $ (seuil : ${SEUILS.MONTANT_ABSOLU} $).`);
  }

  /* R2 — montant inhabituel vs la moyenne personnelle */
  if (montantNum > 0) {
    const dernieres = await Transaction.findAll({
      where: { client: userId, statut: 'executee' },
      order: [['date', 'DESC']],
      limit: 20,
      attributes: ['montant'],
    });
    if (dernieres.length >= SEUILS.MOYENNE_MIN_OPERATIONS) {
      const moyenne = dernieres.reduce((s, t) => s + t.montant, 0) / dernieres.length;
      if (moyenne > 0 && montantNum >= SEUILS.MULTIPLE_MOYENNE * moyenne) {
        await alerter(userId, 'montant inhabituel',
          `opération de ${montantNum.toFixed(2)} $, soit ${(montantNum / moyenne).toFixed(1)}× votre moyenne habituelle (${moyenne.toFixed(2)} $).`);
      }
    }
  }

  /* R3 — vélocité : rafale d'opérations financières */
  const depuis = new Date(Date.now() - SEUILS.VELOCITE_MINUTES * 60000);
  const nbRecentes = await AuditLog.count({
    where: {
      userId,
      action: { [Op.regexp]: ACTIONS_FINANCIERES.source },
      createdAt: { [Op.gte]: depuis },
    },
  });
  if (nbRecentes >= SEUILS.VELOCITE_NB) {
    await alerter(userId, 'vélocité',
      `${nbRecentes} opérations financières en moins de ${SEUILS.VELOCITE_MINUTES} minutes.`);
  }

  /* R4 — nouvelle adresse IP (jamais vue pour ce client) */
  if (ip) {
    const nbAvecCetteIp = await AuditLog.count({ where: { userId, ipAddress: ip } });
    // L'entrée d'audit de l'opération courante est déjà écrite → 1 = première fois
    if (nbAvecCetteIp <= 1) {
      await alerter(userId, 'nouvel appareil',
        `opération financière depuis une adresse jamais utilisée (${ip}).`);
    }
  }
}

module.exports = { evaluerRisque, SEUILS };
