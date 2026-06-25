/**
 * Test — Phase 1 / bug C5 (rapport d'audit §2)
 *
 * Vérifie que la méthode Compte.debiter() est polymorphe :
 *  - sur un Compte classique : consomme le solde, refuse si insuffisant
 *  - sur une CarteCredit    : consomme la marge de crédit, refuse si limite dépassée
 *
 * Sans cette correction, la limite d'une CarteCredit n'était jamais vérifiée
 * et debiter() décrémentait à tort le champ "solde" (toujours 0) au lieu de
 * "soldeUtilise".
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';

const { sequelize, User, Compte } = require('../src/models');
const { connectDB } = require('../src/config/db');

beforeAll(async () => {
  await connectDB();
  await Compte.destroy({ where: {} });
  await User.destroy({ where: {} });
}, 30000);

afterAll(async () => {
  await sequelize.close();
});

test('CarteCredit : limite respectée (succès, refus, succès, refus)', async () => {
  const user = await User.create({
    nom: 'CarteTest',
    email: `carte-${Date.now()}@test.local`,
    motDePasseHache: 'hash_fictif',
  });
  const carte = await Compte.create({
    proprietaire: user._id,
    numero: Compte.genererNumero(),
    type: 'credit',
    kind: 'CarteCredit',
    solde: 0,
    limite: 1000,
    soldeUtilise: 0,
  });

  // Achat 800 → succès (800 ≤ 1000)
  carte.debiter(800);
  expect(carte.soldeUtilise).toBe(800);

  // Achat 300 → refus (800 + 300 = 1100 > 1000), soldeUtilise inchangé
  expect(() => carte.debiter(300)).toThrow('Limite de carte de crédit dépassée');
  expect(carte.soldeUtilise).toBe(800);

  // Achat 200 → succès (800 + 200 = 1000, exactement la limite)
  carte.debiter(200);
  expect(carte.soldeUtilise).toBe(1000);

  // Achat 1 → refus (1000 + 1 > 1000)
  expect(() => carte.debiter(1)).toThrow('Limite de carte de crédit dépassée');
  expect(carte.soldeUtilise).toBe(1000);

  // payer() rembourse → décrémente soldeUtilise (n'incrémente pas solde)
  carte.payer(400);
  expect(carte.soldeUtilise).toBe(600);

  // Et un nouvel achat de 350 est désormais possible
  carte.debiter(350);
  expect(carte.soldeUtilise).toBe(950);
});

test('Compte classique : solde respecté (régression)', async () => {
  const user = await User.create({
    nom: 'CompteTest',
    email: `compte-${Date.now()}@test.local`,
    motDePasseHache: 'hash_fictif',
  });
  const compte = await Compte.create({
    proprietaire: user._id,
    numero: Compte.genererNumero(),
    type: 'cheque',
    solde: 500,
  });

  compte.debiter(200);
  expect(compte.solde).toBe(300);

  expect(() => compte.debiter(400)).toThrow('Solde insuffisant');
  expect(compte.solde).toBe(300);

  compte.crediter(100);
  expect(compte.solde).toBe(400);
});
