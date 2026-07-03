const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Sécurité C4 : refuser de démarrer si la clé JWT est absente, trop faible
// ou laissée à sa valeur par défaut du .env.example.
function validerJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET absent du fichier .env. Générez une clé avec : openssl rand -base64 48');
  }
  if (secret.includes('changez_moi')) {
    throw new Error('JWT_SECRET contient la valeur par défaut "changez_moi…". Remplacez-la par une vraie clé : openssl rand -base64 48');
  }
  if (secret.length < 32) {
    throw new Error(`JWT_SECRET trop court (${secret.length} caractères, minimum 32). Générez-en une nouvelle : openssl rand -base64 48`);
  }
}
validerJwtSecret();

// Garde-fous de déploiement : en production, certains réglages de démo/dev
// sont dangereux. On refuse ou on avertit bruyamment au démarrage.
function verifierConfigProduction() {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.DEMO_OTP === 'true') {
    // Le code applicatif l'ignore déjà en prod, mais une config incohérente
    // signale presque toujours un .env de dev copié par erreur.
    console.warn('⚠️  DEMO_OTP=true est ignoré en production (le code OTP ne sera jamais exposé).');
  }
  if (!(process.env.SMTP_USER && process.env.SMTP_PASS)) {
    console.warn('⚠️  SMTP non configuré : les codes OTP ne pourront PAS être livrés aux clients — la connexion sera impossible. Configurez SMTP_USER / SMTP_PASS.');
  }
  if (!process.env.DB_PASS) {
    console.warn('⚠️  DB_PASS vide : la base de données de production doit avoir un utilisateur dédié avec mot de passe.');
  }
}
verifierConfigProduction();

const app = require('./app');
const { connectDB } = require('./config/db');
const { demarrerPlanificateur } = require('./utils/recurrence');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    demarrerPlanificateur(); // US-17 : transactions récurrentes
    app.listen(PORT, () => console.log(`🏦 API Banque démarrée : http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Impossible de se connecter à MySQL :', err.message);
    process.exit(1);
  });
