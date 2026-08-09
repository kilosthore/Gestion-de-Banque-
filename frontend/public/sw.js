/* Service worker TorcolBank — coquille applicative uniquement.
 *
 * RÈGLE DE SÉCURITÉ CENTRALE : rien de ce qui touche /api n'est mis en cache.
 * Soldes, transactions, jetons JWT et codes OTP ne doivent jamais persister sur
 * le disque du téléphone : un cache survit à la déconnexion et serait lisible
 * par un autre utilisateur de l'appareil. Ces requêtes passent donc directement
 * au réseau, sans interception (voir le `return` en tête de l'écouteur fetch).
 *
 * Seuls les fichiers statiques hachés par Vite (JS/CSS/images) et la page
 * d'entrée sont cachés, ce qui donne le démarrage instantané attendu d'une app
 * installée. Le nom de cache est versionné : le changer purge l'ancien.
 */
const CACHE = 'torcolbank-v1';
const COQUILLE = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  // addAll échoue en bloc si une seule URL manque : on tolère les absences pour
  // ne pas bloquer l'installation du SW sur un déploiement partiel.
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(COQUILLE.map((u) => c.add(u))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // 1) Jamais de cache pour l'API ni pour les autres origines (CDN, PayPal…).
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;
  // 2) Seules les lectures sont cachables : un POST/PUT/DELETE doit atteindre le serveur.
  if (request.method !== 'GET') return;

  // 3) Navigation (changement de page) : réseau d'abord pour toujours servir la
  //    dernière version déployée ; repli sur la coquille cachée si hors ligne.
  //    SPA : toute route inconnue retombe sur index.html, comme le fait Vercel.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((r) => r || Response.error()))
    );
    return;
  }

  // 4) Assets statiques : cache d'abord (les noms sont hachés par Vite, donc un
  //    nouveau build produit de nouvelles URL — aucun risque de servir du périmé).
  e.respondWith(
    caches.match(request).then((cachee) => {
      if (cachee) return cachee;
      return fetch(request).then((reponse) => {
        if (reponse.ok && reponse.type === 'basic') {
          const copie = reponse.clone();
          caches.open(CACHE).then((c) => c.put(request, copie));
        }
        return reponse;
      });
    })
  );
});
