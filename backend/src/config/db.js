const { Sequelize } = require('sequelize');

const estTest = process.env.NODE_ENV === 'test';
const DB_NAME = estTest
  ? process.env.DB_NAME_TEST || 'banque_test'
  : process.env.DB_NAME || 'banque';

/** Instance Sequelize (MySQL) partagée par toute l'application */
const sequelize = new Sequelize(
  DB_NAME,
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
  }
);

/** Crée la base si elle n'existe pas, puis synchronise les tables */
async function connectDB() {
  const mysql = require('mysql2/promise');
  const cnx = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
  });
  await cnx.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await cnx.end();

  await sequelize.authenticate();
  require('../models'); // charge les modèles
  // alter: true → ajoute les nouvelles colonnes lors d'évolutions de schéma.
  // Acceptable pour ce projet (pas de système de migration). En prod réelle,
  // utiliser sequelize-cli avec des migrations versionnées.
  await sequelize.sync({ alter: true });
  // Garder console.log au démarrage : le logger n'est pas encore initialisé,
  // et cette info doit toujours apparaître pour les opérateurs.
  console.log(`✔ MySQL connecté : base « ${DB_NAME} »`);
}

module.exports = { sequelize, connectDB };
