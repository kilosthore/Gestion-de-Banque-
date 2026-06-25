const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { RevokedToken } = require('../models');

/** Vérifie le JWT complet (émis APRÈS validation OTP) + vérifie la blacklist E1 */
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Non authentifié' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.etape !== 'complet') {
      return res.status(401).json({ message: 'Validation OTP requise' });
    }

    // E1 — Vérification blacklist : un token révoqué (déconnexion) ne doit plus passer
    if (payload.jti) {
      const revoque = await RevokedToken.findOne({ where: { jti: payload.jti } });
      if (revoque) return res.status(401).json({ message: 'Session révoquée, reconnectez-vous' });
    }

    const user = await User.findByPk(payload.id);
    if (!user) return res.status(401).json({ message: 'Utilisateur introuvable' });

    req.user = user;
    req.tokenPayload = payload; // pour /logout
    next();
  } catch {
    return res.status(401).json({ message: 'Session expirée, reconnectez-vous' });
  }
}

/** Réservé à l'administrateur (US-21, US-22) */
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé à l’administrateur' });
  }
  next();
}

module.exports = { protect, adminOnly };
