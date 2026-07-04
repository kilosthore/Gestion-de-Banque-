/**
 * Budgets intelligents (idée 5) — enveloppes mensuelles par catégorie.
 * Les transactions sont catégorisées automatiquement (hook beforeCreate) ;
 * ici on expose : consultation des enveloppes + dépenses du mois,
 * définition/suppression d'une enveloppe, et rapport mensuel détaillé.
 */
const router = require('express').Router();
const { Op } = require('sequelize');
const { Budget, Transaction } = require('../models');
const { protect } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { categoriser, CATEGORIES } = require('../utils/categoriser');
const { bornesDuMois } = require('../utils/budget');

router.use(protect);

/** Agrège les transactions d'un client sur [debut, fin) par catégorie. */
async function totauxParCategorie(client, debut, fin) {
  const transactions = await Transaction.findAll({
    where: { client, statut: 'executee', date: { [Op.gte]: debut, [Op.lt]: fin } },
    attributes: ['montant', 'sens', 'categorie', 'description', 'type'],
  });
  const totaux = {}; // { categorie: { depenses, revenus, nb } }
  for (const t of transactions) {
    // Rétro-compatibilité : les transactions d'avant la fonctionnalité n'ont
    // pas de catégorie stockée → on la déduit à la volée, même moteur.
    const cat = t.categorie || categoriser(t.description, t.type, t.sens);
    totaux[cat] ??= { depenses: 0, revenus: 0, nb: 0 };
    totaux[cat][t.sens === 'debit' ? 'depenses' : 'revenus'] += t.montant;
    totaux[cat].nb += 1;
  }
  return totaux;
}

/* Mes enveloppes + dépenses du mois courant (pour les barres de progression) */
router.get('/', async (req, res) => {
  const { debut, fin } = bornesDuMois();
  const [budgets, totaux] = await Promise.all([
    Budget.findAll({ where: { client: req.user._id } }),
    totauxParCategorie(req.user._id, debut, fin),
  ]);
  res.json({
    categories: CATEGORIES,
    budgets: budgets.map((b) => ({
      categorie: b.categorie,
      plafond: b.plafond,
      depense: totaux[b.categorie]?.depenses || 0,
    })),
    horsBudget: Object.entries(totaux)
      .filter(([cat, t]) => t.depenses > 0 && !budgets.some((b) => b.categorie === cat))
      .map(([cat, t]) => ({ categorie: cat, depense: t.depenses })),
  });
});

/* Définir (ou mettre à jour) l'enveloppe d'une catégorie */
router.post('/', auditLog('budget.definir'), async (req, res) => {
  const { categorie, plafond } = req.body;
  const montant = Number(plafond);
  if (!CATEGORIES.includes(categorie)) {
    return res.status(400).json({ message: 'Catégorie inconnue' });
  }
  if (!Number.isFinite(montant) || montant <= 0) {
    return res.status(400).json({ message: 'Plafond invalide (montant positif requis)' });
  }
  const [budget, cree] = await Budget.findOrCreate({
    where: { client: req.user._id, categorie },
    defaults: { plafond: montant },
  });
  if (!cree) await budget.update({ plafond: montant });
  res.status(cree ? 201 : 200).json({ message: `Enveloppe « ${categorie} » fixée à ${montant.toFixed(2)} $ par mois.` });
});

/* Supprimer une enveloppe */
router.delete('/:categorie', auditLog('budget.suppression'), async (req, res) => {
  const nb = await Budget.destroy({ where: { client: req.user._id, categorie: req.params.categorie } });
  if (!nb) return res.status(404).json({ message: 'Enveloppe introuvable' });
  res.json({ message: 'Enveloppe supprimée' });
});

/* Rapport mensuel : ?mois=YYYY-MM (défaut : mois courant) + comparaison au mois précédent */
router.get('/rapport', async (req, res) => {
  const [annee, mois] = /^\d{4}-\d{2}$/.test(req.query.mois || '')
    ? req.query.mois.split('-').map(Number)
    : [new Date().getFullYear(), new Date().getMonth() + 1];
  const reference = new Date(annee, mois - 1, 1);
  const { debut, fin } = bornesDuMois(reference);
  const precedent = bornesDuMois(new Date(annee, mois - 2, 1));

  const [totaux, totauxPrecedents, budgets] = await Promise.all([
    totauxParCategorie(req.user._id, debut, fin),
    totauxParCategorie(req.user._id, precedent.debut, precedent.fin),
    Budget.findAll({ where: { client: req.user._id } }),
  ]);

  const lignes = Object.entries(totaux).map(([categorie, t]) => {
    const plafond = budgets.find((b) => b.categorie === categorie)?.plafond ?? null;
    const avant = totauxPrecedents[categorie]?.depenses || 0;
    return {
      categorie,
      depenses: t.depenses,
      revenus: t.revenus,
      nbOperations: t.nb,
      plafond,
      depassement: plafond !== null && t.depenses > plafond,
      variationDepenses: avant > 0 ? Math.round(((t.depenses - avant) / avant) * 100) : null, // % vs mois précédent
    };
  }).sort((a, b) => b.depenses - a.depenses);

  res.json({
    mois: `${annee}-${String(mois).padStart(2, '0')}`,
    totalDepenses: lignes.reduce((s, l) => s + l.depenses, 0),
    totalRevenus: lignes.reduce((s, l) => s + l.revenus, 0),
    lignes,
  });
});

module.exports = router;
