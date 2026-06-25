const router = require('express').Router();
const { sequelize, Compte, Transaction } = require('../models');
const { protect } = require('../middleware/auth');

router.use(protect);

/* US-04 — Liste de mes comptes et soldes */
router.get('/', async (req, res) => {
  const comptes = await Compte.findAll({
    where: { proprietaire: req.user._id },
    order: [['dateOuverture', 'ASC']],
  });
  res.json({ comptes });
});

/* Ouvrir un nouveau compte (chèque, épargne, crédit, prêt, investissement) */
router.post('/', async (req, res) => {
  try {
    const { type, devise } = req.body;
    if (!['cheque', 'epargne', 'credit', 'pret', 'investissement'].includes(type)) {
      return res.status(400).json({ message: 'Type de compte invalide' });
    }
    const { ParametresGlobaux } = require('../models');
    const params = await ParametresGlobaux.obtenir();
    const compte = await Compte.create({
      proprietaire: req.user._id,
      numero: Compte.genererNumero(),
      type,
      devise: devise || params.devise || 'CAD',
      // Héritage UML : un compte de type crédit est une CarteCredit
      // M5 — limite configurable depuis ParametresGlobaux (au lieu de 1000 hardcodé)
      ...(type === 'credit' ? { kind: 'CarteCredit', limite: params.limiteCarteDefaut, soldeUtilise: 0 } : {}),
    });
    res.status(201).json({ message: 'Compte ouvert', compte });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* US-05 — Détail d'un compte + dernières transactions */
router.get('/:id', async (req, res) => {
  const compte = await Compte.findOne({ where: { _id: req.params.id, proprietaire: req.user._id } });
  if (!compte) return res.status(404).json({ message: 'Compte introuvable' });
  const transactions = await Transaction.findAll({
    where: { compte: compte._id, statut: 'executee' },
    order: [['date', 'DESC']],
    limit: 10,
  });
  res.json({ compte, transactions });
});

/* US-18bis — Simuler un achat par carte de crédit (atomique, LOCK.UPDATE, vérifie la limite) */
router.post('/:id/achat-carte', async (req, res) => {
  try {
    const { montant, marchand } = req.body;
    const m = Number(montant);
    if (!m || m <= 0) return res.status(400).json({ message: 'Montant invalide' });

    const { carte, tx } = await sequelize.transaction(async (t) => {
      const carte = await Compte.findOne({
        where: { _id: req.params.id, proprietaire: req.user._id, kind: 'CarteCredit' },
        lock: t.LOCK.UPDATE, transaction: t,
      });
      if (!carte) throw new Error('Carte de crédit introuvable');

      // debiter() est polymorphe : sur une CarteCredit il vérifie la limite
      // et incrémente soldeUtilise au lieu de toucher solde
      carte.debiter(m);
      await carte.save({ transaction: t });

      const tx = await Transaction.create({
        compte: carte._id, client: req.user._id, type: 'paiement', montant: m, sens: 'debit',
        description: marchand ? `Achat carte — ${marchand}` : 'Achat par carte de crédit',
      }, { transaction: t });
      return { carte, tx };
    });

    res.status(201).json({ message: 'Achat enregistré', carte, transaction: tx });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

/* US-18 — Payer ma carte de crédit depuis un compte chèque/épargne
   (atomique, LOCK.UPDATE sur source ET carte, anti-deadlock via tri lexicographique) */
router.post('/:id/payer-carte', async (req, res) => {
  try {
    const { montant, compteSourceId } = req.body;
    const m = Number(montant);
    if (!m || m <= 0) return res.status(400).json({ message: 'Montant invalide' });

    const carteId = req.params.id;

    const { source, carte } = await sequelize.transaction(async (t) => {
      // Verrou dans l'ordre lexicographique des IDs pour éviter les deadlocks
      const [firstId, secondId] = [compteSourceId, carteId].sort();
      const first = await Compte.findOne({
        where: { _id: firstId, proprietaire: req.user._id },
        lock: t.LOCK.UPDATE, transaction: t,
      });
      const second = await Compte.findOne({
        where: { _id: secondId, proprietaire: req.user._id },
        lock: t.LOCK.UPDATE, transaction: t,
      });
      if (!first || !second) throw new Error('Compte introuvable');

      const source = first._id === compteSourceId ? first : second;
      const carte = first._id === carteId ? first : second;
      if (carte.kind !== 'CarteCredit') throw new Error('Carte de crédit introuvable');

      source.debiter(m);
      carte.payer(m);
      await source.save({ transaction: t });
      await carte.save({ transaction: t });

      await Transaction.create({
        compte: source._id, client: req.user._id, type: 'paiement', montant: m, sens: 'debit',
        description: `Paiement carte de crédit ****${carte.numero.slice(-4)}`,
        compteDestination: carte._id,
      }, { transaction: t });

      return { source, carte };
    });

    const { verifierSoldeFaible } = require('../utils/notif');
    await verifierSoldeFaible(source);

    res.json({ message: 'Paiement effectué', carte, source });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

module.exports = router;
