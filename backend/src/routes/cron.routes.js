const router = require('express').Router();
const { executerRecurrentes, purger } = require('../utils/recurrence');
const logger = require('../utils/logger');

/**
 * Déclenche les tâches planifiées (transactions récurrentes US-17 + purge des
 * OTP/tokens révoqués) en environnement serverless, où setInterval() ne
 * survit pas entre deux invocations. Appelé par un Vercel Cron Job
 * (vercel.json) — protégé par un secret partagé, PAS par une session
 * utilisateur (adminOnly suppose un JWT humain, inadapté à un appel
 * automatisé sans utilisateur connecté).
 */
router.get('/taches-planifiees', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const fourni = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!secret || fourni !== secret) {
    return res.status(401).json({ message: 'Non autorisé' });
  }
  await executerRecurrentes();
  await purger();
  logger.info({}, 'taches_planifiees_executees');
  res.json({ ok: true, executeA: new Date() });
});

module.exports = router;
