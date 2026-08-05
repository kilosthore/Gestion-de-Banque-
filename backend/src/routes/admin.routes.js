const router = require('express').Router();
const crypto = require('crypto');
const {
  sequelize, User, Compte, Transaction, ParametresGlobaux, Notification, DemandePret,
} = require('../models');
const { protect, adminOnly } = require('../middleware/auth');
const { auditLog, verifierChaine } = require('../middleware/audit');
const { envoyerMdpTemporaire, smtpConfigure } = require('../utils/mailer');
const { ouvrirComptesInitiaux } = require('../utils/comptes');

router.use(protect, adminOnly);

/* Vue d'ensemble pour le tableau de bord admin */
router.get('/stats', async (req, res) => {
  const [clients, comptes, transactions] = await Promise.all([
    User.count({ where: { role: 'client' } }),
    Compte.count(),
    Transaction.count({ where: { statut: 'executee' } }),
  ]);
  res.json({ clients, comptes, transactions });
});

/* Liste des clients (consultation de données personnelles → auditée) */
router.get('/clients', auditLog('admin.consultation_clients'), async (req, res) => {
  const clients = await User.findAll({ where: { role: 'client' }, order: [['nom', 'ASC']] });
  res.json({ clients });
});

/* US-21 — Consulter / modifier les paramètres globaux */
router.get('/parametres', async (req, res) => {
  res.json({ parametres: await ParametresGlobaux.obtenir() });
});
router.put('/parametres', auditLog('admin.parametres_modification'), async (req, res) => {
  const params = await ParametresGlobaux.obtenir();
  const { seuilSoldeFaible, devise } = req.body;
  if (seuilSoldeFaible !== undefined) {
    const s = Number(seuilSoldeFaible);
    if (Number.isNaN(s) || s < 0) return res.status(400).json({ message: 'Seuil invalide' });
    params.seuilSoldeFaible = s;
  }
  if (devise) params.devise = devise;
  await params.save();
  res.json({ message: 'Paramètres mis à jour', parametres: params });
});

/* US-22 — Réinitialiser un profil client : code temporaire à 6 chiffres (façon NIP
   bancaire) + déverrouillage immédiat + changement de mot de passe OBLIGATOIRE
   à la prochaine connexion (le code temporaire ne peut pas devenir permanent).
   Sécurité C3 : en production le code n'est JAMAIS retourné dans la réponse HTTP —
   il part par email. Hors production, il est affiché à l'admin (mode démo). */
router.post('/clients/:id/reinitialiser', auditLog('admin.reinit_client'), async (req, res) => {
  const client = await User.findOne({ where: { _id: req.params.id, role: 'client' } });
  if (!client) return res.status(404).json({ message: 'Client introuvable' });

  // Code temporaire : 6 chiffres aléatoires cryptographiquement sûrs
  const codeTemporaire = String(crypto.randomInt(100000, 1000000));
  await client.update({
    motDePasseHache: await User.hacher(codeTemporaire),
    echecsConnexion: 0,
    verrouJusqua: null,
    doitChangerMotDePasse: true, // le client devra choisir un vrai mot de passe
  });

  // Envoi du code par canal sûr (email) — jamais dans la réponse HTTP en prod
  await envoyerMdpTemporaire(client.email, codeTemporaire);

  await Notification.envoyer(
    client._id,
    'Votre profil a été réinitialisé par un administrateur. Connectez-vous avec le code temporaire à 6 chiffres reçu, puis choisissez un nouveau mot de passe.'
  );

  // Même règle « mode démo » que l'OTP de connexion (auth.routes.js) : une seule
  // définition pour toute l'app, sinon un flux expose le secret et l'autre non
  // selon le .env du poste. La garde NODE_ENV reste la barrière dure — en prod,
  // ni DEMO_OTP=true ni l'absence de SMTP ne peuvent divulguer le code.
  const demo = process.env.NODE_ENV !== 'production' &&
    (process.env.DEMO_OTP === 'true' || !smtpConfigure());
  res.json({
    message: smtpConfigure()
      ? `Profil réinitialisé. Code temporaire à 6 chiffres envoyé à ${client.email}. Le client devra choisir un nouveau mot de passe à sa prochaine connexion.`
      : 'Profil réinitialisé. Code temporaire à 6 chiffres généré : le client devra choisir un nouveau mot de passe à sa prochaine connexion.',
    ...(demo ? { codeTemporaireDemo: codeTemporaire } : {}), // jamais exposé en production
  });
});

/* US-24 — L'admin liste toutes les demandes de prêt */
router.get('/prets/demandes', async (req, res) => {
  const demandes = await DemandePret.findAll({
    order: [['statut', 'ASC'], ['dateDemande', 'DESC']], // en_attente en premier
  });
  // Enrichissement avec l'email du client pour faciliter la lecture admin
  const clientIds = [...new Set(demandes.map((d) => d.client))];
  const clients = await User.findAll({ where: { _id: clientIds } });
  const parId = Object.fromEntries(clients.map((c) => [c._id, c]));
  const detaillees = demandes.map((d) => ({
    ...d.toJSON(),
    clientNom: parId[d.client] ? `${parId[d.client].prenom || ''} ${parId[d.client].nom}`.trim() : '?',
    clientEmail: parId[d.client]?.email || '?',
  }));
  res.json({ demandes: detaillees });
});

