/**
 * Modèles Sequelize (MySQL) — les 11 classes du diagramme UML + Otp.
 * Note : la clé primaire s'appelle `_id` (UUID) pour conserver la même
 * API JSON qu'avant la migration (le frontend reste inchangé).
 * L'héritage UML CarteCredit → Compte est implémenté en table unique
 * (colonne `kind` = 'Compte' | 'CarteCredit').
 */
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sequelize } = require('../config/db');

const pk = { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true };

/* ─── Client / Administrateur (champ role) ──────────────── */
const User = sequelize.define('User', {
  _id: pk,
  nom: { type: DataTypes.STRING, allowNull: false },
  prenom: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  motDePasseHache: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('client', 'admin'), defaultValue: 'client' },
  dateCreation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  echecsConnexion: { type: DataTypes.INTEGER, defaultValue: 0 },
  verrouJusqua: { type: DataTypes.DATE, allowNull: true },
  // Workflow KYC (US-25) : inscription via /register-complet crée en 'en_verification'.
  // L'admin valide → 'actif'. L'inscription simple /register reste 'actif' direct (rétro-compat).
  statutDossier: {
    type: DataTypes.ENUM('en_verification', 'actif', 'rejete'),
    defaultValue: 'actif',
  },
  numeroDossier: { type: DataTypes.STRING, allowNull: true, unique: true },
  donneesInscription: { type: DataTypes.JSON, allowNull: true }, // payload complet du wizard pour audit
}, {
  tableName: 'users', timestamps: false,
  defaultScope: { attributes: { exclude: ['motDePasseHache'] } },
  scopes: { avecMdp: { attributes: { include: ['motDePasseHache'] } } },
});
User.hacher = (mdp) => bcrypt.hash(mdp, 12);
User.prototype.comparerMotDePasse = function (mdp) {
  return bcrypt.compare(mdp, this.motDePasseHache);
};
User.prototype.estVerrouille = function () {
  return this.verrouJusqua && new Date(this.verrouJusqua) > new Date();
};

/* ─── Compte (+ CarteCredit, héritage en table unique) ──── */
const Compte = sequelize.define('Compte', {
  _id: pk,
  proprietaire: { type: DataTypes.UUID, allowNull: false },
  numero: { type: DataTypes.STRING, allowNull: false, unique: true },
  type: { type: DataTypes.ENUM('cheque', 'epargne', 'credit', 'pret', 'investissement'), allowNull: false },
  solde: { type: DataTypes.DOUBLE, defaultValue: 0 },
  devise: { type: DataTypes.STRING, defaultValue: 'CAD' },
  dateOuverture: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  kind: { type: DataTypes.ENUM('Compte', 'CarteCredit'), defaultValue: 'Compte' },
  // Champs propres à CarteCredit
  limite: { type: DataTypes.DOUBLE, allowNull: true },
  soldeUtilise: { type: DataTypes.DOUBLE, allowNull: true },
}, { tableName: 'comptes', timestamps: false });

Compte.genererNumero = () => String(crypto.randomInt(1000000000, 10000000000));
Compte.prototype.crediter = function (montant) {
  if (montant <= 0) throw new Error('Montant invalide');
  this.solde += montant;
};
// Débit polymorphe : un Compte classique consomme son solde,
// une CarteCredit consomme sa marge de crédit (incrémente soldeUtilise).
Compte.prototype.debiter = function (montant) {
  if (montant <= 0) throw new Error('Montant invalide');
  if (this.kind === 'CarteCredit') {
    const utilise = this.soldeUtilise || 0;
    const limite = this.limite || 0;
    if (utilise + montant > limite) {
      throw new Error('Limite de carte de crédit dépassée');
    }
    this.soldeUtilise = utilise + montant;
  } else {
    if (this.solde < montant) throw new Error('Solde insuffisant');
    this.solde -= montant;
  }
};
Compte.prototype.verifierSolde = function () { return this.solde; };
Compte.prototype.payer = function (montant) {   // CarteCredit.payer()
  if (montant <= 0) throw new Error('Montant invalide');
  this.soldeUtilise = Math.max(0, (this.soldeUtilise || 0) - montant);
};

