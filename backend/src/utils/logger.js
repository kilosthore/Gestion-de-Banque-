/**
 * Logger structuré (pino) — remplace console.log dans tout le code de prod.
 * En dev : sortie colorée et lisible via pino-pretty.
 * En prod : sortie JSON ligne par ligne (ingestable par Datadog, Loki, etc.).
 */
const pino = require('pino');

const estDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (estDev ? 'debug' : 'info'),
  // Ne JAMAIS logger les champs sensibles, même par accident
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.motDePasse',
      'req.body.confirmationMotDePasse',
      'req.body.coordonnees.motDePasse',
      '*.motDePasseHache',
      '*.codeHache',
      '*.code',
      '*.tempToken',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
  ...(estDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
});

module.exports = logger;
