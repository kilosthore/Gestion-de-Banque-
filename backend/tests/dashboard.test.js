/**
 * Test — Phase 6 / US-26 — endpoint agrégé /api/dashboard/summary
 *
 * Vérifie que :
 *  - la route requiert l'authentification
 *  - tous les champs attendus sont présents
 *  - le calcul de totalBalance exclut les CarteCredit
 *  - les transactions récentes sont limitées à 10
 *  - les agrégats credits/debits par mois sont corrects
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { sequelize, User, Compte, Transaction, ObjectifEpargne } = require('../src/models');
const { connectDB } = require('../src/config/db');
const app = require('../src/app');
const jwt = require('jsonwebtoken');

function signerJwt(id) {
  return jwt.sign({ id, role: 'client', etape: 'complet' }, process.env.JWT_SECRET, { expiresIn: '5m' });
}

let token;
let userId;

beforeAll(async () => {
  await connectDB();
  await Transaction.destroy({ where: {} });
  await ObjectifEpargne.destroy({ where: {} });
  await Compte.destroy({ where: {} });
  await User.destroy({ where: {} });

  const user = await User.create({
    nom: 'Dash',
    email: `dash-${Date.now()}@test.local`,
    motDePasseHache: 'hash_fictif',
    role: 'client',
  });
  userId = user._id;
  token = signerJwt(user._id);

  // Préparer un compte chèque (300), un compte épargne (200), une CarteCredit (limite 1000)
  await Compte.create({ proprietaire: userId, numero: Compte.genererNumero(), type: 'cheque', solde: 300 });
  await Compte.create({ proprietaire: userId, numero: Compte.genererNumero(), type: 'epargne', solde: 200 });
  await Compte.create({
    proprietaire: userId, numero: Compte.genererNumero(),
    type: 'credit', kind: 'CarteCredit', solde: 0, limite: 1000, soldeUtilise: 250,
  });

  // 12 transactions pour vérifier le limit=10 + agrégat mensuel
  const compteCheque = await Compte.findOne({ where: { proprietaire: userId, type: 'cheque' } });
  for (let i = 0; i < 12; i++) {
    await Transaction.create({
      compte: compteCheque._id,
      client: userId,
      type: i % 2 === 0 ? 'paiement' : 'depot',
      montant: 50 + i,
      sens: i % 2 === 0 ? 'debit' : 'credit',
      statut: 'executee',
      description: i % 2 === 0 ? 'Facture test' : 'Salaire test',
    });
  }
}, 30000);

afterAll(async () => {
  await sequelize.close();
});

test('Route /api/dashboard/summary requiert l\'authentification', async () => {
  const r = await request(app).get('/api/dashboard/summary');
  expect(r.status).toBe(401);
});

test('Route renvoie tous les champs agrégés attendus', async () => {
  const r = await request(app)
    .get('/api/dashboard/summary')
    .set('Authorization', `Bearer ${token}`);
  expect(r.status).toBe(200);

  expect(r.body).toHaveProperty('user');
  expect(r.body).toHaveProperty('totalBalance');
  expect(r.body).toHaveProperty('currency');
  expect(r.body).toHaveProperty('trend30j');
  expect(r.body).toHaveProperty('accounts');
  expect(r.body).toHaveProperty('recentTransactions');
  expect(r.body).toHaveProperty('spendingByMonth');
  expect(r.body).toHaveProperty('topGoals');
});

test('totalBalance somme les Comptes mais exclut CarteCredit', async () => {
  const r = await request(app)
    .get('/api/dashboard/summary')
    .set('Authorization', `Bearer ${token}`);
  // chèque 300 + épargne 200 = 500. La CarteCredit (solde=0) est exclue.
  expect(r.body.totalBalance).toBe(500);
  expect(r.body.accounts.length).toBe(3); // les 3 comptes restent listés
});

test('recentTransactions plafonné à 10 entrées', async () => {
  const r = await request(app)
    .get('/api/dashboard/summary')
    .set('Authorization', `Bearer ${token}`);
  expect(r.body.recentTransactions.length).toBe(10);
});

test('spendingByMonth agrège credits et debits du mois courant', async () => {
  const r = await request(app)
    .get('/api/dashboard/summary')
    .set('Authorization', `Bearer ${token}`);
  expect(r.body.spendingByMonth.length).toBeGreaterThanOrEqual(1);
  const moisCourant = r.body.spendingByMonth[r.body.spendingByMonth.length - 1];
  expect(moisCourant.credits).toBeGreaterThan(0);
  expect(moisCourant.debits).toBeGreaterThan(0);
});