/* ─── Transaction ───────────────────────────────────────── */
const Transaction = sequelize.define('Transaction', {
  _id: pk,
  compte: { type: DataTypes.UUID, allowNull: false },
  // client nullable (E7 RGPD) : permet l'anonymisation à la suppression du user.
  // Les transactions sont conservées (obligation comptable) mais détachées.
  client: { type: DataTypes.UUID, allowNull: true },
  type: { type: DataTypes.ENUM('virement', 'interac', 'paiement', 'depot', 'retrait'), allowNull: false },
  montant: { type: DataTypes.DOUBLE, allowNull: false },
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  description: { type: DataTypes.STRING, defaultValue: '' },
  statut: { type: DataTypes.ENUM('executee', 'en_attente', 'planifiee', 'annulee'), defaultValue: 'executee' },
  sens: { type: DataTypes.ENUM('debit', 'credit'), allowNull: false },
  beneficiaire: { type: DataTypes.UUID, allowNull: true },
  fournisseur: { type: DataTypes.UUID, allowNull: true },
  compteDestination: { type: DataTypes.UUID, allowNull: true },
  imageCheque: { type: DataTypes.TEXT('medium'), allowNull: true }, // photo en base64 (US-12)
  recurrence: { type: DataTypes.ENUM('hebdomadaire', 'mensuelle'), allowNull: true },
  prochaineDate: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'transactions',
  timestamps: false,
  // E4 : index sur les colonnes les plus filtrées de l'historique
  indexes: [
    { fields: ['client'] },
    { fields: ['compte'] },
    { fields: ['date'] },
    { fields: ['statut'] },
  ],
});

Transaction.prototype.annuler = function () {
  if (this.statut === 'executee') throw new Error('Transaction déjà exécutée');
  this.statut = 'annulee';
};

/* ─── Beneficiaire / Fournisseur ────────────────────────── */
const Beneficiaire = sequelize.define('Beneficiaire', {
  _id: pk,
  client: { type: DataTypes.UUID, allowNull: false },
  nom: { type: DataTypes.STRING, allowNull: false },
  coordonnees: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'beneficiaires', timestamps: false });

const Fournisseur = sequelize.define('Fournisseur', {
  _id: pk,
  client: { type: DataTypes.UUID, allowNull: false },
  nom: { type: DataTypes.STRING, allowNull: false },
  categorie: { type: DataTypes.STRING, defaultValue: 'autre' },
}, { tableName: 'fournisseurs', timestamps: false });

/* ─── ObjectifEpargne ───────────────────────────────────── */
const ObjectifEpargne = sequelize.define('ObjectifEpargne', {
  _id: pk,
  client: { type: DataTypes.UUID, allowNull: false },
  nom: { type: DataTypes.STRING, allowNull: false },
  montantCible: { type: DataTypes.DOUBLE, allowNull: false },
  montantEpargne: { type: DataTypes.DOUBLE, defaultValue: 0 },
}, { tableName: 'objectifs_epargne', timestamps: false });

ObjectifEpargne.prototype.progression = function () {
  return Math.min(100, Math.round((this.montantEpargne / this.montantCible) * 100));
};

/* ─── Notification ──────────────────────────────────────── */
const Notification = sequelize.define('Notification', {
  _id: pk,
  client: { type: DataTypes.UUID, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  lue: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'notifications', timestamps: false });

Notification.envoyer = (clientId, message) => Notification.create({ client: clientId, message });

/* ─── ProduitFinancier ──────────────────────────────────── */
const ProduitFinancier = sequelize.define('ProduitFinancier', {
  _id: pk,
  nom: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false },
  valeur: { type: DataTypes.DOUBLE, allowNull: false },
  description: { type: DataTypes.STRING, defaultValue: '' },
}, { tableName: 'produits_financiers', timestamps: false });

/* ─── ParametresGlobaux (ligne unique) ──────────────────── */
const ParametresGlobaux = sequelize.define('ParametresGlobaux', {
  _id: pk,
  seuilSoldeFaible: { type: DataTypes.DOUBLE, defaultValue: 100 },
  devise: { type: DataTypes.STRING, defaultValue: 'CAD' },
  // M5 — limites métier configurables (au lieu de valeurs hardcodées)
  limiteInterac: { type: DataTypes.DOUBLE, defaultValue: 3000 },
  limiteCarteDefaut: { type: DataTypes.DOUBLE, defaultValue: 1000 },
}, { tableName: 'parametres_globaux', timestamps: false });

