/**
 * Tests — Alertes fraude, budgets intelligents, verrouillage + code temporaire.
 * Couvre les trois fonctionnalités « vraie banque » :
 *  1. 5 échecs de connexion → verrouillage + alerte aux admins
 *  2. Réinitialisation admin → code 6 chiffres + changement obligatoire
 *  3. Catégorisation automatique + enveloppes budgétaires + rapport
 *  4. Moteur anti-fraude (montant élevé, nouvelle IP)
 */
const request = require('supertest');
const { ouvrirBase, viderBase, fermerBase } = require('./setup');
const app = require('../src/app');
const { User, Compte, Transaction, Notification, Budget } = require('../src/models');
const { evaluerRisque } = require('../src/utils/fraude');
const { categoriser } = require('../src/utils/categoriser');

beforeAll(ouvrirBase);
beforeEach(viderBase);
afterAll(fermerBase);

const CLIENT = { nom: 'Test', prenom: 'Ana', email: 'ana@test.com', motDePasse: 'Secure123' };
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function creerAdmin() {
  return User.create({
    nom: 'Admin', email: 'admin@test.com', role: 'admin',
    motDePasseHache: await User.hacher('Admin1234A'),
  });
}

async function connecter(email, motDePasse) {
  const login = await request(app).post('/api/auth/login').send({ email, motDePasse });
  const verif = await request(app).post('/api/auth/verify-otp')
    .send({ tempToken: login.body.tempToken, code: login.body.codeDemo });
  return verif.body;
}

describe('Verrouillage après 5 échecs + alerte admin', () => {
  test('verrouille le compte, prévient les admins, message explicite', async () => {
    await creerAdmin();
    await request(app).post('/api/auth/register').send(CLIENT);

    let derniere;
    for (let i = 0; i < 5; i++) {
      derniere = await request(app).post('/api/auth/login')
        .send({ email: CLIENT.email, motDePasse: 'Mauvais123' });
    }
    expect(derniere.status).toBe(401);
    expect(derniere.body.message).toMatch(/verrouillé/i);
    expect(derniere.body.message).toMatch(/code temporaire/i);

    // Le compte est bien verrouillé, même avec le BON mot de passe
    const bloque = await request(app).post('/api/auth/login')
      .send({ email: CLIENT.email, motDePasse: CLIENT.motDePasse });
    expect(bloque.status).toBe(423);

    // L'admin a reçu l'alerte de verrouillage
    const admin = await User.findOne({ where: { role: 'admin' } });
    const alertes = await Notification.findAll({ where: { client: admin._id } });
    expect(alertes.some((n) => n.message.includes('verrouillage') && n.message.includes(CLIENT.email))).toBe(true);
  });
});

describe('Code temporaire à 6 chiffres délivré par l’admin', () => {
  test('réinitialisation → connexion avec le code → changement obligatoire', async () => {
    await creerAdmin();
    await request(app).post('/api/auth/register').send(CLIENT);
    const { token: tokenAdmin } = await connecter('admin@test.com', 'Admin1234A');
    const client = await User.findOne({ where: { email: CLIENT.email } });

    // L'admin réinitialise : en mode démo (pas de SMTP) le code est exposé
    const reinit = await request(app)
      .post(`/api/admin/clients/${client._id}/reinitialiser`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(reinit.status).toBe(200);
    expect(reinit.body.codeTemporaireDemo).toMatch(/^\d{6}$/);

    // Le client se connecte avec le code à 6 chiffres → drapeau levé
    const session = await connecter(CLIENT.email, reinit.body.codeTemporaireDemo);
    expect(session.user.doitChangerMotDePasse).toBe(true);

    // L'ancien code ne peut pas rester : changement de mot de passe
    const changement = await request(app).post('/api/auth/changer-mot-de-passe')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ ancienMotDePasse: reinit.body.codeTemporaireDemo, nouveauMotDePasse: 'NouveauMdp9' });
    expect(changement.status).toBe(200);

    const apres = await connecter(CLIENT.email, 'NouveauMdp9');
    expect(apres.user.doitChangerMotDePasse).toBe(false);
  });

  test('refuse un nouveau mot de passe trop faible', async () => {
    await request(app).post('/api/auth/register').send(CLIENT);
    const { token } = await connecter(CLIENT.email, CLIENT.motDePasse);
    const res = await request(app).post('/api/auth/changer-mot-de-passe')
      .set('Authorization', `Bearer ${token}`)
      .send({ ancienMotDePasse: CLIENT.motDePasse, nouveauMotDePasse: 'faible' });
    expect(res.status).toBe(400);
  });
});

