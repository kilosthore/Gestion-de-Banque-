const Notification = require('../models/Notification');
const ParametresGlobaux = require('../models/ParametresGlobaux');

/**
 * US-20 — Après chaque débit, vérifie si le solde passe sous le seuil
 * configuré par l'administrateur et envoie une notification.
 */
async function verifierSoldeFaible(compte) {
  const params = await ParametresGlobaux.obtenir();
  if (compte.solde < params.seuilSoldeFaible) {
    await Notification.envoyer(
      compte.proprietaire,
      `⚠️ Solde faible : votre compte ${compte.type} n°${compte.numero} est à ${compte.solde.toFixed(2)} ${compte.devise} (seuil : ${params.seuilSoldeFaible} ${params.devise}).`
    );
  }
}

module.exports = { verifierSoldeFaible };
