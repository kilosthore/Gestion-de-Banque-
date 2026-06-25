/** Petit client HTTP avec gestion du jeton JWT */
const API = '/api';

function token() {
  return sessionStorage.getItem('token'); // sessionStorage : effacé à la fermeture (sécurité)
}

async function requete(chemin, options = {}) {
  const res = await fetch(`${API}${chemin}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token()) {
      sessionStorage.clear();
      window.location.href = '/connexion';
    }
    throw new Error(data.message || 'Erreur réseau');
  }
  return data;
}

export const api = {
  get: (c) => requete(c),
  post: (c, body) => requete(c, { method: 'POST', body }),
  put: (c, body) => requete(c, { method: 'PUT', body }),
  del: (c) => requete(c, { method: 'DELETE' }),
};