describe('Budgets intelligents', () => {
  test('catégorise automatiquement les transactions à la création', async () => {
    expect(categoriser('Épicerie Metro', 'paiement', 'debit')).toBe('epicerie');
    expect(categoriser('Salaire juillet', 'depot', 'credit')).toBe('revenus');
    expect(categoriser('Netflix', 'paiement', 'debit')).toBe('abonnements');

    await request(app).post('/api/auth/register').send(CLIENT);
    const client = await User.findOne({ where: { email: CLIENT.email } });
    const compte = await Compte.findOne({ where: { proprietaire: client._id } });
    const tx = await Transaction.create({
      compte: compte._id, client: client._id, type: 'paiement',
      montant: 42, sens: 'debit', description: 'Restaurant Chez Mario',
    });
    expect(tx.categorie).toBe('restaurants'); // hook beforeCreate
  });

  test('enveloppe : création, suivi des dépenses et alerte de dépassement', async () => {
    await request(app).post('/api/auth/register').send(CLIENT);
    const { token } = await connecter(CLIENT.email, CLIENT.motDePasse);
    const client = await User.findOne({ where: { email: CLIENT.email } });
    const compte = await Compte.findOne({ where: { proprietaire: client._id } });

    // Enveloppe épicerie : 100 $/mois
    const creation = await request(app).post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categorie: 'epicerie', plafond: 100 });
    expect(creation.status).toBe(201);

    // Dépense de 150 $ → dépassement → notification (hook afterCreate, best effort)
    await Transaction.create({
      compte: compte._id, client: client._id, type: 'paiement',
      montant: 150, sens: 'debit', description: 'Épicerie IGA',
    });
    await attendre(400); // le hook s'exécute hors requête (setImmediate)

    const liste = await request(app).get('/api/budgets')
      .set('Authorization', `Bearer ${token}`);
    expect(liste.status).toBe(200);
    const env = liste.body.budgets.find((b) => b.categorie === 'epicerie');
    expect(env.depense).toBe(150);
    expect(env.plafond).toBe(100);

    const notifs = await Notification.findAll({ where: { client: client._id } });
    expect(notifs.some((n) => n.message.includes('Budget dépassé — epicerie'))).toBe(true);

    // Rapport mensuel
    const mois = new Date().toISOString().slice(0, 7);
    const rapport = await request(app).get(`/api/budgets/rapport?mois=${mois}`)
      .set('Authorization', `Bearer ${token}`);
    expect(rapport.status).toBe(200);
    const ligne = rapport.body.lignes.find((l) => l.categorie === 'epicerie');
    expect(ligne.depassement).toBe(true);
  });

  test('refuse une catégorie inconnue ou un plafond invalide', async () => {
    await request(app).post('/api/auth/register').send(CLIENT);
    const { token } = await connecter(CLIENT.email, CLIENT.motDePasse);
    const mauvaiseCat = await request(app).post('/api/budgets')
      .set('Authorization', `Bearer ${token}`).send({ categorie: 'crypto', plafond: 100 });
    expect(mauvaiseCat.status).toBe(400);
    const mauvaisPlafond = await request(app).post('/api/budgets')
      .set('Authorization', `Bearer ${token}`).send({ categorie: 'loisirs', plafond: -5 });
    expect(mauvaisPlafond.status).toBe(400);
  });
});

describe('Moteur anti-fraude', () => {
  test('R1 — montant élevé : alerte le client ET les admins', async () => {
    await creerAdmin();
    await request(app).post('/api/auth/register').send(CLIENT);
    const client = await User.findOne({ where: { email: CLIENT.email } });

    await evaluerRisque({
      userId: client._id, action: 'transaction.depot_retrait',
      ip: '203.0.113.7', montant: 6000,
    });

    const admin = await User.findOne({ where: { role: 'admin' } });
    const [notifsClient, notifsAdmin] = await Promise.all([
      Notification.findAll({ where: { client: client._id } }),
      Notification.findAll({ where: { client: admin._id } }),
    ]);
    expect(notifsClient.some((n) => n.message.includes('montant élevé'))).toBe(true);
    expect(notifsAdmin.some((n) => n.message.includes('montant élevé'))).toBe(true);
  });

  test('R4 — nouvelle IP signalée, IP connue silencieuse', async () => {
    await request(app).post('/api/auth/register').send(CLIENT);
    const client = await User.findOne({ where: { email: CLIENT.email } });
    const { AuditLog } = require('../src/models');

    // Historique : 3 opérations depuis l'IP habituelle
    for (let i = 0; i < 3; i++) {
      await AuditLog.create({ userId: client._id, action: 'transaction.depot_retrait', ipAddress: '198.51.100.1', payload: {} });
    }

    // IP habituelle → aucune alerte « nouvel appareil »
    await evaluerRisque({ userId: client._id, action: 'transaction.depot_retrait', ip: '198.51.100.1', montant: 10 });
    let notifs = await Notification.findAll({ where: { client: client._id } });
    expect(notifs.some((n) => n.message.includes('nouvel appareil'))).toBe(false);

    // IP inconnue (une seule entrée d'audit = l'opération courante) → alerte
    await AuditLog.create({ userId: client._id, action: 'transaction.depot_retrait', ipAddress: '203.0.113.99', payload: {} });
    await evaluerRisque({ userId: client._id, action: 'transaction.depot_retrait', ip: '203.0.113.99', montant: 10 });
    notifs = await Notification.findAll({ where: { client: client._id } });
    expect(notifs.some((n) => n.message.includes('nouvel appareil'))).toBe(true);
  });
});
