const router = require('express').Router();
const { Op, fn, col, literal } = require('sequelize');
const { sequelize, Compte, Transaction, Beneficiaire, Fournisseur, ParametresGlobaux } = require('../models');
const { protect } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { verifierSoldeFaible } = require('../utils/notif');

router.use(protect);

/** Récupère un compte appartenant bien au client connecté (contrôle d'accès).
 *  Accepte des options Sequelize (notamment { lock, transaction }) pour usage atomique. */
async function monCompte(req, compteId, options = {}) {
  const compte = await Compte.findOne({
    where: { _id: compteId, proprietaire: req.user._id },
    ...options,
  });
  if (!compte) throw new Error('Compte introuvable');
  return compte;
}

/* US-13 / US-14 — Historique avec recherche et filtres */
router.get('/', async (req, res) => {
  const { type, compteId, dateDebut, dateFin, recherche, montantMin, montantMax } = req.query;
  const where = { client: req.user._id, statut: { [Op.in]: ['executee', 'en_attente'] } };
  if (type) where.type = type;
  if (compteId) where.compte = compteId;
  if (dateDebut || dateFin) {
    where.date = {};
    if (dateDebut) where.date[Op.gte] = new Date(dateDebut);
    if (dateFin) where.date[Op.lte] = new Date(`${dateFin}T23:59:59`);
  }
  if (montantMin || montantMax) {
    where.montant = {};
    if (montantMin) where.montant[Op.gte] = Number(montantMin);
    if (montantMax) where.montant[Op.lte] = Number(montantMax);
  }
  if (recherche) where.description = { [Op.like]: `%${recherche}%` };

  const transactions = await Transaction.findAll({
    where, order: [['date', 'DESC']], limit: 200,
  });
  res.json({ transactions });
});

