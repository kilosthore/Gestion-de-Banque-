const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { validerJwtSecret, verifierConfigProduction } = require('../src/boot');
validerJwtSecret();
verifierConfigProduction();

const app = require('../src/app');
const { sequelize } = require('../src/config/db');

/**
 * Point d'entrée serverless (Vercel) : pas de app.listen(), pas de
 * planificateur setInterval (impossible entre deux invocations — voir
 * routes/cron.routes.js + le Vercel Cron Job défini dans vercel.json).
 * La connexion est ouverte une seule fois par conteneur « chaud »
 * (mise en cache de la promesse d'authentification).
 *
 * IMPORTANT : les tables doivent déjà exister sur la base cloud avant le
 * premier déploiement — exécutez `npm run seed --prefix backend` une fois en
 * local avec les identifiants de la base cloud dans backend/.env (voir README,
 * section Déploiement Vercel). Cette fonction ne fait volontairement AUCUN
 * CREATE DATABASE / sync({ alter: true }) : ce serait risqué à chaque
 * démarrage à froid concurrent.
 */
let connexionPrete = null;
function assurerConnexion() {
  if (!connexionPrete) {
    connexionPrete = sequelize.authenticate().catch((err) => {
      connexionPrete = null; // permet une nouvelle tentative au prochain appel
      throw err;
    });
  }
  return connexionPrete;
}

module.exports = async (req, res) => {
  try {
    await assurerConnexion();
  } catch (err) {
    res.status(503).json({ message: 'Base de données indisponible', detail: err.message });
    return;
  }
  return app(req, res);
};
