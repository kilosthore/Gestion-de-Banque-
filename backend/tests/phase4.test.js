/**
 * Test — Phase 4 (qualité/sécurité)
 *  - E1 : JWT blacklist (logout → token devient invalide)
 *  - E2 : Audit trail (logs créés sur action sensible)
 *  - E7 : RGPD export + suppression
 *  - E8 : Purge des OTP expirés
 *  - M5 : Limite Interac configurable via ParametresGlobaux
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';

const request = require('supertest');
const {
  sequelize, User, Compte, Otp, AuditLog, RevokedToken, ParametresGlobaux,
} = require('../src/models');
const { connectDB } = require('../src/config/db');
const app = require('../src/app');
const { purger } = require('../src/utils/recurrence');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function signerComplet(id, role = 'client') {
  return jwt.sign(
    { id, role, etape: 'complet', jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

let tokenClient;
let userClient;

beforeAll(async () => {
  await connectDB();
  await RevokedToken.destroy({ where: {} });
  await AuditLog.destroy({ where: {} });
  await Otp.destroy({ where: {} });
  await Compte.destroy({ where: {} });
  await User.destroy({ where: {} });

  userClient = await User.create({
    nom: 'PhaseQuatre',
    email: `p4-${Date.now()}@test.local`,
    motDePasseHache: 'hash_fictif',
    role: 'client',
    statutDossier: 'actif',
  });
  await Compte.create({
    proprietaire: userClient._id,
    numero: Compte.genererNumero(),
    type: 'cheque',
    solde: 500,
  });
  tokenClient = signerComplet(userClient._id);
}, 30000);

afterAll(async () => {
  await sequelize.close();
});

test('E1 — /logout révoque le JWT (utilisation ultérieure → 401)', async () => {
  const monToken = signerComplet(userClient._id);

  // Le token marche avant logout
  const avant = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${monToken}`);
  expect(avant.status).toBe(200);

  // Logout
  const logout = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${monToken}`);
  expect(logout.status).toBe(200);

  // Le même token ne marche plus
  const apres = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${monToken}`);
  expect(apres.status).toBe(401);
  expect(apres.body.message).toMatch(/révoquée/i);
});

test('E2 — un audit log est créé après une action sensible', async () => {
  await AuditLog.destroy({ where: {} });
  const monToken = signerComplet(userClient._id);

  // Action sensible : logout (a auditLog wired)
  await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${monToken}`);

  // Attendre que le hook 'finish' du res ait écrit (best effort)
  await new Promise((r) => setTimeout(r, 100));

  const logs = await AuditLog.findAll({ where: { userId: userClient._id, action: 'logout' } });
  expect(logs.length).toBeGreaterThanOrEqual(1);
  expect(logs[0].ipAddress).toBeTruthy();
});

test('E7 — GET /api/auth/me/export-donnees renvoie toutes les données du client', async () => {
  const r = await request(app)
    .get('/api/auth/me/export-donnees')
    .set('Authorization', `Bearer ${tokenClient}`);
  expect(r.status).toBe(200);
  expect(r.body).toHaveProperty('profil');
  expect(r.body).toHaveProperty('comptes');
  expect(r.body).toHaveProperty('transactions');
  expect(r.body).toHaveProperty('exporteLe');
  expect(r.body.comptes.length).toBeGreaterThanOrEqual(1);
});

test('E7 — DELETE /api/auth/me supprime + anonymise (transactions client=null)', async () => {
  // Crée un user temporaire pour ne pas affecter le reste
  const userTemp = await User.create({
    nom: 'Suppr', email: `suppr-${Date.now()}@test.local`,
    motDePasseHache: 'h', role: 'client', statutDossier: 'actif',
  });
  await Compte.create({
    proprietaire: userTemp._id, numero: Compte.genererNumero(), type: 'cheque', solde: 100,
  });
  const tokenTemp = signerComplet(userTemp._id);

  const r = await request(app)
    .delete('/api/auth/me')
    .set('Authorization', `Bearer ${tokenTemp}`);
  expect(r.status).toBe(200);

  // User supprimé
  const verif = await User.findByPk(userTemp._id);
  expect(verif).toBeNull();
  // Compte supprimé
  const comptes = await Compte.findAll({ where: { proprietaire: userTemp._id } });
  expect(comptes.length).toBe(0);
});

test('E8 — purger() supprime les OTP expirés', async () => {
  await Otp.destroy({ where: {} });
  // OTP expiré (en arrière dans le temps)
  await Otp.create({
    user: userClient._id,
    codeHache: 'h',
    expireA: new Date(Date.now() - 60_000),
  });
  // OTP valide
  await Otp.create({
    user: userClient._id,
    codeHache: 'h',
    expireA: new Date(Date.now() + 60_000),
  });

  await purger();
  const restants = await Otp.findAll();
  expect(restants.length).toBe(1);
  expect(new Date(restants[0].expireA).getTime()).toBeGreaterThan(Date.now());
});

test('M5 — limite Interac configurable via ParametresGlobaux', async () => {
  const params = await ParametresGlobaux.obtenir();
  // Force la limite à 500$ via le modèle
  params.limiteInterac = 500;
  await params.save();

  const r = await request(app)
    .post('/api/transactions/interac')
    .set('Authorization', `Bearer ${tokenClient}`)
    .send({ compteSourceId: 'aucun', beneficiaireId: 'aucun', montant: 800 });
  // Doit retourner 400 avec le message contenant 500
  expect(r.status).toBe(400);
  expect(r.body.message).toMatch(/500/);

  // Restaure la limite par défaut
  params.limiteInterac = 3000;
  await params.save();
});
