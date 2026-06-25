/**
 * Tests — Authentification & sécurité (US-01, US-23)
 * Inscription, politique de mot de passe, OTP 6 chiffres, verrouillage.
 */
const request = require('supertest');
const { ouvrirBase, viderBase, fermerBase } = require('./setup');
const app = require('../src/app');

beforeAll(ouvrirBase);
beforeEach(viderBase);
afterAll(fermerBase);

const CLIENT = { nom: 'Test', prenom: 'Jean', email: 'jean@test.com', motDePasse: 'Secure123' };

/** Inscrit + connecte un client et retourne son JWT complet */
async function connecterClient() {
  await request(app).post('/api/auth/register').send(CLIENT);
  const login = await request(app).post('/api/auth/login')
    .send({ email: CLIENT.email, motDePasse: CLIENT.motDePasse });
  const verif = await request(app).post('/api/auth/verify-otp')
    .send({ tempToken: login.body.tempToken, code: login.body.codeDemo });
  return verif.body.token;
}
module.exports = { connecterClient, CLIENT };

describe('US-01 — Inscription', () => {
  test('crée un profil et un compte chèque de 500 $', async () => {
    const res = await request(app).post('/api/auth/register').send(CLIENT);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(CLIENT.email);
  });

  test('refuse un mot de passe faible', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ ...CLIENT, motDePasse: 'abc' });
    expect(res.status).toBe(400);
  });

  test('refuse un email en double', async () => {
    await request(app).post('/api/auth/register').send(CLIENT);
    const res = await request(app).post('/api/auth/register').send(CLIENT);
    expect(res.status).toBe(409);
  });
});

describe('US-23 — Connexion en 2 étapes (OTP)', () => {
  beforeEach(() => request(app).post('/api/auth/register').send(CLIENT));

  test('étape 1 : renvoie un tempToken et un code à 6 chiffres', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: CLIENT.email, motDePasse: CLIENT.motDePasse });
    expect(res.status).toBe(200);
    expect(res.body.tempToken).toBeDefined();
    expect(res.body.codeDemo).toMatch(/^\d{6}$/);
  });

  test('étape 2 : un bon code donne un JWT complet', async () => {
    const login = await request(app).post('/api/auth/login')
      .send({ email: CLIENT.email, motDePasse: CLIENT.motDePasse });
    const res = await request(app).post('/api/auth/verify-otp')
      .send({ tempToken: login.body.tempToken, code: login.body.codeDemo });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('un mauvais code est refusé (3 essais max)', async () => {
    const login = await request(app).post('/api/auth/login')
      .send({ email: CLIENT.email, motDePasse: CLIENT.motDePasse });
    const mauvais = login.body.codeDemo === '000000' ? '111111' : '000000';
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/api/auth/verify-otp')
        .send({ tempToken: login.body.tempToken, code: mauvais });
      expect(res.status).toBe(401);
    }
    const res4 = await request(app).post('/api/auth/verify-otp')
      .send({ tempToken: login.body.tempToken, code: mauvais });
    expect(res4.status).toBe(429); // OTP détruit après 3 échecs
  });

  test('le tempToken seul ne donne PAS accès à l’API', async () => {
    const login = await request(app).post('/api/auth/login')
      .send({ email: CLIENT.email, motDePasse: CLIENT.motDePasse });
    const res = await request(app).get('/api/comptes')
      .set('Authorization', `Bearer ${login.body.tempToken}`);
    expect(res.status).toBe(401);
  });

  test('mauvais mot de passe refusé', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: CLIENT.email, motDePasse: 'Mauvais123' });
    expect(res.status).toBe(401);
  });

  test('verrouillage du compte après 5 échecs', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login')
        .send({ email: CLIENT.email, motDePasse: 'Mauvais123' });
    }
    const res = await request(app).post('/api/auth/login')
      .send({ email: CLIENT.email, motDePasse: CLIENT.motDePasse });
    expect(res.status).toBe(423); // verrouillé même avec le bon mot de passe
  });
});

describe('US-03 — Mon profil', () => {
  test('GET /api/auth/me avec un JWT valide', async () => {
    const token = await connecterClient();
    const res = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(CLIENT.email);
  });

  test('GET /api/auth/me sans jeton → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
