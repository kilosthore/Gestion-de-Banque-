/**
 * Tests — Opérations bancaires (US-04, US-06, US-11, US-08, US-19, US-20, US-21)
 */
const request = require('supertest');
const { ouvrirBase, viderBase, fermerBase } = require('./setup');
const app = require('../src/app');
const User = require('../src/models/User');
const ParametresGlobaux = require('../src/models/ParametresGlobaux');

beforeAll(ouvrirBase);
beforeEach(viderBase);
afterAll(fermerBase);

const CLIENT = { nom: 'Test', prenom: 'Jean', email: 'jean@test.com', motDePasse: 'Secure123' };

async function connecterClient() {
  await request(app).post('/api/auth/register').send(CLIENT);
  const login = await request(app).post('/api/auth/login')
    .send({ email: CLIENT.email, motDePasse: CLIENT.motDePasse });
  const verif = await request(app).post('/api/auth/verify-otp')
    .send({ tempToken: login.body.tempToken, code: login.body.codeDemo });
  return verif.body.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('US-04 — Comptes', () => {
  test('le client a un compte chèque de 500 $ à l’inscription', async () => {
    const token = await connecterClient();
    const res = await request(app).get('/api/comptes').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.comptes).toHaveLength(1);
    expect(res.body.comptes[0].type).toBe('cheque');
    expect(res.body.comptes[0].solde).toBe(500);
  });

  test('ouverture d’un compte épargne', async () => {
    const token = await connecterClient();
    const res = await request(app).post('/api/comptes').set(auth(token)).send({ type: 'epargne' });
    expect(res.status).toBe(201);
    expect(res.body.compte.solde).toBe(0);
  });
});

describe('US-11 — Dépôt / retrait', () => {
  test('dépôt puis retrait mettent à jour le solde', async () => {
    const token = await connecterClient();
    const { body } = await request(app).get('/api/comptes').set(auth(token));
    const compteId = body.comptes[0]._id;

    const depot = await request(app).post('/api/transactions/depot-retrait')
      .set(auth(token)).send({ compteId, type: 'depot', montant: 200 });
    expect(depot.status).toBe(201);
    expect(depot.body.compte.solde).toBe(700);

    const retrait = await request(app).post('/api/transactions/depot-retrait')
      .set(auth(token)).send({ compteId, type: 'retrait', montant: 100 });
    expect(retrait.body.compte.solde).toBe(600);
  });

  test('retrait supérieur au solde refusé', async () => {
    const token = await connecterClient();
    const { body } = await request(app).get('/api/comptes').set(auth(token));
    const res = await request(app).post('/api/transactions/depot-retrait')
      .set(auth(token)).send({ compteId: body.comptes[0]._id, type: 'retrait', montant: 9999 });
    expect(res.status).toBe(400);
  });

  test('montant négatif refusé', async () => {
    const token = await connecterClient();
    const { body } = await request(app).get('/api/comptes').set(auth(token));
    const res = await request(app).post('/api/transactions/depot-retrait')
      .set(auth(token)).send({ compteId: body.comptes[0]._id, type: 'depot', montant: -50 });
    expect(res.status).toBe(400);
  });
});

describe('US-06 — Virement interne', () => {
  test('transfert entre deux de mes comptes', async () => {
    const token = await connecterClient();
    await request(app).post('/api/comptes').set(auth(token)).send({ type: 'epargne' });
    const { body } = await request(app).get('/api/comptes').set(auth(token));
    const [cheque, epargne] = body.comptes;

    const res = await request(app).post('/api/transactions/virement-interne')
      .set(auth(token)).send({ compteSourceId: cheque._id, compteDestId: epargne._id, montant: 150 });
    expect(res.status).toBe(201);
    expect(res.body.source.solde).toBe(350);
    expect(res.body.dest.solde).toBe(150);
  });
});

describe('US-08 — Bénéficiaires + US-07 Interac', () => {
  test('ajout d’un bénéficiaire puis virement Interac', async () => {
    const token = await connecterClient();
    const ben = await request(app).post('/api/beneficiaires')
      .set(auth(token)).send({ nom: 'Marie', coordonnees: 'marie@mail.com' });
    expect(ben.status).toBe(201);

    const { body } = await request(app).get('/api/comptes').set(auth(token));
    const res = await request(app).post('/api/transactions/interac')
      .set(auth(token)).send({
        compteSourceId: body.comptes[0]._id,
        beneficiaireId: ben.body.beneficiaire._id,
        montant: 100,
      });
    expect(res.status).toBe(201);
  });
});

describe('US-19 — Objectif d’épargne', () => {
  test('création + versement + progression', async () => {
    const token = await connecterClient();
    const obj = await request(app).post('/api/objectifs')
      .set(auth(token)).send({ nom: 'Voyage', montantCible: 1000 });
    expect(obj.status).toBe(201);

    const { body } = await request(app).get('/api/comptes').set(auth(token));
    const res = await request(app).post(`/api/objectifs/${obj.body.objectif._id}/verser`)
      .set(auth(token)).send({ montant: 250, compteSourceId: body.comptes[0]._id });
    expect(res.status).toBe(200);
    expect(res.body.objectif.progression).toBe(25);
  });
});

describe('US-20 — Notification de solde faible', () => {
  test('un retrait sous le seuil déclenche une notification', async () => {
    const token = await connecterClient();
    const params = await ParametresGlobaux.obtenir();
    params.seuilSoldeFaible = 100;
    await params.save();

    const { body } = await request(app).get('/api/comptes').set(auth(token));
    await request(app).post('/api/transactions/depot-retrait')
      .set(auth(token)).send({ compteId: body.comptes[0]._id, type: 'retrait', montant: 450 }); // solde → 50

    const notifs = await request(app).get('/api/notifications').set(auth(token));
    expect(notifs.body.notifications.length).toBeGreaterThan(0);
    expect(notifs.body.notifications[0].message).toContain('Solde faible');
  });
});

describe('US-21 / US-22 — Administration', () => {
  async function connecterAdmin() {
    await User.create({
      nom: 'Admin', email: 'admin@test.com',
      motDePasseHache: await User.hacher('Admin1234'), role: 'admin',
    });
    const login = await request(app).post('/api/auth/login')
      .send({ email: 'admin@test.com', motDePasse: 'Admin1234' });
    const verif = await request(app).post('/api/auth/verify-otp')
      .send({ tempToken: login.body.tempToken, code: login.body.codeDemo });
    return verif.body.token;
  }

  test('un client ne peut PAS accéder aux routes admin', async () => {
    const token = await connecterClient();
    const res = await request(app).get('/api/admin/parametres').set(auth(token));
    expect(res.status).toBe(403);
  });

  test('l’admin modifie le seuil de solde faible', async () => {
    const token = await connecterAdmin();
    const res = await request(app).put('/api/admin/parametres')
      .set(auth(token)).send({ seuilSoldeFaible: 250 });
    expect(res.status).toBe(200);
    expect(res.body.parametres.seuilSoldeFaible).toBe(250);
  });

  test('l’admin réinitialise un profil client', async () => {
    const tokenClient = await connecterClient();
    const tokenAdmin = await connecterAdmin();
    const clients = await request(app).get('/api/admin/clients').set(auth(tokenAdmin));
    const res = await request(app)
      .post(`/api/admin/clients/${clients.body.clients[0]._id}/reinitialiser`)
      .set(auth(tokenAdmin));
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('temporaire');
  });
});
