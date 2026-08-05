const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { sequelize, User, Otp, Compte, RevokedToken, Notification } = require('../models');
const { envoyerOtp, smtpConfigure } = require('../utils/mailer');
const { protect } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { ouvrirComptesInitiaux } = require('../utils/comptes');
const schemaInscription = require('../schemas/inscription-bancaire.json');

// Compile la validation JSON Schema une seule fois au démarrage
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validerInscription = ajv.compile(schemaInscription);

const MAX_ECHECS = 5;
const VERROU_MINUTES = 15;

// Anti force-brute : 10 requêtes / 15 min sur les routes sensibles
const limiteurAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Trop de tentatives, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

const signerTemp = (id) =>
  jwt.sign({ id, etape: 'otp' }, process.env.JWT_SECRET, { expiresIn: process.env.TEMP_TOKEN_EXPIRES || '5m' });
// E1 — jti unique pour pouvoir révoquer ce token via la blacklist à la déconnexion
const signerComplet = (id, role) =>
  jwt.sign(
    { id, role, etape: 'complet', jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '30m' }
  );

const publicUser = (u) => ({
  id: u._id, nom: u.nom, prenom: u.prenom, email: u.email, role: u.role, dateCreation: u.dateCreation,
  doitChangerMotDePasse: Boolean(u.doitChangerMotDePasse), // force le changement du mdp temporaire
});

/** Le code OTP ne peut être exposé (réponse HTTP) qu'en dehors de la production.
 *  En prod, même DEMO_OTP=true ou SMTP absent ne doivent jamais le divulguer. */
const otpDemoActif = () =>
  process.env.NODE_ENV !== 'production' &&
  (process.env.DEMO_OTP === 'true' || !smtpConfigure());

