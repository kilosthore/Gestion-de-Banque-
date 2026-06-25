const { Op } = require('sequelize');
const { sequelize, Transaction, Compte, Otp, RevokedToken } = require('../models');
const { verifierSoldeFaible } = require('./notif');
const logger = require('./logger');

/**
 * US-17 — Exécute les transactions récurrentes arrivées à échéance.
 * Chaque échéance est traitée dans sa propre transaction atomique :
 * un échec sur l'une n'affecte pas les suivantes.
 * Appelé au démarrage puis toutes les heures.
 */
async function executerRecurrentes() {
  const dues = await Transaction.findAll({
    where: { statut: 'planifiee', prochaineDate: { [Op.lte]: new Date() } },
  });
  for (const planifiee of dues) {
    let compteFinal = null;
    try {
      compteFinal = await sequelize.transaction(async (t) => {
        const compte = await Compte.findOne({
          where: { _id: planifiee.compte },
          lock: t.LOCK.UPDATE, transaction: t,
        });
        if (!compte) throw new Error('Compte introuvable');

        compte.debiter(planifiee.montant);
        await compte.save({ transaction: t });

        await Transaction.create({
          compte: compte._id,
          client: planifiee.client,
          type: planifiee.type,
          montant: planifiee.montant,
          sens: 'debit',
          description: `${planifiee.description} (récurrente)`,
          beneficiaire: planifiee.beneficiaire,
          fournisseur: planifiee.fournisseur,
        }, { transaction: t });

        // Replanifier la prochaine occurrence dans la même transaction
        const prochaine = new Date(planifiee.prochaineDate);
        if (planifiee.recurrence === 'hebdomadaire') prochaine.setDate(prochaine.getDate() + 7);
        else prochaine.setMonth(prochaine.getMonth() + 1);
        planifiee.prochaineDate = prochaine;
        await planifiee.save({ transaction: t });

        return compte;
      });
      // Notification post-commit (best effort)
      if (compteFinal) await verifierSoldeFaible(compteFinal);
    } catch {
      // Solde insuffisant ou compte introuvable : on réessaiera à la prochaine échéance.
      // Sequelize a déjà rollback le débit + la transaction + la replanification.
    }
  }
}

/** E8 — Purge des OTP expirés et des tokens JWT révoqués au-delà de leur expiration.
 *  Évite le grossissement infini de ces tables. */
async function purger() {
  try {
    const otpsSupp = await Otp.destroy({ where: { expireA: { [Op.lt]: new Date() } } });
    const tokensSupp = await RevokedToken.destroy({ where: { expireA: { [Op.lt]: new Date() } } });
    if (otpsSupp || tokensSupp) {
      logger.info({ otpsSupp, tokensSupp }, 'purge_executee');
    }
  } catch (err) {
    logger.error({ err: err.message }, 'purge_echec');
  }
}

function demarrerPlanificateur() {
  executerRecurrentes();
  purger();
  setInterval(executerRecurrentes, 60 * 60 * 1000); // toutes les heures
  setInterval(purger, 30 * 60 * 1000); // purge toutes les 30 min
}

module.exports = { demarrerPlanificateur, executerRecurrentes, purger };
