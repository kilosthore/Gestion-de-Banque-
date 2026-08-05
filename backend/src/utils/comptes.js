const { Compte } = require('../models');

/** Bonus de bienvenue crédité sur le compte chèque à l'ouverture (cohérent /register et KYC). */
const BONUS_BIENVENUE = 500;

/**
 * Ouvre les comptes initiaux d'un nouveau client : un compte chèque (crédité du
 * bonus de bienvenue) et un compte épargne (solde 0). Le chèque est créé en
 * premier pour rester le premier compte affiché (tri par dateOuverture ASC).
 *
 * @param {string} proprietaire - _id du client
 * @param {{ transaction?: import('sequelize').Transaction }} [options]
 * @returns {Promise<{ cheque: Compte, epargne: Compte }>}
 */
async function ouvrirComptesInitiaux(proprietaire, options = {}) {
  const { transaction } = options;
  const cheque = await Compte.create(
    { proprietaire, numero: Compte.genererNumero(), type: 'cheque', solde: BONUS_BIENVENUE },
    { transaction },
  );
  const epargne = await Compte.create(
    { proprietaire, numero: Compte.genererNumero(), type: 'epargne', solde: 0 },
    { transaction },
  );
  return { cheque, epargne };
}

module.exports = { ouvrirComptesInitiaux, BONUS_BIENVENUE };