/* US-01 — Créer mon profil (inscription) */
router.post('/register', limiteurAuth, auditLog('inscription.simple'), async (req, res, next) => {
  try {
    const { nom, prenom, email, motDePasse } = req.body;
    if (!nom || !email || !motDePasse) {
      return res.status(400).json({ message: 'Nom, email et mot de passe requis' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Email invalide' });
    }
    // Politique de mot de passe (niveau bancaire) : 8+ caractères, majuscule, minuscule, chiffre
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(motDePasse)) {
      return res.status(400).json({
        message: 'Mot de passe : 8 caractères minimum avec majuscule, minuscule et chiffre',
      });
    }
    if (await User.findOne({ where: { email } })) {
      return res.status(409).json({ message: 'Un compte existe déjà avec cet email' });
    }
    // Atomique : User + comptes initiaux (chèque 500 $ + épargne 0 $) naissent ensemble
    const user = await sequelize.transaction(async (t) => {
      const nouveau = await User.create({
        nom, prenom, email: email.toLowerCase(),
        motDePasseHache: await User.hacher(motDePasse),
      }, { transaction: t });
      await ouvrirComptesInitiaux(nouveau._id, { transaction: t });
      return nouveau;
    });
    res.status(201).json({ message: 'Profil créé. Vous pouvez vous connecter.', user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

/* US-25 — Inscription bancaire complète (wizard 6 étapes).
   Validation stricte via JSON Schema (ajv). Le compte est créé en statut
   'en_verification' et attend l'approbation d'un admin avant d'être 'actif'.
   Le numéro de dossier (DOS-AAAA-NNNNNN) est généré côté serveur. */
router.post('/register-complet', limiteurAuth, auditLog('inscription.complete'), async (req, res, next) => {
  try {
    if (!validerInscription(req.body)) {
      // Format ajv → message lisible : on cite les 3 premières erreurs
      const erreurs = validerInscription.errors.slice(0, 3).map((e) => {
        const champ = e.instancePath.replace(/^\//, '').replace(/\//g, '.') || (e.params && e.params.missingProperty) || '?';
        return `${champ} ${e.message}`;
      });
      return res.status(400).json({ message: 'Données invalides', erreurs });
    }

    const { coordonnees, informationsPersonnelles } = req.body;
    const email = coordonnees.email.toLowerCase();
    if (await User.findOne({ where: { email } })) {
      return res.status(409).json({ message: 'Un compte existe déjà avec cet email' });
    }

    // Vérification d'âge (18 ans minimum)
    const ageMs = Date.now() - new Date(informationsPersonnelles.dateNaissance).getTime();
    const annees = ageMs / (365.25 * 24 * 3600 * 1000);
    if (annees < 18) return res.status(400).json({ message: 'Vous devez être majeur (18 ans minimum)' });

    // Génération du numéro de dossier DOS-AAAA-NNNNNN
    const annee = new Date().getFullYear();
    const sequence = String(Date.now()).slice(-6); // approximatif mais unique
    const numeroDossier = `DOS-${annee}-${sequence}`;

    const { user } = await sequelize.transaction(async (t) => {
      const user = await User.create({
        nom: informationsPersonnelles.nom,
        prenom: informationsPersonnelles.prenom,
        email,
        motDePasseHache: await User.hacher(coordonnees.motDePasse),
        statutDossier: 'en_verification',
        numeroDossier,
        // On stocke le payload complet (sans le mot de passe) pour audit/relecture admin
        donneesInscription: { ...req.body, coordonnees: { ...coordonnees, motDePasse: undefined } },
      }, { transaction: t });
      // Pas de Compte créé avant validation admin — c'est l'admin qui activera
      return { user };
    });

    res.status(201).json({
      message: 'Dossier reçu, vérification sous 24 h ouvrées',
      numeroDossier: user.numeroDossier,
    });
  } catch (e) {
    next(e);
  }
});

/* US-23 — Étape 1 : email + mot de passe → envoi du code OTP.
   Audité (succès ET échecs) : indispensable pour la traçabilité type judiciaire. */
router.post('/login', limiteurAuth, auditLog('auth.login'), async (req, res, next) => {
  try {
    const { email, motDePasse } = req.body;
    const user = await User.scope('avecMdp').findOne({ where: { email: (email || '').toLowerCase() } });
    // Réponse identique que l'email existe ou non (anti-énumération)
    if (!user) return res.status(401).json({ message: 'Identifiants incorrects' });
    req.auditUserId = user._id; // l'audit connaît l'utilisateur même sans req.user

    if (user.estVerrouille()) {
      const minutes = Math.ceil((new Date(user.verrouJusqua) - Date.now()) / 60000);
      return res.status(423).json({ message: `Compte verrouillé. Réessayez dans ${minutes} min.` });
    }
    // US-25 : un dossier non actif (en cours de vérification ou rejeté) ne peut pas se connecter
    if (user.statutDossier === 'en_verification') {
      return res.status(403).json({ message: 'Votre dossier est en cours de vérification. Vous serez notifié sous 24 h ouvrées.' });
    }
    if (user.statutDossier === 'rejete') {
      return res.status(403).json({ message: 'Votre dossier a été rejeté. Contactez notre service client.' });
    }
    if (!(await user.comparerMotDePasse(motDePasse || ''))) {
      user.echecsConnexion += 1;
      const verrouille = user.echecsConnexion >= MAX_ECHECS;
      if (verrouille) {
        user.verrouJusqua = new Date(Date.now() + VERROU_MINUTES * 60000);
        user.echecsConnexion = 0;
        // Alerte immédiate aux administrateurs : ils peuvent délivrer un
        // mot de passe temporaire à 6 chiffres via la réinitialisation (US-22).
        const admins = await User.findAll({ where: { role: 'admin' } });
        await Promise.all(admins.map((a) => Notification.envoyer(
          a._id,
          `Alerte sécurité (verrouillage) : le compte ${user.email} est verrouillé après ${MAX_ECHECS} mots de passe erronés. ` +
          'Si le client a oublié son mot de passe, réinitialisez son profil pour lui remettre un code temporaire à 6 chiffres.'
        )));
      }
      await user.save();
      return res.status(401).json({
        message: verrouille
          ? `Compte verrouillé après ${MAX_ECHECS} tentatives. Mot de passe oublié ? Contactez votre banque : un administrateur vous remettra un code temporaire.`
          : 'Identifiants incorrects',
      });
    }
    user.echecsConnexion = 0;
    user.verrouJusqua = null;
    await user.save();

    // Génération + envoi du code OTP à 6 chiffres
    const code = await Otp.creerPour(user._id);
    const envoi = await envoyerOtp(user.email, code);

    res.json({
      message: envoi.envoye
        ? 'Code envoyé par email'
        : 'Mode démo : code affiché dans la console serveur',
      tempToken: signerTemp(user._id),
      ...(otpDemoActif() ? { codeDemo: code } : {}), // jamais exposé en production
    });
  } catch (e) {
    next(e);
  }
});

/* US-23 — Étape 2 : vérification du code OTP → JWT complet */
router.post('/verify-otp', limiteurAuth, auditLog('auth.verify_otp'), async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !/^\d{6}$/.test(code || '')) {
      return res.status(400).json({ message: 'Code à 6 chiffres requis' });
    }
    let payload;
    try {
      payload = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Session expirée, reconnectez-vous' });
    }
    if (payload.etape !== 'otp') return res.status(401).json({ message: 'Jeton invalide' });
    req.auditUserId = payload.id;

    const otp = await Otp.findOne({ where: { user: payload.id } });
    if (!otp || new Date(otp.expireA) < new Date()) {
      return res.status(410).json({ message: 'Code expiré, demandez-en un nouveau' });
    }
    if (otp.tentatives >= 3) {
      await otp.destroy();
      return res.status(429).json({ message: 'Trop de tentatives. Reconnectez-vous.' });
    }
    if (!(await otp.verifier(code))) {
      otp.tentatives += 1;
      await otp.save();
      return res.status(401).json({ message: `Code incorrect (${3 - otp.tentatives} essai(s) restant(s))` });
    }
    await otp.destroy(); // usage unique

    const user = await User.findByPk(payload.id);
    if (!user) return res.status(401).json({ message: 'Utilisateur introuvable' });
    res.json({ message: 'Connexion réussie', token: signerComplet(user._id, user.role), user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

/* Renvoyer un nouveau code OTP */
router.post('/resend-otp', limiteurAuth, auditLog('auth.resend_otp'), async (req, res, next) => {
  try {
    const { tempToken } = req.body;
    let payload;
    try {
      payload = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Session expirée, reconnectez-vous' });
    }
    // Seul un jeton temporaire (étape OTP) peut demander un renvoi de code
    if (payload.etape !== 'otp') return res.status(401).json({ message: 'Jeton invalide' });
    req.auditUserId = payload.id;
    const user = await User.findByPk(payload.id);
    if (!user) return res.status(401).json({ message: 'Utilisateur introuvable' });
    const code = await Otp.creerPour(user._id);
    await envoyerOtp(user.email, code);
    res.json({ message: 'Nouveau code envoyé', ...(otpDemoActif() ? { codeDemo: code } : {}) });
  } catch (e) {
    next(e);
  }
});

/* US-03 — Consulter mes informations personnelles */
router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));

/* Changement de mot de passe — lève l'obligation posée par un code temporaire admin.
   Audité : action sensible au même titre que la connexion. */
router.post('/changer-mot-de-passe', protect, auditLog('auth.changement_mdp'), async (req, res, next) => {
  try {
    const { ancienMotDePasse, nouveauMotDePasse } = req.body;
    const user = await User.scope('avecMdp').findByPk(req.user._id);
    if (!(await user.comparerMotDePasse(ancienMotDePasse || ''))) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(nouveauMotDePasse || '')) {
      return res.status(400).json({ message: 'Nouveau mot de passe trop faible : 8 caractères minimum avec majuscule, minuscule et chiffre' });
    }
    await user.update({
      motDePasseHache: await User.hacher(nouveauMotDePasse),
      doitChangerMotDePasse: false,
    });
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (e) {
    next(e);
  }
});

/* E1 — Déconnexion : révoque le JWT courant (blacklist jusqu'à son expiration) */
router.post('/logout', protect, auditLog('logout'), async (req, res, next) => {
  try {
    const { jti, exp } = req.tokenPayload || {};
    if (jti && exp) {
      await RevokedToken.create({
        jti,
        userId: req.user._id,
        expireA: new Date(exp * 1000),
      });
    }
    res.json({ message: 'Déconnexion effectuée' });
  } catch (e) {
    next(e);
  }
});

/* US-01 — Modifier mon profil */
router.put('/me', protect, auditLog('profil.modification'), async (req, res, next) => {
  try {
    const { nom, prenom } = req.body;
    if (nom) req.user.nom = String(nom).slice(0, 100);
    if (prenom !== undefined) req.user.prenom = prenom === null ? null : String(prenom).slice(0, 100);
    await req.user.save();
    res.json({ message: 'Profil mis à jour', user: publicUser(req.user) });
  } catch (e) {
    next(e);
  }
});

/* E7 — RGPD article 20 (portabilité) : exporter toutes mes données en JSON */
router.get('/me/export-donnees', protect, auditLog('rgpd.export'), async (req, res, next) => {
  try {
    const {
      Compte, Transaction, Beneficiaire, Fournisseur, ObjectifEpargne,
      Notification, DemandePret, AuditLog,
    } = require('../models');
    const userId = req.user._id;

    const [comptes, transactions, beneficiaires, fournisseurs, objectifs, notifications, demandes, audits] = await Promise.all([
      Compte.findAll({ where: { proprietaire: userId } }),
      Transaction.findAll({ where: { client: userId } }),
      Beneficiaire.findAll({ where: { client: userId } }),
      Fournisseur.findAll({ where: { client: userId } }),
      ObjectifEpargne.findAll({ where: { client: userId } }),
      Notification.findAll({ where: { client: userId } }),
      DemandePret.findAll({ where: { client: userId } }),
      AuditLog.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 500 }),
    ]);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mes-donnees-${userId}.json"`);
    res.json({
      profil: publicUser(req.user),
      comptes, transactions, beneficiaires, fournisseurs,
      objectifs, notifications, demandesPret: demandes, journalAcces: audits,
      exporteLe: new Date().toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

/* E7 — RGPD article 17 (droit à l'oubli) : suppression + anonymisation des transactions
   Les transactions ne sont pas supprimées (obligation comptable bancaire de conservation)
   mais leur lien au client est cassé (client = null) pour anonymisation. */
router.delete('/me', protect, auditLog('rgpd.suppression'), async (req, res, next) => {
  try {
    const {
      Compte, Transaction, Beneficiaire, Fournisseur, ObjectifEpargne,
      Notification, DemandePret,
    } = require('../models');
    const userId = req.user._id;

    await sequelize.transaction(async (t) => {
      // Anonymisation des transactions (conservation légale)
      await Transaction.update({ client: null }, { where: { client: userId }, transaction: t });
      // Suppression des données personnelles liées
      await Beneficiaire.destroy({ where: { client: userId }, transaction: t });
      await Fournisseur.destroy({ where: { client: userId }, transaction: t });
      await ObjectifEpargne.destroy({ where: { client: userId }, transaction: t });
      await Notification.destroy({ where: { client: userId }, transaction: t });
      await DemandePret.destroy({ where: { client: userId }, transaction: t });
      await Compte.destroy({ where: { proprietaire: userId }, transaction: t });
      await User.destroy({ where: { _id: userId }, transaction: t });
    });

    res.json({ message: 'Compte supprimé. Vos transactions sont anonymisées (obligation comptable).' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