ParametresGlobaux.obtenir = async function () {
  let params = await ParametresGlobaux.findOne();
  if (!params) params = await ParametresGlobaux.create({});
  return params;
};

/* ─── DemandePret (workflow demande / approbation / refus) ─ */
const DemandePret = sequelize.define('DemandePret', {
  _id: pk,
  client: { type: DataTypes.UUID, allowNull: false },
  montant: { type: DataTypes.DOUBLE, allowNull: false },
  duree: { type: DataTypes.INTEGER, allowNull: false }, // en mois (1 à 360)
  motif: { type: DataTypes.STRING(500), allowNull: false },
  revenuMensuel: { type: DataTypes.DOUBLE, allowNull: false },
  statut: {
    type: DataTypes.ENUM('en_attente', 'approuvee', 'refusee'),
    defaultValue: 'en_attente',
  },
  dateDemande: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  dateDecision: { type: DataTypes.DATE, allowNull: true },
  decideur: { type: DataTypes.UUID, allowNull: true },
  comptePret: { type: DataTypes.UUID, allowNull: true },
  commentaireDecision: { type: DataTypes.STRING(500), allowNull: true },
}, { tableName: 'demandes_pret', timestamps: false });

/* ─── AuditLog (traçabilité de toutes les actions sensibles) ─ */
const AuditLog = sequelize.define('AuditLog', {
  _id: pk,
  userId: { type: DataTypes.UUID, allowNull: true }, // null si action anonyme (ex: login échoué)
  action: { type: DataTypes.STRING(80), allowNull: false }, // ex: 'login.success', 'virement.interne'
  ipAddress: { type: DataTypes.STRING(45), allowNull: true }, // IPv6 max 45 chars
  userAgent: { type: DataTypes.STRING(500), allowNull: true },
  payload: { type: DataTypes.JSON, allowNull: true }, // contexte (sans secrets)
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'audit_logs',
  timestamps: false,
  indexes: [
    { fields: ['userId'] },
    { fields: ['action'] },
    { fields: ['createdAt'] },
  ],
});

/* ─── RevokedToken (blacklist des JWT déconnectés) ──────── */
const RevokedToken = sequelize.define('RevokedToken', {
  _id: pk,
  jti: { type: DataTypes.STRING(36), allowNull: false, unique: true }, // ID unique du JWT
  userId: { type: DataTypes.UUID, allowNull: false },
  expireA: { type: DataTypes.DATE, allowNull: false }, // pour purge auto
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'revoked_tokens',
  timestamps: false,
  indexes: [{ fields: ['jti'] }, { fields: ['expireA'] }],
});

/* ─── Otp (code à 6 chiffres, haché, expirant) ──────────── */
const Otp = sequelize.define('Otp', {
  _id: pk,
  user: { type: DataTypes.UUID, allowNull: false },
  codeHache: { type: DataTypes.STRING, allowNull: false },
  tentatives: { type: DataTypes.INTEGER, defaultValue: 0 },
  expireA: { type: DataTypes.DATE, allowNull: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'otps', timestamps: false });

Otp.genererCode = () => String(crypto.randomInt(100000, 1000000));
Otp.creerPour = async function (userId) {
  const { Op } = require('sequelize');
  const code = Otp.genererCode();
  // purge : anciens codes de l'utilisateur + codes expirés
  await Otp.destroy({ where: { [Op.or]: [{ user: userId }, { expireA: { [Op.lt]: new Date() } }] } });
  await Otp.create({
    user: userId,
    codeHache: await bcrypt.hash(code, 10),
    expireA: new Date(Date.now() + 5 * 60 * 1000),
  });
  return code;
};
Otp.prototype.verifier = function (code) {
  return bcrypt.compare(code, this.codeHache);
};

module.exports = {
  sequelize, User, Compte, Transaction, Beneficiaire, Fournisseur,
  ObjectifEpargne, Notification, ProduitFinancier, ParametresGlobaux, Otp,
  DemandePret, AuditLog, RevokedToken,
};
