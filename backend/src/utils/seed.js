/**
 * Données initiales : administrateur, paramètres globaux, produits financiers.
 * Lancer avec : npm run seed
 */
require('dotenv').config();
const { connectDB } = require('../config/db');

async function seed() {
  await connectDB();
  const { User, ParametresGlobaux, ProduitFinancier } = require('../models');

  // Administrateur par défaut
  if (!(await User.findOne({ where: { email: 'admin@banque.com' } }))) {
    await User.create({
      nom: 'Administrateur',
      email: 'admin@banque.com',
      motDePasseHache: await User.hacher('Admin1234'),
      role: 'admin',
    });
    console.log('✔ Admin créé : admin@banque.com / Admin1234');
  }

  // Paramètres globaux
  await ParametresGlobaux.obtenir();
  console.log('✔ Paramètres globaux initialisés');

  // Produits financiers
  if ((await ProduitFinancier.count()) === 0) {
    await ProduitFinancier.bulkCreate([
      { nom: 'CELI Avantage', type: 'CELI', valeur: 3.5, description: 'Compte d’épargne libre d’impôt — taux 3,5 %' },
      { nom: 'REER Croissance', type: 'REER', valeur: 4.2, description: 'Régime enregistré d’épargne-retraite — rendement cible 4,2 %' },
      { nom: 'CPG 1 an', type: 'CPG', valeur: 4.0, description: 'Certificat de placement garanti 12 mois — 4,0 %' },
      { nom: 'Fonds équilibré', type: 'Fonds', valeur: 5.1, description: 'Fonds commun équilibré — rendement historique 5,1 %' },
    ]);
    console.log('✔ Produits financiers créés');
  }

  console.log('🌱 Seed terminé');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
