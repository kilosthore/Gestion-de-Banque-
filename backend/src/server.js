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
