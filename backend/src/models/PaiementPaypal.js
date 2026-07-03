/**
 * PaiementPaypal — trace chaque commande PayPal (sandbox) et son état.
 * Modèle ADDITIF : n'altère aucun modèle existant. Chargé par paypal.routes.js
 * avant sequelize.sync(), la table est donc créée automatiquement au démarrage.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PaiementPaypal = sequelize.define('PaiementPaypal', {
  _id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId: { type: DataTypes.STRING, allowNull: true, unique: true },
  client: { type: DataTypes.UUID, allowNull: false },
  usage: { type: DataTypes.ENUM('depot', 'produit'), allowNull: false },
  compte: { type: DataTypes.UUID, allowNull: true },
  produit: { type: DataTypes.UUID, allowNull: true },
  montant: { type: DataTypes.DOUBLE, allowNull: false },
  devise: { type: DataTypes.STRING, defaultValue: 'CAD' },
  description: { type: DataTypes.STRING, defaultValue: '' },
  statut: { type: DataTypes.ENUM('creee', 'capturee', 'echouee'), defaultValue: 'creee' },
  captureId: { type: DataTypes.STRING, allowNull: true },
  transactionBancaire: { type: DataTypes.UUID, allowNull: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  capturedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'paiements_paypal',
  timestamps: false,
  indexes: [{ fields: ['client'] }, { fields: ['statut'] }],
});

module.exports = PaiementPaypal;
