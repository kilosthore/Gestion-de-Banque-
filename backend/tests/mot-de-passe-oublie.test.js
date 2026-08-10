/**
 * Tests — Mot de passe oublié (libre-service).
 *  - Parcours complet : demande → code temporaire → connexion → changement obligatoire
 *  - Anti-énumération : réponse identique pour un email inconnu
 *  - Le verrou après 5 échecs est levé (c'est le cas d'usage principal)
 *  - Un dossier non actif ne reçoit rien, sans le divulguer
 */
const request = require('supertest');
const { ouvrirBase, viderBase, fermerBase } = require('./setup');
const app = require('../src/app');
const { User } = require('../src/models');

beforeAll(ouvrirBase);
beforeEach(viderBase);
afterAll(fermerBase);

const CLIENT = { nom: 'Test', prenom: 'Lea', email: 'lea@test.com', motDePasse: 'Secure123' };

/** Connexion complète (login + OTP) → { token, user } */
async function connecter(email, motDePasse) {
  const login = await request(app).post('/api/auth/login').send({ email, motDePasse });
  const verif = await request(app).post('/api/auth/verify-otp')
    .send({ tempToken: login.body.tempToken, code: login.body.codeDemo });
  return verif.body;
}

const demander = (email) => request(app).post('/api/auth/mot-de-passe-oublie').send({ email });

test('parcours complet : demande → code temporaire → connexion → changement obligatoire', async () => {
  await request(app).post('/api/auth/register').send(CLIENT);

  const res = await demander(CLIENT.email);
  expect(res.status).toBe(200);
  expect(res.body.codeTemporaireDemo).toMatch(/^\d{6}$/);
  const codeTemp = res.body.codeTemporaireDemo;

  // L'ancien mot de passe ne fonctionne plus
  const ancien = await request(app).post('/api/auth/login')
    .send({ email: CLIENT.email, motDePasse: CLIENT.motDePasse });
  expect(ancien.status).toBe(401);

  // Le code temporaire sert de mot de passe, et lève le drapeau
  const session = await connecter(CLIENT.email, codeTemp);
  expect(session.user.doitChangerMotDePasse).toBe(true);

  // Choix d'un vrai mot de passe → le drapeau retombe
  const changement = await request(app).post('/api/auth/changer-mot-de-passe')
    .set('Authorization', `Bearer ${session.token}`)
    .send({ ancienMotDePasse: codeTemp, nouveauMotDePasse: 'NouveauMdp9' });
  expect(changement.status).toBe(200);

  const apres = await connecter(CLIENT.email, 'NouveauMdp9');
  expect(apres.user.doitChangerMotDePasse).toBe(false);
});

test('anti-énumération : email inconnu → même réponse, aucun code', async () => {
  await request(app).post('/api/auth/register').send(CLIENT);

  const connu = await demander(CLIENT.email);
  const inconnu = await demander('personne@test.com');

  expect(inconnu.status).toBe(connu.status);
  expect(inconnu.body.message).toBe(connu.body.message);
  // Le code ne doit exister que pour un compte réel
  expect(inconnu.body.codeTemporaireDemo).toBeUndefined();
  expect(connu.body.codeTemporaireDemo).toMatch(/^\d{6}$/);
});

test('email manquant → 400', async () => {
  const res = await demander('');
  expect(res.status).toBe(400);
});

test('lève le verrouillage après 5 échecs — le cas d’usage principal', async () => {
  await request(app).post('/api/auth/register').send(CLIENT);
  for (let i = 0; i < 5; i++) {
    await request(app).post('/api/auth/login').send({ email: CLIENT.email, motDePasse: 'FauxMdp1' });
  }
  const verrouille = await request(app).post('/api/auth/login')
    .send({ email: CLIENT.email, motDePasse: CLIENT.motDePasse });
  expect(verrouille.status).toBe(423); // compte verrouillé

  const res = await demander(CLIENT.email);
  const session = await connecter(CLIENT.email, res.body.codeTemporaireDemo);
  expect(session.token).toBeTruthy(); // le verrou a bien été levé

  const user = await User.findOne({ where: { email: CLIENT.email } });
  expect(user.echecsConnexion).toBe(0);
  expect(user.verrouJusqua).toBeNull();
});

test('dossier en_verification : aucun code, sans le divulguer', async () => {
  const u = await User.create({
    nom: 'Attente', email: 'attente@test.com',
    motDePasseHache: await User.hacher('Secure123'),
    statutDossier: 'en_verification',
  });

  const res = await demander('attente@test.com');
  expect(res.status).toBe(200);
  expect(res.body.codeTemporaireDemo).toBeUndefined();

  // Le mot de passe n'a pas été touché
  const apres = await User.scope('avecMdp').findOne({ where: { _id: u._id } });
  expect(await apres.comparerMotDePasse('Secure123')).toBe(true);
});
