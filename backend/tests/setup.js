/** Connexion à la base MySQL de TEST (séparée de la base de dev) */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret_de_test_uniquement';
process.env.DEMO_OTP = 'true';
require('dotenv').config();

// SMTP neutralisé APRÈS dotenv : sinon `.config()` repeuple les clés supprimées
// (il n'écrase pas l'existant, mais il renseigne ce qui manque). Sans ceci, une
// machine dont le .env porte de vraies clés Gmail envoie de vrais emails à
// chaque `npm test` — et `smtpConfigure()` fait diverger le mode démo, donc les
// tests dépendent du .env du poste au lieu du seul code.
delete process.env.SMTP_HOST;
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

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
  // Attendre un court instant pour laisser s'exécuter les tâches asynchrones
  // lancées en arrière-plan (hooks `afterCreate`, setImmediate, etc.). Sans
  // cette pause, certaines opérations peuvent tenter d'utiliser la connexion
  // après la fermeture, causant des erreurs dans Jest.
  await new Promise((res) => setTimeout(res, 100));
  await sequelize.close();
}

module.exports = { ouvrirBase, viderBase, fermerBase };
