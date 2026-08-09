/** Petit client HTTP avec gestion du jeton JWT */
const API = '/api';

function token() {
  return sessionStorage.getItem('token'); // sessionStorage : effacé à la fermeture (sécurité)
}

async function requete(chemin, options = {}) {
  let res;
  try {
    res = await fetch(`${API}${chemin}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    // fetch ne rejette que sur échec réseau (pas sur un 4xx/5xx). Sans ce
    // rattrapage, l'utilisateur hors ligne voit « Failed to fetch », illisible.
    // La langue est lue depuis localStorage, seule source disponible ici :
    // ce module n'est pas un composant et n'accède pas à LangueContext.
    const fr = (localStorage.getItem('langue') || 'fr') === 'fr';
    throw new Error(fr
      ? 'Hors ligne : vérifiez votre connexion, puis réessayez.'
      : 'Offline: check your connection, then try again.');
  }
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
