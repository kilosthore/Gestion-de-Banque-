/**
 * Surveillance des enveloppes budgétaires (idée « budgets intelligents »).
 * Appelée en best-effort après CHAQUE création de transaction (hook afterCreate,
 * post-commit) : si le cumul du mois dépasse le plafond de la catégorie,
 * le client reçoit une notification — une seule par catégorie et par mois.
 */
const { Op } = require('sequelize');

/** Bornes [début, fin) du mois d'une date. */
function bornesDuMois(date = new Date()) {
  const debut = new Date(date.getFullYear(), date.getMonth(), 1);
  const fin = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { debut, fin };
}

/** Cumul des débits exécutés d'un client pour une catégorie sur un mois. */
async function depensesDuMois(client, categorie, date = new Date()) {
  const { Transaction } = require('../models');
  const { debut, fin } = bornesDuMois(date);
  return (await Transaction.sum('montant', {
    where: {
      client, categorie, sens: 'debit', statut: 'executee',
      date: { [Op.gte]: debut, [Op.lt]: fin },
    },
  })) || 0;
}

/** Vérifie l'enveloppe de la catégorie de cette transaction, notifie si dépassée. */
async function surveillerBudget(tx) {
  if (!tx || tx.sens !== 'debit' || tx.statut !== 'executee' || !tx.client || !tx.categorie) return;
  const { Budget, Notification } = require('../models');

  const budget = await Budget.findOne({ where: { client: tx.client, categorie: tx.categorie } });
  if (!budget) return;

  const total = await depensesDuMois(tx.client, tx.categorie, new Date(tx.date || Date.now()));
  if (total <= budget.plafond) return;

  // Anti-spam : une seule alerte par catégorie et par mois
  const { debut } = bornesDuMois(new Date(tx.date || Date.now()));
  const prefixe = `Budget dépassé — ${tx.categorie}`;
  const dejaNotifie = await Notification.findOne({
    where: { client: tx.client, message: { [Op.like]: `${prefixe}%` }, date: { [Op.gte]: debut } },
  });
  if (dejaNotifie) return;

  await Notification.envoyer(
    tx.client,
    `${prefixe} : ${total.toFixed(2)} $ dépensés ce mois-ci pour un plafond de ${budget.plafond.toFixed(2)} $.`
  );
}

module.exports = { surveillerBudget, depensesDuMois, bornesDuMois };
