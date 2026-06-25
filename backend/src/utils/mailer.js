const nodemailer = require('nodemailer');

/**
 * Envoi du code OTP par email (Nodemailer).
 * Si SMTP n'est pas configuré, on bascule en mode démo :
 * le code est affiché dans la console serveur.
 */
function smtpConfigure() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function envoyerOtp(email, code) {
  if (!smtpConfigure()) {
    console.log(`📩 [MODE DÉMO] Code OTP pour ${email} : ${code}`);
    return { envoye: false, demo: true };
  }
  const transporteur = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporteur.sendMail({
    from: `"Ma Banque" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Votre code de vérification',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #fed7aa;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#f59e0b,#f97316);padding:20px;color:#fff">
          <h2 style="margin:0">🏦 Ma Banque</h2>
        </div>
        <div style="padding:24px">
          <p>Bonjour,</p>
          <p>Votre code de vérification à 6 chiffres :</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#ea580c;text-align:center">${code}</p>
          <p style="color:#777">Ce code expire dans <b>5 minutes</b>. Ne le partagez jamais.</p>
        </div>
      </div>`,
  });
  return { envoye: true, demo: false };
}

/**
 * Envoi du mot de passe temporaire (réinitialisation par l'administrateur).
 * Sans SMTP : log console serveur uniquement (jamais retourné dans la réponse HTTP).
 */
async function envoyerMdpTemporaire(email, motDePasseTemporaire) {
  if (!smtpConfigure()) {
    console.log(`📩 [MODE DÉMO] Mot de passe temporaire pour ${email} : ${motDePasseTemporaire}`);
    return { envoye: false, demo: true };
  }
  const transporteur = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporteur.sendMail({
    from: `"Ma Banque" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #fed7aa;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#f59e0b,#f97316);padding:20px;color:#fff">
          <h2 style="margin:0">🏦 Ma Banque</h2>
        </div>
        <div style="padding:24px">
          <p>Bonjour,</p>
          <p>Un administrateur a réinitialisé votre profil. Votre <b>mot de passe temporaire</b> est :</p>
          <p style="font-size:22px;font-weight:bold;letter-spacing:2px;color:#ea580c;text-align:center;background:#fff7ed;padding:12px;border-radius:8px">${motDePasseTemporaire}</p>
          <p style="color:#777">Connectez-vous puis changez-le immédiatement depuis votre profil. Ne partagez jamais ce mot de passe.</p>
        </div>
      </div>`,
  });
  return { envoye: true, demo: false };
}

module.exports = { envoyerOtp, envoyerMdpTemporaire, smtpConfigure };
