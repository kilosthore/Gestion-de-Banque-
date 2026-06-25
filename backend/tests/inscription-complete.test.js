/**
 * Test — Phase 5A / US-25 — Inscription bancaire complète (wizard 6 étapes)
 *
 * Vérifie :
 *  - Validation JSON Schema (champ manquant, format invalide, énum invalide)
 *  - Règles conditionnelles (salarié → employeur obligatoire)
 *  - Vérification âge majeur (18+)
 *  - Création utilisateur en statut 'en_verification' + numéro de dossier
 *  - Connexion bloquée tant que statut != 'actif'
 *  - Workflow admin : validation → 'actif' + compte chèque créé
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { sequelize, User, Compte, Notification } = require('../src/models');
const { connectDB } = require('../src/config/db');
const app = require('../src/app');
const jwt = require('jsonwebtoken');

const inscriptionValide = () => ({
  informationsPersonnelles: {
    civilite: 'M.',
    prenom: 'Jean',
    nom: 'Dupont',
    dateNaissance: '1990-05-15',
    nationalite: 'Canadienne',
    lieuNaissance: 'Montréal',
  },
  coordonnees: {
    adresseRue: '123 rue Sainte-Catherine',
    adresseVille: 'Montréal',
    adresseCodePostal: 'H2X 1Z4',
    adressePays: 'Canada',
    telephoneIndicatif: '+1',
    telephoneNumero: '514 555-1234',
    email: `wizard-${Date.now()}@test.local`,
    motDePasse: 'MotDePasse1',
  },
  informationsPro: {
    statutPro: 'salarie',
    nomEmployeur: 'Acme Inc.',
    dateEmbauche: '2020-01-15',
    typeContrat: 'CDI',
    revenuMensuelNet: 4500,
    chargesMensuelles: 1200,
  },
  produit: {
    typeCompte: 'cheque',
    decouvertAutorise: false,
    demandeCarte: false,
  },
  kyc: {
    personnePolitiquementExposee: false,
    doubleNationalite: false,
    origineFonds: 'salaire',
    residentFiscalUSA: false,
  },
  documents: {
    pieceIdentiteNom: 'cni.pdf',
    justificatifDomicileNom: 'facture-edf.pdf',
  },
  consentements: {
    cgu: true,
    confidentialite: true,
    prelevementAutorisation: true,
  },
});

let tokenAdmin;

beforeAll(async () => {
  await connectDB();
  await Compte.destroy({ where: {} });
  await Notification.destroy({ where: {} });
  await User.destroy({ where: {} });

  const admin = await User.create({
    nom: 'Admin', email: `admin-wiz-${Date.now()}@test.local`,
    motDePasseHache: 'hash', role: 'admin', statutDossier: 'actif',
  });
  tokenAdmin = jwt.sign({ id: admin._id, role: 'admin', etape: 'complet' }, process.env.JWT_SECRET, { expiresIn: '5m' });
}, 30000);

afterAll(async () => {
  await sequelize.close();
});

test('Inscription valide → 201 + numéro de dossier + statut en_verification', async () => {
  const r = await request(app)
    .post('/api/auth/register-complet')
    .send(inscriptionValide());
  expect(r.status).toBe(201);
  expect(r.body.numeroDossier).toMatch(/^DOS-\d{4}-\d{6}$/);

  const user = await User.findOne({ where: { numeroDossier: r.body.numeroDossier } });
  expect(user.statutDossier).toBe('en_verification');
});

test('Inscription invalide : email manquant → 400', async () => {
  const data = inscriptionValide();
  delete data.coordonnees.email;
  const r = await request(app).post('/api/auth/register-complet').send(data);
  expect(r.status).toBe(400);
  expect(r.body.erreurs.some((e) => e.includes('email'))).toBe(true);
});

test('Inscription invalide : mot de passe trop faible → 400', async () => {
  const data = inscriptionValide();
  data.coordonnees.motDePasse = 'faible';
  const r = await request(app).post('/api/auth/register-complet').send(data);
  expect(r.status).toBe(400);
});

test('Règle conditionnelle : salarié sans employeur → 400', async () => {
  const data = inscriptionValide();
  delete data.informationsPro.nomEmployeur;
  const r = await request(app).post('/api/auth/register-complet').send(data);
  expect(r.status).toBe(400);
});

test('Mineur (< 18 ans) → 400', async () => {
  const data = inscriptionValide();
  data.coordonnees.email = `mineur-${Date.now()}@test.local`;
  data.informationsPersonnelles.dateNaissance = new Date(Date.now() - 10 * 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const r = await request(app).post('/api/auth/register-complet').send(data);
  expect(r.status).toBe(400);
  expect(r.body.message).toMatch(/majeur/i);
});

test('Connexion bloquée tant que dossier en_verification', async () => {
  const data = inscriptionValide();
  data.coordonnees.email = `bloque-${Date.now()}@test.local`;
  await request(app).post('/api/auth/register-complet').send(data);

  const r = await request(app).post('/api/auth/login').send({
    email: data.coordonnees.email,
    motDePasse: data.coordonnees.motDePasse,
  });
  expect(r.status).toBe(403);
  expect(r.body.message).toMatch(/vérification/i);
});

test('Workflow admin : valider dossier → user actif + compte chèque 500$', async () => {
  const data = inscriptionValide();
  data.coordonnees.email = `valider-${Date.now()}@test.local`;
  const reg = await request(app).post('/api/auth/register-complet').send(data);
  const numeroDossier = reg.body.numeroDossier;
  const user = await User.findOne({ where: { numeroDossier } });

  const r = await request(app)
    .put(`/api/admin/dossiers/${user._id}`)
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ statut: 'actif' });
  expect(r.status).toBe(200);
  expect(r.body.user.statutDossier).toBe('actif');
  expect(r.body.compte.type).toBe('cheque');
  expect(r.body.compte.solde).toBe(500);

  // Maintenant la connexion fonctionne
  const login = await request(app).post('/api/auth/login').send({
    email: data.coordonnees.email,
    motDePasse: data.coordonnees.motDePasse,
  });
  expect(login.status).toBe(200);
  expect(login.body.tempToken).toBeTruthy();
});
