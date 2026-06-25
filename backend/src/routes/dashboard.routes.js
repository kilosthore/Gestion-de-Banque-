const router = require('express').Router();
const { Op, fn, col, literal } = require('sequelize');
const {
  Compte, Transaction, ObjectifEpargne, ParametresGlobaux,
} = require('../models');
const { protect } = require('../middleware/auth');

router.use(protect);

/* US-26 — Endpoint agrégé pour éviter 5 appels parallèles au chargement du dashboard.
   Retourne tout ce dont la page d'accueil a besoin en une seule requête HTTP. */
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user._id;
    const il_y_a_30j = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const debut6Mois = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

    const [comptes, tx30j, recents, objectifs, params, parMois] = await Promise.all([
      Compte.findAll({
        where: { proprietaire: userId },
        order: [['dateOuverture', 'ASC']],
      }),
      Transaction.findAll({
        where: {
          client: userId,
          statut: 'executee',
          date: { [Op.gte]: il_y_a_30j },
        },
        attributes: ['sens', 'montant'],
      }),
      Transaction.findAll({
        where: { client: userId, statut: { [Op.in]: ['executee', 'en_attente'] } },
        order: [['date', 'DESC']],
        limit: 10,
      }),
      ObjectifEpargne.findAll({ where: { client: userId } }),
      ParametresGlobaux.obtenir(),
      Transaction.findAll({
        attributes: [
          [fn('YEAR', col('date')), 'annee'],
          [fn('MONTH', col('date')), 'mois'],
          [fn('SUM', literal("CASE WHEN sens='credit' THEN montant ELSE 0 END")), 'credits'],
          [fn('SUM', literal("CASE WHEN sens='debit' THEN montant ELSE 0 END")), 'debits'],
        ],
        where: {
          client: userId,
          statut: 'executee',
          date: { [Op.gte]: debut6Mois },
        },
        group: [literal('YEAR(`date`)'), literal('MONTH(`date`)')],
        order: [literal('annee ASC'), literal('mois ASC')],
        raw: true,
      }),
    ]);

    // Solde total : on exclut les CarteCredit (leur solde est 0 par construction)
    const totalBalance = comptes
      .filter((c) => c.kind !== 'CarteCredit')
      .reduce((s, c) => s + Number(c.solde), 0);

    // Variation 30j approximée : solde actuel − (crédits − débits sur 30j)
    const credits30j = tx30j.filter((t) => t.sens === 'credit').reduce((s, t) => s + Number(t.montant), 0);
    const debits30j = tx30j.filter((t) => t.sens === 'debit').reduce((s, t) => s + Number(t.montant), 0);
    const balance30daysAgo = totalBalance - credits30j + debits30j;
    const trend30j = balance30daysAgo === 0
      ? 0
      : ((totalBalance - balance30daysAgo) / Math.abs(balance30daysAgo)) * 100;

    const spendingByMonth = parMois.map((l) => ({
      annee: Number(l.annee),
      mois: Number(l.mois),
      credits: Number(l.credits),
      debits: Number(l.debits),
    }));

    const topGoals = objectifs
      .map((o) => ({ ...o.toJSON(), progression: o.progression() }))
      .sort((a, b) => b.progression - a.progression)
      .slice(0, 3);

    res.json({
      user: {
        id: req.user._id,
        nom: req.user.nom,
        prenom: req.user.prenom,
        email: req.user.email,
        role: req.user.role,
        dateCreation: req.user.dateCreation,
      },
      totalBalance,
      currency: params.devise,
      trend30j,
      accounts: comptes,
      recentTransactions: recents,
      spendingByMonth,
      topGoals,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
