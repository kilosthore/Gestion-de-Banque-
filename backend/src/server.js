const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { validerJwtSecret, verifierConfigProduction } = require('./boot');
validerJwtSecret();
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
