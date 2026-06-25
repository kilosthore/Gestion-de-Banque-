const router = require('express').Router();
const { DemandePret } = require('../models');
const { protect } = require('../middleware/auth');

router.use(protect);

/* US-24 — Le client soumet une demande de prêt */
router.post('/demandes', async (req, res) => {
  try {
    const { montant, duree, motif, revenuMensuel } = req.body;

    // Validation stricte des entrées
    const m = Number(montant);
    const d = Number(duree);
    const r = Number(revenuMensuel);
    if (!m || m <= 0) return res.status(400).json({ message: 'Montant invalide' });
    if (m > 1_000_000) return res.status(400).json({ message: 'Montant maximum : 1 000 000 $' });
    if (!Number.isInteger(d) || d < 1 || d > 360) {
      return res.status(400).json({ message: 'Durée invalide (1 à 360 mois)' });
    }
    if (!motif || motif.trim().length < 3 || motif.length > 500) {
      return res.status(400).json({ message: 'Motif requis (3 à 500 caractères)' });
    }
    if (Number.isNaN(r) || r < 0) {
      return res.status(400).json({ message: 'Revenu mensuel invalide' });
    }

    // Anti-spam : une seule demande en_attente par client à la fois
    const enAttente = await DemandePret.findOne({
      where: { client: req.user._id, statut: 'en_attente' },
    });
    if (enAttente) {
      return res.status(409).json({
        message: 'Vous avez déjà une demande en attente. Patientez sa décision.',
      });
    }

    const demande = await DemandePret.create({
      client: req.user._id,
      montant: m,
      duree: d,
      motif: motif.trim(),
      revenuMensuel: r,
    });
    res.status(201).json({ message: 'Demande de prêt envoyée', demande });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* US-24 — Le client consulte l'historique de ses demandes */
router.get('/demandes', async (req, res) => {
  const demandes = await DemandePret.findAll({
    where: { client: req.user._id },
    order: [['dateDemande', 'DESC']],
  });
  res.json({ demandes });
});

module.exports = router;
