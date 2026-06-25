const router = require('express').Router();
const crypto = require('crypto');
const {
  sequelize, User, Compte, Transaction, ParametresGlobaux, Notification, DemandePret,
} = require('../models');
const { protect, adminOnly } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { envoyerMdpTemporaire, smtpConfigure } = require('../utils/mailer');

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

/* Liste des clients */
router.get('/clients', async (req, res) => {
  const clients = await User.findAll({ where: { role: 'client' }, order: [['nom', 'ASC']] });
  res.json({ clients });
});

/* US-21 — Consulter / modifier les paramètres globaux */
router.get('/parametres', async (req, res) => {
  res.json({ parametres: await ParametresGlobaux.obtenir() });
});
router.put('/parametres', async (req, res) => {
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

/* US-22 — Réinitialiser un profil client (nouveau mot de passe temporaire + déverrouillage)
   Sécurité C3 : le mot de passe temporaire n'est JAMAIS retourné dans la réponse HTTP.
   Il est envoyé par email au client (mode prod) ou loggé en console serveur (mode démo). */
router.post('/clients/:id/reinitialiser', auditLog('admin.reinit_client'), async (req, res) => {
  const client = await User.findOne({ where: { _id: req.params.id, role: 'client' } });
  if (!client) return res.status(404).json({ message: 'Client introuvable' });

  // Mot de passe temporaire conforme à la politique (majuscule + minuscule + chiffre)
  const mdpTemporaire = `Temp${crypto.randomInt(100000, 1000000)}a`;
  await client.update({
    motDePasseHache: await User.hacher(mdpTemporaire),
    echecsConnexion: 0,
    verrouJusqua: null,
  });

  // Envoi du mot de passe par canal sûr (email) — jamais dans la réponse HTTP
  await envoyerMdpTemporaire(client.email, mdpTemporaire);

  await Notification.envoyer(
    client._id,
    '🔐 Votre profil a été réinitialisé par un administrateur. Consultez votre email pour le mot de passe temporaire.'
  );

  res.json({
    message: smtpConfigure()
      ? `Profil réinitialisé. Mot de passe temporaire envoyé à ${client.email}.`
      : 'Profil réinitialisé. Mot de passe temporaire affiché dans la console serveur (mode démo).',
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

/* US-25 — Lister les dossiers d'inscription en vérification */
router.get('/dossiers', async (req, res) => {
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

    const { user, compte } = await sequelize.transaction(async (t) => {
      const user = await User.findOne({
        where: { _id: req.params.id },
        lock: t.LOCK.UPDATE, transaction: t,
      });
      if (!user) throw new Error('Dossier introuvable');
      if (user.statutDossier === 'actif') {
        throw new Error('Dossier déjà actif');
      }

      let compte = null;
      if (statut === 'actif') {
        compte = await Compte.create({
          proprietaire: user._id,
          numero: Compte.genererNumero(),
          type: 'cheque',
          solde: 500, // bonus de bienvenue (cohérent avec /register simple)
        }, { transaction: t });
      }

      await user.update({ statutDossier: statut }, { transaction: t });

      const message = statut === 'actif'
        ? `✅ Votre dossier ${user.numeroDossier} a été validé. Vous pouvez vous connecter.`
        : `❌ Votre dossier ${user.numeroDossier} a été rejeté.${commentaire ? ` Motif : ${commentaire}` : ''}`;
      await Notification.envoyer(user._id, message);

      return { user, compte };
    });

    res.json({ message: `Dossier ${statut === 'actif' ? 'validé' : 'rejeté'}`, user, compte });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

module.exports = router;
