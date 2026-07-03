/**
 * Routes PayPal (sandbox) — ADDITIF, ne modifie aucune route existante.
 * Usages : 'depot' (alimenter un compte) ou 'produit' (souscrire un produit
 * financier → crédité sur le compte investissement, créé au besoin).
 * Le montant est TOUJOURS validé côté serveur ; la capture est idempotente.
 */
const router = require('express').Router();
const { sequelize, Compte, Transaction, ProduitFinancier, Notification } = require('../models');
const PaiementPaypal = require('../models/PaiementPaypal');
const { protect } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { paypalConfigure, creerCommande, capturerCommande } = require('../utils/paypal');

const DEVISE = () => process.env.PAYPAL_CURRENCY || 'CAD';
const MONTANT_MAX = 10000;

/* Config publique (le Client ID PayPal est public par conception) */
router.get('/config', (req, res) => {
  if (!paypalConfigure()) return res.status(503).json({ message: 'PayPal non configuré' });
  res.json({ clientId: process.env.PAYPAL_CLIENT_ID, devise: DEVISE(), mode: 'sandbox' });
});

router.use(protect);

/* Étape 1 — Créer la commande PayPal (montant validé serveur) */
router.post('/orders', auditLog('paypal.creation'), async (req, res) => {
  try {
    if (!paypalConfigure()) return res.status(503).json({ message: 'PayPal non configuré' });
    const { usage, compteId, produitId, montant } = req.body;
    const m = Math.round(Number(montant) * 100) / 100;
    if (!m || m <= 0 || m > MONTANT_MAX) {
      return res.status(400).json({ message: `Montant invalide (entre 0,01 $ et ${MONTANT_MAX} $)` });
    }
    if (!['depot', 'produit'].includes(usage)) {
      return res.status(400).json({ message: "Usage invalide ('depot' ou 'produit')" });
    }

    let description;
    let compte = null;
    let produit = null;
    if (usage === 'depot') {
      compte = await Compte.findOne({
        where: { _id: compteId || '', proprietaire: req.user._id, kind: 'Compte' },
      });
      if (!compte) return res.status(404).json({ message: 'Compte introuvable' });
      description = `Dépôt PayPal sur ${compte.type} ****${compte.numero.slice(-4)}`;
    } else {
      produit = await ProduitFinancier.findByPk(produitId || '');
      if (!produit) return res.status(404).json({ message: 'Produit introuvable' });
      description = `Souscription ${produit.nom} (${produit.type}) via PayPal`;
    }

    const paiement = await PaiementPaypal.create({
      client: req.user._id, usage,
      compte: compte ? compte._id : null,
      produit: produit ? produit._id : null,
      montant: m, devise: DEVISE(), description,
    });
    const commande = await creerCommande(m, DEVISE(), description, paiement._id);
    paiement.orderId = commande.id;
    await paiement.save();
    res.status(201).json({ orderId: commande.id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* Étape 2 — Capturer après approbation de l'acheteur (idempotent) */
router.post('/orders/:orderId/capture', auditLog('paypal.capture'), async (req, res) => {
  try {
    const paiement = await PaiementPaypal.findOne({
      where: { orderId: req.params.orderId, client: req.user._id },
    });
    if (!paiement) return res.status(404).json({ message: 'Paiement introuvable' });
    if (paiement.statut === 'capturee') {
      return res.json({ message: 'Paiement déjà confirmé', paiement });
    }

    const resultat = await capturerCommande(paiement.orderId);
    if (resultat.status !== 'COMPLETED') {
      paiement.statut = 'echouee';
      await paiement.save();
      return res.status(400).json({ message: `Paiement non complété (statut PayPal : ${resultat.status || 'inconnu'})` });
    }
    const captureId = resultat.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

    const { compte, tx } = await sequelize.transaction(async (t) => {
      let compte;
      if (paiement.usage === 'depot') {
        compte = await Compte.findOne({
          where: { _id: paiement.compte, proprietaire: req.user._id },
          lock: t.LOCK.UPDATE, transaction: t,
        });
        if (!compte) throw new Error('Compte introuvable');
      } else {
        compte = await Compte.findOne({
          where: { proprietaire: req.user._id, type: 'investissement', kind: 'Compte' },
          lock: t.LOCK.UPDATE, transaction: t,
        });
        if (!compte) {
          compte = await Compte.create({
            proprietaire: req.user._id, numero: Compte.genererNumero(),
            type: 'investissement', solde: 0,
          }, { transaction: t });
        }
      }
      compte.crediter(paiement.montant);
      await compte.save({ transaction: t });

      const tx = await Transaction.create({
        compte: compte._id, client: req.user._id, type: 'depot',
        montant: paiement.montant, sens: 'credit', description: paiement.description,
      }, { transaction: t });

      paiement.statut = 'capturee';
      paiement.captureId = captureId;
      paiement.transactionBancaire = tx._id;
      paiement.capturedAt = new Date();
      await paiement.save({ transaction: t });
      return { compte, tx };
    });

    await Notification.envoyer(
      req.user._id,
      `✅ Paiement PayPal de ${paiement.montant.toFixed(2)} $ confirmé — ${paiement.description}`
    );
    res.status(201).json({ message: 'Paiement PayPal confirmé', paiement, transaction: tx, compte });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* Historique de mes paiements PayPal */
router.get('/historique', async (req, res) => {
  const paiements = await PaiementPaypal.findAll({
    where: { client: req.user._id },
    order: [['createdAt', 'DESC']],
    limit: 50,
  });
  res.json({ paiements });
});

module.exports = router;
