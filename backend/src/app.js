const express = require('express');
require('express-async-errors'); // les erreurs des handlers async remontent au middleware d'erreurs
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

/* ─── Sécurité ───────────────────────────────────────────── */
// Derrière un reverse proxy (Render, Railway, nginx…), req.ip doit refléter
// le client réel : indispensable pour le rate-limiting ET l'audit trail.
if (isProd) app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // 'unsafe-inline' requis pour les attributs style= de React/recharts ;
      // les scripts inline restent interdits (protection XSS principale).
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],            // data: pour l'aperçu des chèques en base64
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));

// En dev, le frontend tourne sur :5173 et nécessite CORS pour appeler :5000.
// En prod, frontend + backend = même origine → CORS inutile.
if (!isProd) {
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
}

app.use(express.json({ limit: '2mb' }));             // 2 Mo pour la photo de chèque
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,                                        // limite globale
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
  })
);

/* ─── Routes API ─────────────────────────────────────────── */
app.get('/api/sante', (req, res) => res.json({ statut: 'OK', date: new Date() }));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/comptes', require('./routes/comptes.routes'));
app.use('/api/transactions', require('./routes/transactions.routes'));
app.use('/api/prets', require('./routes/prets.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api', require('./routes/divers.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

/* ─── 404 pour les routes /api inconnues ─────────────────── */
// On garde le 404 JSON UNIQUEMENT pour les routes /api/*.
// Les autres routes (ex: /dashboard, /login) seront gérées par le frontend ci-dessous.
app.use('/api', (req, res) => res.status(404).json({ message: 'Route API introuvable' }));

/* ─── Frontend en production ─────────────────────────────── */
if (isProd) {
  const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');

  // 1. Sert les fichiers statiques (JS, CSS, images…) générés par Vite
  app.use(express.static(frontendDist));

  // 2. SPA fallback : toute route non-API renvoie index.html
  // React Router prend ensuite le relais côté client
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

/* ─── Gestion d'erreurs ──────────────────────────────────── */
const logger = require('./utils/logger');
app.use((err, req, res, next) => {
  logger.error({ err: err.message, stack: err.stack, path: req.originalUrl }, 'erreur_serveur');
  res.status(500).json({ message: 'Erreur serveur' });
});

module.exports = app;
