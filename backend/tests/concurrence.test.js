/**
 * Test de robustesse — Phase 1 / bug C2 (rapport d'audit §2)
 *
 * Vérifie qu'un compte soumis à plusieurs débits concurrents conserve
 * l'invariant comptable : le solde ne devient JAMAIS négatif et ne
 * descend que de la somme exacte des débits qui ont réussi.
 *
 * Sans LOCK.UPDATE + sequelize.transaction, ce test échoue car plusieurs
 * requêtes lisent le même solde initial et le décrémentent en parallèle.
 */

// Charge .env et force l'utilisation de la base de test
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';

const { sequelize, User, Compte } = require('../src/models');
const { connectDB } = require('../src/config/db');

beforeAll(async () => {
  await connectDB(); // connectDB() fait déjà un sync() non destructif
  // Nettoyage ciblé : on ne touche qu'aux tables manipulées par ce test
  await Compte.destroy({ where: {} });
  await User.destroy({ where: {} });
}, 30000);

afterAll(async () => {
  await sequelize.close();
});

test('5 retraits concurrents sur un compte de solde 100 — invariant respecté', async () => {
  // Préparation : un utilisateur + un compte chèque avec solde initial 100
  const user = await User.create({
    nom: 'Concurrence',
    email: `concurrence-${Date.now()}@test.local`,
    motDePasseHache: 'hash_fictif',
  });
  const compte = await Compte.create({
    proprietaire: user._id,
    numero: Compte.genererNumero(),
    type: 'cheque',
    solde: 100,
  });

  // 5 retraits parallèles de 30 chacun. Au plus 3 peuvent réussir (3 × 30 = 90 ≤ 100).
  const retraits = Array.from({ length: 5 }, () =>
    sequelize.transaction(async (t) => {
      const c = await Compte.findOne({
        where: { _id: compte._id },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      c.debiter(30);
      await c.save({ transaction: t });
    }).then(
      () => 'ok',
      (e) => `erreur:${e.message}`,
    ),
  );

  const resultats = await Promise.all(retraits);
  const reussites = resultats.filter((r) => r === 'ok').length;
  const echecs = resultats.filter((r) => r.startsWith('erreur:')).length;

  const final = await Compte.findByPk(compte._id);

  // Invariant n°1 : le solde ne peut JAMAIS être négatif
  expect(final.solde).toBeGreaterThanOrEqual(0);
  // Invariant n°2 : solde final = solde initial − (30 × nombre de réussites)
  expect(final.solde).toBe(100 - 30 * reussites);
  // Invariant n°3 : exactement 3 réussites attendues (3 × 30 = 90, le 4e échoue à 10 − 30)
  expect(reussites).toBe(3);
  expect(echecs).toBe(2);
});
