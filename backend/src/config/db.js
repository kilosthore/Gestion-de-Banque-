const { Sequelize } = require('sequelize');
// require explicite : Sequelize charge pg dynamiquement, ce qui échappe au
// tracing statique du bundler Vercel — sans ceci, « Please install pg
// package manually » en production.
const pg = require('pg');

const estTest = process.env.NODE_ENV === 'test';
const DB_NAME = estTest
  ? process.env.DB_NAME_TEST || 'banque_test'
  : process.env.DB_NAME || 'banque';

/** Instance Sequelize (Postgres) partagée par toute l'application */
const sequelize = new Sequelize(
  DB_NAME,
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    // 6543 = session pooler Supabase (PgBouncer), requis en serverless :
    // la connexion directe (5432) sature vite la limite de connexions.
    port: Number(process.env.DB_PORT) || 6543,
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
    // Pool restreint : en serverless (Vercel), chaque instance de fonction peut
    // ouvrir ses propres connexions — un pool large épuiserait vite la limite
    // de connexions de la base cloud (souvent 10-20 sur les offres gratuites).
    pool: { max: 3, min: 0, idle: 10000, acquire: 30000 },
  }
);

/** Authentifie la connexion puis synchronise les tables */
async function connectDB() {
  await sequelize.authenticate();
  require('../models'); // charge les modèles
  // 1) sync simple : crée les tables manquantes en ordre topologique (FK).
  await sequelize.sync();
  // 2) alter opt-in (DB_SYNC_ALTER=1) : applique les évolutions de schéma.
  //    Pas de alter à chaque démarrage : sur Postgres, Sequelize duplique les
  //    contraintes UNIQUE à chaque passage (bloat à chaque cold start Vercel
  //    ou redémarrage nodemon). À lancer une fois après un changement de
  //    modèle. AuditLog est exclu : Sequelize génère un « ALTER ... TYPE
  //    BIGSERIAL » invalide pour sa colonne seq (auto-incrément non-PK), et la
  //    table d'audit chaînée ne doit jamais être altérée automatiquement.
  if (process.env.DB_SYNC_ALTER === '1') {
    for (const model of Object.values(sequelize.models)) {
      if (model.name !== 'AuditLog') await model.sync({ alter: true });
    }
  }
  // Garder console.log au démarrage : le logger n'est pas encore initialisé,
  // et cette info doit toujours apparaître pour les opérateurs.
  console.log(`✔ Postgres connecté : base « ${DB_NAME} »`);
}

module.exports = { sequelize, connectDB };