/* US-24 — L'admin approuve ou refuse une demande (atomique)
   Si approuvée : création d'un Compte type='pret' crédité du montant + notification client.
   Si refusée : statut + dateDecision + notification.
   Toute opération sous transaction : pas de demi-décision. */
router.put('/prets/demandes/:id', auditLog('admin.pret_decision'), async (req, res) => {
  try {
    const { statut, commentaireDecision } = req.body;
    if (!['approuvee', 'refusee'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide : approuvee ou refusee' });
    }

    const { demande, compte } = await sequelize.transaction(async (t) => {
      const demande = await DemandePret.findOne({
        where: { _id: req.params.id },
        lock: t.LOCK.UPDATE, transaction: t,
      });
      if (!demande) throw new Error('Demande introuvable');
      if (demande.statut !== 'en_attente') {
        throw new Error(`Demande déjà ${demande.statut} le ${new Date(demande.dateDecision).toLocaleDateString('fr-CA')}`);
      }

      let compte = null;
      if (statut === 'approuvee') {
        compte = await Compte.create({
          proprietaire: demande.client,
          numero: Compte.genererNumero(),
          type: 'pret',
          solde: demande.montant, // le prêt est crédité au compte du client
        }, { transaction: t });
      }

      await demande.update({
        statut,
        dateDecision: new Date(),
        decideur: req.user._id,
        comptePret: compte ? compte._id : null,
        commentaireDecision: commentaireDecision ? String(commentaireDecision).slice(0, 500) : null,
      }, { transaction: t });

      const message = statut === 'approuvee'
        ? `✅ Votre demande de prêt de ${demande.montant.toFixed(2)} $ a été approuvée. Les fonds sont disponibles sur votre nouveau compte prêt.`
        : `❌ Votre demande de prêt de ${demande.montant.toFixed(2)} $ a été refusée.${commentaireDecision ? ` Motif : ${commentaireDecision}` : ''}`;
      await Notification.envoyer(demande.client, message);

      return { demande, compte };
    });

    res.json({ message: `Demande ${statut === 'approuvee' ? 'approuvée' : 'refusée'}`, demande, compte });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

/* E8 — Journal d'audit : consultation (paginée) + vérification d'intégrité.
   La consultation du journal est elle-même auditée (qui a regardé quoi). */
router.get('/audit', auditLog('admin.consultation_audit'), async (req, res) => {
  const { AuditLog } = require('../models');
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = {};
  if (req.query.action) where.action = req.query.action;
  if (req.query.userId) where.userId = req.query.userId;
  const { rows, count } = await AuditLog.findAndCountAll({
    where, order: [['seq', 'DESC']], limit, offset,
  });
  res.json({ total: count, entrees: rows });
});

router.get('/audit/verification', auditLog('admin.verification_audit'), async (req, res) => {
  const rapport = await verifierChaine();
  res.json({
    message: rapport.valide
      ? `Chaîne intègre : ${rapport.verifiees} entrée(s) vérifiée(s)${rapport.anciennes ? `, ${rapport.anciennes} antérieure(s) au chaînage` : ''}`
      : `⚠️ ALTÉRATION DÉTECTÉE : ${rapport.anomalies.length} anomalie(s)`,
    ...rapport,
  });
});

/* US-25 — Lister les dossiers d'inscription en vérification */
router.get('/dossiers', auditLog('admin.consultation_dossiers'), async (req, res) => {
  const dossiers = await User.findAll({
    where: { statutDossier: ['en_verification', 'rejete'] },
    order: [['dateCreation', 'ASC']],
    attributes: { include: ['donneesInscription'] },
  });
  res.json({ dossiers });
});

/* US-25 — Valider ou rejeter un dossier d'inscription.
   Si validé : statut 'actif' + création compte chèque avec 500 $ de bienvenue (atomique). */
router.put('/dossiers/:id', auditLog('admin.dossier_decision'), async (req, res) => {
  try {
    const { statut, commentaire } = req.body;
    if (!['actif', 'rejete'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide : actif ou rejete' });
    }

    const { user, compte, compteEpargne } = await sequelize.transaction(async (t) => {
      const user = await User.findOne({
        where: { _id: req.params.id },
        lock: t.LOCK.UPDATE, transaction: t,
      });
      if (!user) throw new Error('Dossier introuvable');
      if (user.statutDossier === 'actif') {
        throw new Error('Dossier déjà actif');
      }

      let compte = null;
      let compteEpargne = null;
      if (statut === 'actif') {
        // Comptes initiaux du client : chèque (500 $ de bienvenue) + épargne (0 $)
        ({ cheque: compte, epargne: compteEpargne } = await ouvrirComptesInitiaux(
          user._id, { transaction: t },
        ));
      }

      await user.update({ statutDossier: statut }, { transaction: t });

      const message = statut === 'actif'
        ? `✅ Votre dossier ${user.numeroDossier} a été validé. Vous pouvez vous connecter.`
        : `❌ Votre dossier ${user.numeroDossier} a été rejeté.${commentaire ? ` Motif : ${commentaire}` : ''}`;
      await Notification.envoyer(user._id, message);

      return { user, compte, compteEpargne };
    });

    res.json({ message: `Dossier ${statut === 'actif' ? 'validé' : 'rejeté'}`, user, compte, compteEpargne });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

module.exports = router;
