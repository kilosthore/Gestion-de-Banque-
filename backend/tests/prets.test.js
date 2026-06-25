/**
 * Test — Phase 3 / bug C6 (rapport d'audit §2)
 *
 * Workflow demande de prêt :
 *  - Client soumet une demande (statut en_attente)
 *  - Anti-spam : une seule demande en_attente par client
 *  - Admin approuve : statut, dateDecision, decideur, compte prêt créé atomiquement
 *  - Admin tente de re-décider : refusé (déjà décidée)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { sequelize, User, Compte, DemandePret, Notification } = require('../src/models');
const { connectDB } = require('../src/config/db');
const app = require('../src/app');
const jwt = require('jsonwebtoken');

function signerJwt(id, role) {
  return jwt.sign({ id, role, etape: 'complet' }, process.env.JWT_SECRET, { expiresIn: '5m' });
}

let tokenClient;
let tokenAdmin;
let clientId;

beforeAll(async () => {
  await connectDB();
  await DemandePret.destroy({ where: {} });
  await Compte.destroy({ where: {} });
  await Notification.destroy({ where: {} });
  await User.destroy({ where: {} });

  const client = await User.create({
    nom: 'PretClient',
    email: `pret-client-${Date.now()}@test.local`,
    motDePasseHache: 'hash_fictif',
    role: 'client',
  });
  const admin = await User.create({
    nom: 'PretAdmin',
    email: `pret-admin-${Date.now()}@test.local`,
    motDePasseHache: 'hash_fictif',
    role: 'admin',
  });
  clientId = client._id;
  tokenClient = signerJwt(client._id, 'client');
  tokenAdmin = signerJwt(admin._id, 'admin');
}, 30000);

afterAll(async () => {
  await sequelize.close();
});

test('Workflow complet : demande → approbation → compte prêt créé', async () => {
  // 1. Client soumet une demande
  const soumission = await request(app)
    .post('/api/prets/demandes')
    .set('Authorization', `Bearer ${tokenClient}`)
    .send({ montant: 15000, duree: 24, motif: 'Achat véhicule', revenuMensuel: 3500 });
  expect(soumission.status).toBe(201);
  expect(soumission.body.demande.statut).toBe('en_attente');
  const demandeId = soumission.body.demande._id;

  // 2. Anti-spam : 2e demande refusée
  const doublon = await request(app)
    .post('/api/prets/demandes')
    .set('Authorization', `Bearer ${tokenClient}`)
    .send({ montant: 5000, duree: 12, motif: 'Autre projet', revenuMensuel: 3500 });
  expect(doublon.status).toBe(409);

  // 3. Admin liste les demandes
  const liste = await request(app)
    .get('/api/admin/prets/demandes')
    .set('Authorization', `Bearer ${tokenAdmin}`);
  expect(liste.status).toBe(200);
  expect(liste.body.demandes.length).toBeGreaterThanOrEqual(1);
  expect(liste.body.demandes[0]).toHaveProperty('clientEmail');

  // 4. Admin approuve → compte prêt créé crédité du montant
  const decision = await request(app)
    .put(`/api/admin/prets/demandes/${demandeId}`)
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ statut: 'approuvee', commentaireDecision: 'Dossier complet' });
  expect(decision.status).toBe(200);
  expect(decision.body.demande.statut).toBe('approuvee');
  expect(decision.body.compte).not.toBeNull();
  expect(decision.body.compte.type).toBe('pret');
  expect(decision.body.compte.solde).toBe(15000);

  // Vérifier en DB que le compte est lié à la demande
  const demandeFinale = await DemandePret.findByPk(demandeId);
  expect(demandeFinale.comptePret).toBe(decision.body.compte._id);
  expect(demandeFinale.decideur).toBeTruthy();
  expect(demandeFinale.dateDecision).toBeTruthy();

  // 5. Notification créée pour le client
  const notifs = await Notification.findAll({ where: { client: clientId } });
  expect(notifs.length).toBeGreaterThanOrEqual(1);
  expect(notifs.some((n) => n.message.includes('approuvée'))).toBe(true);

  // 6. Admin ne peut pas re-décider une demande déjà traitée
  const reDecision = await request(app)
    .put(`/api/admin/prets/demandes/${demandeId}`)
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ statut: 'refusee' });
  expect(reDecision.status).toBe(400);
  expect(reDecision.body.message).toMatch(/déjà/i);
});

test('Validation des entrées : montant, durée, motif, revenu', async () => {
  // Crée un autre client pour ne pas heurter l'anti-spam du test précédent
  const client2 = await User.create({
    nom: 'PretClient2',
    email: `pret-client2-${Date.now()}@test.local`,
    motDePasseHache: 'hash_fictif',
    role: 'client',
  });
  const token2 = signerJwt(client2._id, 'client');

  const cas = [
    { montant: -100, duree: 12, motif: 'X', revenuMensuel: 1000, attendu: /Montant invalide/ },
    { montant: 2_000_000, duree: 12, motif: 'X', revenuMensuel: 1000, attendu: /Montant maximum/ },
    { montant: 1000, duree: 0, motif: 'Test', revenuMensuel: 1000, attendu: /Durée invalide/ },
    { montant: 1000, duree: 500, motif: 'Test', revenuMensuel: 1000, attendu: /Durée invalide/ },
    { montant: 1000, duree: 12, motif: 'XX', revenuMensuel: 1000, attendu: /Motif requis/ },
    { montant: 1000, duree: 12, motif: 'Achat', revenuMensuel: -50, attendu: /Revenu mensuel/ },
  ];

  for (const c of cas) {
    const r = await request(app)
      .post('/api/prets/demandes')
      .set('Authorization', `Bearer ${token2}`)
      .send(c);
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(c.attendu);
  }
});
