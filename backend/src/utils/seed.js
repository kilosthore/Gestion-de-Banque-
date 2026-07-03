/**
 * Données initiales : administrateur, paramètres globaux, produits financiers.
 * Lancer avec : npm run seed
 */
require('dotenv').config();
const crypto = require('crypto');
const { connectDB } = require('../config/db');

async function seed() {
  await connectDB();
  const { User, ParametresGlobaux, ProduitFinancier } = require('../models');

  // Administrateur par défaut — mot de passe fourni par ADMIN_PASSWORD (.env)
  // ou généré aléatoirement et affiché UNE SEULE FOIS ici. Jamais codé en dur :
  // un mot de passe présent dans le dépôt git est public.
  if (!(await User.findOne({ where: { email: 'admin@banque.com' } }))) {
    const mdpAdmin = process.env.ADMIN_PASSWORD || `Adm${crypto.randomBytes(9).toString('base64url')}1a`;
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(mdpAdmin)) {
      throw new Error('ADMIN_PASSWORD trop faible : 8+ caractères avec majuscule, minuscule et chiffre');
    }
    await User.create({
      nom: 'Administrateur',
      email: 'admin@banque.com',
      motDePasseHache: await User.hacher(mdpAdmin),
      role: 'admin',
    });
    console.log(`✔ Admin créé : admin@banque.com / ${process.env.ADMIN_PASSWORD ? '(mot de passe ADMIN_PASSWORD du .env)' : mdpAdmin + '  ← notez-le, il ne sera plus affiché'}`);
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
