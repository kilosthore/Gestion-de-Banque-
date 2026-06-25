const router = require('express').Router();
const {
  sequelize, Beneficiaire, Fournisseur, ObjectifEpargne, Notification,
  ProduitFinancier, Compte, Transaction,
} = require('../models');
const { protect } = require('../middleware/auth');

router.use(protect);

/* ─── US-08 — Bénéficiaires ─────────────────────────────── */
router.get('/beneficiaires', async (req, res) => {
  const beneficiaires = await Beneficiaire.findAll({
    where: { client: req.user._id }, order: [['nom', 'ASC']],
  });
  res.json({ beneficiaires });
});
router.post('/beneficiaires', async (req, res) => {
  const { nom, coordonnees } = req.body;
  if (!nom || !coordonnees) return res.status(400).json({ message: 'Nom et coordonnées requis' });
  const b = await Beneficiaire.create({ client: req.user._id, nom, coordonnees });
  res.status(201).json({ message: 'Bénéficiaire ajouté', beneficiaire: b });
});
router.put('/beneficiaires/:id', async (req, res) => {
  const b = await Beneficiaire.findOne({ where: { _id: req.params.id, client: req.user._id } });
  if (!b) return res.status(404).json({ message: 'Bénéficiaire introuvable' });
  await b.update({ nom: req.body.nom, coordonnees: req.body.coordonnees });
  res.json({ message: 'Bénéficiaire modifié', beneficiaire: b });
});
router.delete('/beneficiaires/:id', async (req, res) => {
  const n = await Beneficiaire.destroy({ where: { _id: req.params.id, client: req.user._id } });
  if (!n) return res.status(404).json({ message: 'Bénéficiaire introuvable' });
  res.json({ message: 'Bénéficiaire supprimé' });
});

/* ─── US-10 — Fournisseurs ──────────────────────────────── */
router.get('/fournisseurs', async (req, res) => {
  const fournisseurs = await Fournisseur.findAll({
    where: { client: req.user._id }, order: [['nom', 'ASC']],
  });
  res.json({ fournisseurs });
});
router.post('/fournisseurs', async (req, res) => {
  const { nom, categorie } = req.body;
  if (!nom) return res.status(400).json({ message: 'Nom requis' });
  const f = await Fournisseur.create({ client: req.user._id, nom, categorie });
  res.status(201).json({ message: 'Fournisseur ajouté', fournisseur: f });
});
router.delete('/fournisseurs/:id', async (req, res) => {
  const n = await Fournisseur.destroy({ where: { _id: req.params.id, client: req.user._id } });
  if (!n) return res.status(404).json({ message: 'Fournisseur introuvable' });
  res.json({ message: 'Fournisseur supprimé' });
});

/* ─── US-19 — Objectifs d'épargne ───────────────────────── */
router.get('/objectifs', async (req, res) => {
  const objectifs = await ObjectifEpargne.findAll({ where: { client: req.user._id } });
  res.json({
    objectifs: objectifs.map((o) => ({ ...o.toJSON(), progression: o.progression() })),
  });
});
router.post('/objectifs', async (req, res) => {
  const { nom, montantCible } = req.body;
  if (!nom || !Number(montantCible)) return res.status(400).json({ message: 'Nom et montant cible requis' });
  const o = await ObjectifEpargne.create({ client: req.user._id, nom, montantCible: Number(montantCible) });
  res.status(201).json({ message: 'Objectif créé', objectif: o });
});
/* Verser depuis un compte vers un objectif (atomique, LOCK.UPDATE sur le compte) */
router.post('/objectifs/:id/verser', async (req, res) => {
  try {
    const { montant, compteSourceId } = req.body;
    const m = Number(montant);
    if (!m || m <= 0) return res.status(400).json({ message: 'Montant invalide' });

    const objectif = await sequelize.transaction(async (t) => {
      const o = await ObjectifEpargne.findOne({
        where: { _id: req.params.id, client: req.user._id }, transaction: t,
      });
      if (!o) throw new Error('Objectif introuvable');

      const compte = await Compte.findOne({
        where: { _id: compteSourceId, proprietaire: req.user._id },
        lock: t.LOCK.UPDATE, transaction: t,
      });
      if (!compte) throw new Error('Compte introuvable');

      compte.debiter(m);
      o.montantEpargne += m;
      await compte.save({ transaction: t });
      await o.save({ transaction: t });

      await Transaction.create({
        compte: compte._id, client: req.user._id, type: 'virement', montant: m, sens: 'debit',
        description: `Épargne — objectif « ${o.nom} »`,
      }, { transaction: t });

      return o;
    });

    // Effet de bord post-commit : notification si objectif atteint
    if (objectif.progression() >= 100) {
      await Notification.envoyer(req.user._id, `🎉 Objectif « ${objectif.nom} » atteint ! (${objectif.montantCible} $)`);
    }
    res.json({ message: 'Versement effectué', objectif: { ...objectif.toJSON(), progression: objectif.progression() } });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});
router.delete('/objectifs/:id', async (req, res) => {
  const n = await ObjectifEpargne.destroy({ where: { _id: req.params.id, client: req.user._id } });
  if (!n) return res.status(404).json({ message: 'Objectif introuvable' });
  res.json({ message: 'Objectif supprimé' });
});

/* ─── US-20 — Notifications ─────────────────────────────── */
router.get('/notifications', async (req, res) => {
  const notifications = await Notification.findAll({
    where: { client: req.user._id }, order: [['date', 'DESC']], limit: 50,
  });
  res.json({ notifications });
});
router.put('/notifications/tout-lu', async (req, res) => {
  await Notification.update({ lue: true }, { where: { client: req.user._id, lue: false } });
  res.json({ message: 'Toutes les notifications sont lues' });
});
router.put('/notifications/:id/lue', async (req, res) => {
  const n = await Notification.findOne({ where: { _id: req.params.id, client: req.user._id } });
  if (!n) return res.status(404).json({ message: 'Notification introuvable' });
  await n.update({ lue: true });
  res.json({ notification: n });
});

/* ─── Produits financiers (consultation) ────────────────── */
router.get('/produits', async (req, res) => {
  res.json({ produits: await ProduitFinancier.findAll({ order: [['nom', 'ASC']] }) });
});

module.exports = router;