/* US-11 — Dépôt ou retrait simulé (atomique, LOCK.UPDATE) */
router.post('/depot-retrait', async (req, res) => {
  try {
    const { compteId, type, montant, description } = req.body;
    const m = Number(montant);
    if (!['depot', 'retrait'].includes(type)) return res.status(400).json({ message: 'Type invalide' });
    if (!m || m <= 0) return res.status(400).json({ message: 'Montant invalide' });

    const { compte, tx } = await sequelize.transaction(async (t) => {
      const compte = await monCompte(req, compteId, { lock: t.LOCK.UPDATE, transaction: t });
      if (type === 'depot') compte.crediter(m);
      else compte.debiter(m);
      await compte.save({ transaction: t });

      const tx = await Transaction.create({
        compte: compte._id, client: req.user._id, type, montant: m,
        sens: type === 'depot' ? 'credit' : 'debit',
        description: description || (type === 'depot' ? 'Dépôt' : 'Retrait'),
      }, { transaction: t });
      return { compte, tx };
    });

    if (type === 'retrait') await verifierSoldeFaible(compte);
    res.status(201).json({ message: 'Opération effectuée', transaction: tx, compte });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

/* US-12 — Dépôt de chèque par photo (simulé : statut en attente de validation) */
router.post('/depot-cheque', async (req, res) => {
  try {
    const { compteId, montant, imageCheque, description } = req.body;
    const m = Number(montant);
    if (!m || m <= 0) return res.status(400).json({ message: 'Montant invalide' });
    if (!imageCheque) return res.status(400).json({ message: 'Photo du chèque requise' });

    const compte = await monCompte(req, compteId);
    const tx = await Transaction.create({
      compte: compte._id, client: req.user._id, type: 'depot', montant: m, sens: 'credit',
      statut: 'en_attente', imageCheque,
      description: description || 'Dépôt de chèque par photo (en vérification)',
    });
    res.status(201).json({ message: 'Chèque reçu — crédité après vérification (simulation)', transaction: tx });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

/* US-06 — Virement interne entre mes comptes (atomique, LOCK.UPDATE, anti-deadlock) */
router.post('/virement-interne', auditLog('virement.interne'), async (req, res) => {
  try {
    const { compteSourceId, compteDestId, montant, description } = req.body;
    const m = Number(montant);
    if (!m || m <= 0) return res.status(400).json({ message: 'Montant invalide' });
    if (compteSourceId === compteDestId) return res.status(400).json({ message: 'Comptes identiques' });

    const { source, dest } = await sequelize.transaction(async (t) => {
      // Verrou dans l'ordre lexicographique des IDs pour éviter les deadlocks
      const [firstId, secondId] = [compteSourceId, compteDestId].sort();
      const first = await monCompte(req, firstId, { lock: t.LOCK.UPDATE, transaction: t });
      const second = await monCompte(req, secondId, { lock: t.LOCK.UPDATE, transaction: t });
      const source = first._id === compteSourceId ? first : second;
      const dest = first._id === compteDestId ? first : second;

      source.debiter(m);
      dest.crediter(m);
      await source.save({ transaction: t });
      await dest.save({ transaction: t });

      await Transaction.create({
        compte: source._id, client: req.user._id, type: 'virement', montant: m, sens: 'debit',
        description: description || `Virement vers ${dest.type} ****${dest.numero.slice(-4)}`,
        compteDestination: dest._id,
      }, { transaction: t });
      await Transaction.create({
        compte: dest._id, client: req.user._id, type: 'virement', montant: m, sens: 'credit',
        description: description || `Virement reçu de ${source.type} ****${source.numero.slice(-4)}`,
      }, { transaction: t });

      return { source, dest };
    });

    await verifierSoldeFaible(source);
    res.status(201).json({ message: 'Virement effectué', source, dest });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

/* US-07 — Virement Interac vers un bénéficiaire (atomique, LOCK.UPDATE) */
router.post('/interac', auditLog('virement.interac'), async (req, res) => {
  try {
    const { compteSourceId, beneficiaireId, montant, description } = req.body;
    const m = Number(montant);
    if (!m || m <= 0) return res.status(400).json({ message: 'Montant invalide' });
    const params = await ParametresGlobaux.obtenir();
    if (m > params.limiteInterac) {
      return res.status(400).json({ message: `Limite Interac : ${params.limiteInterac} $ par envoi` });
    }

    const beneficiaire = await Beneficiaire.findOne({ where: { _id: beneficiaireId, client: req.user._id } });
    if (!beneficiaire) return res.status(404).json({ message: 'Bénéficiaire introuvable' });

    const { source, tx } = await sequelize.transaction(async (t) => {
      const source = await monCompte(req, compteSourceId, { lock: t.LOCK.UPDATE, transaction: t });
      source.debiter(m);
      await source.save({ transaction: t });

      const tx = await Transaction.create({
        compte: source._id, client: req.user._id, type: 'interac', montant: m, sens: 'debit',
        description: description || `Interac à ${beneficiaire.nom}`,
        beneficiaire: beneficiaire._id,
      }, { transaction: t });
      return { source, tx };
    });

    await verifierSoldeFaible(source);
    res.status(201).json({ message: `Virement Interac envoyé à ${beneficiaire.nom}`, transaction: tx });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

/* US-09 — Payer une facture (atomique, LOCK.UPDATE) */
router.post('/paiement-facture', auditLog('paiement.facture'), async (req, res) => {
  try {
    const { compteSourceId, fournisseurId, montant, description } = req.body;
    const m = Number(montant);
    if (!m || m <= 0) return res.status(400).json({ message: 'Montant invalide' });

    const fournisseur = await Fournisseur.findOne({ where: { _id: fournisseurId, client: req.user._id } });
    if (!fournisseur) return res.status(404).json({ message: 'Fournisseur introuvable' });

    const { source, tx } = await sequelize.transaction(async (t) => {
      const source = await monCompte(req, compteSourceId, { lock: t.LOCK.UPDATE, transaction: t });
      source.debiter(m);
      await source.save({ transaction: t });

      const tx = await Transaction.create({
        compte: source._id, client: req.user._id, type: 'paiement', montant: m, sens: 'debit',
        description: description || `Facture ${fournisseur.nom}`,
        fournisseur: fournisseur._id,
      }, { transaction: t });
      return { source, tx };
    });

    await verifierSoldeFaible(source);
    res.status(201).json({ message: 'Facture payée', transaction: tx });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

/* US-17 — Planifier une transaction récurrente */
router.post('/recurrente', async (req, res) => {
  try {
    const { compteSourceId, type, montant, description, recurrence, premiereDate, beneficiaireId, fournisseurId } = req.body;
    const m = Number(montant);
    if (!m || m <= 0) return res.status(400).json({ message: 'Montant invalide' });
    if (!['hebdomadaire', 'mensuelle'].includes(recurrence)) {
      return res.status(400).json({ message: 'Récurrence : hebdomadaire ou mensuelle' });
    }
    const compte = await monCompte(req, compteSourceId);
    const tx = await Transaction.create({
      compte: compte._id, client: req.user._id,
      type: type || 'paiement', montant: m, sens: 'debit',
      statut: 'planifiee', recurrence,
      prochaineDate: premiereDate ? new Date(premiereDate) : new Date(),
      description: description || 'Transaction récurrente',
      beneficiaire: beneficiaireId || null,
      fournisseur: fournisseurId || null,
    });
    res.status(201).json({ message: 'Transaction récurrente planifiée', transaction: tx });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

/* Lister / annuler mes transactions planifiées */
router.get('/planifiees', async (req, res) => {
  const transactions = await Transaction.findAll({
    where: { client: req.user._id, statut: 'planifiee' },
    order: [['prochaineDate', 'ASC']],
  });
  res.json({ transactions });
});

router.delete('/planifiees/:id', async (req, res) => {
  const tx = await Transaction.findOne({
    where: { _id: req.params.id, client: req.user._id, statut: 'planifiee' },
  });
  if (!tx) return res.status(404).json({ message: 'Transaction planifiée introuvable' });
  tx.annuler();
  await tx.save();
  res.json({ message: 'Transaction récurrente annulée' });
});

/* US-15 — Relevé mensuel */
router.get('/releve/:annee/:mois', async (req, res) => {
  const annee = Number(req.params.annee);
  const mois = Number(req.params.mois); // 1-12
  const debut = new Date(annee, mois - 1, 1);
  const fin = new Date(annee, mois, 0, 23, 59, 59);

  const transactions = await Transaction.findAll({
    where: { client: req.user._id, statut: 'executee', date: { [Op.between]: [debut, fin] } },
    order: [['date', 'ASC']],
  });

  const totalCredits = transactions.filter((t) => t.sens === 'credit').reduce((s, t) => s + t.montant, 0);
  const totalDebits = transactions.filter((t) => t.sens === 'debit').reduce((s, t) => s + t.montant, 0);
  res.json({ periode: { annee, mois }, totalCredits, totalDebits, nombre: transactions.length, transactions });
});

/* US-16 — Comparaison des dépenses mois par mois (6 derniers mois) — GROUP BY SQL */
router.get('/comparaison-depenses', async (req, res) => {
  const maintenant = new Date();
  const debut = new Date(maintenant.getFullYear(), maintenant.getMonth() - 5, 1);

  const lignes = await Transaction.findAll({
    attributes: [
      [fn('YEAR', col('date')), 'annee'],
      [fn('MONTH', col('date')), 'mois'],
      [fn('SUM', col('montant')), 'total'],
      [fn('COUNT', col('_id')), 'nombre'],
    ],
    where: {
      client: req.user._id, sens: 'debit', statut: 'executee',
      date: { [Op.gte]: debut },
    },
    group: [literal('YEAR(`date`)'), literal('MONTH(`date`)')],
    order: [literal('annee ASC'), literal('mois ASC')],
    raw: true,
  });

  // Même format JSON qu'avant la migration (le frontend reste inchangé)
  const depensesParMois = lignes.map((l) => ({
    _id: { annee: Number(l.annee), mois: Number(l.mois) },
    total: Number(l.total),
    nombre: Number(l.nombre),
  }));
  res.json({ depensesParMois });
});

module.exports = router;
