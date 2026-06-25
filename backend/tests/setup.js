/** Connexion à la base MySQL de TEST (séparée de la base de dev) */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret_de_test_uniquement';
process.env.DEMO_OTP = 'true';
require('dotenv').config();

const { sequelize, connectDB } = require('../src/config/db');

async function ouvrirBase() {
  await connectDB();                    // crée la base banque_test si besoin
  await sequelize.sync({ force: true }); // repart de tables vides
}

async function viderBase() {
  const modeles = Object.values(sequelize.models);
  for (const m of modeles) {
    await m.destroy({ where: {}, truncate: true });
  }
}

async function fermerBase() {
  await sequelize.close();
}

module.exports = { ouvrirBase, viderBase, fermerBase };
