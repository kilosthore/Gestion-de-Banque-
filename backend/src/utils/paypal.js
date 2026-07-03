/**
 * Client REST PayPal (sandbox) — OAuth2 + création/capture de commandes.
 * Utilitaire ADDITIF : aucune dépendance nouvelle (fetch natif Node 18+).
 */
const BASE = () => process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

function paypalConfigure() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

async function tokenAcces() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');
  const rep = await fetch(`${BASE()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await rep.json().catch(() => ({}));
  if (!rep.ok) throw new Error(data.error_description || 'Authentification PayPal échouée');
  return data.access_token;
}

async function appelPaypal(chemin, corps) {
  const token = await tokenAcces();
  const rep = await fetch(`${BASE()}${chemin}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const data = await rep.json().catch(() => ({}));
  if (!rep.ok) {
    throw new Error(data.details?.[0]?.description || data.message || `Erreur PayPal (${rep.status})`);
  }
  return data;
}

/** Crée une commande PayPal (intent CAPTURE) et retourne la réponse PayPal */
function creerCommande(montant, devise, description, referenceId) {
  return appelPaypal('/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: referenceId,
      description: (description || '').slice(0, 127),
      amount: { currency_code: devise, value: montant.toFixed(2) },
    }],
  });
}

/** Capture une commande approuvée par l'acheteur */
function capturerCommande(orderId) {
  return appelPaypal(`/v2/checkout/orders/${orderId}/capture`);
}

module.exports = { paypalConfigure, creerCommande, capturerCommande };
