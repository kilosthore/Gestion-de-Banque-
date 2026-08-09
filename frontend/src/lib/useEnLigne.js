import { useCallback, useEffect, useState } from 'react';

/**
 * Suit l'état de la connexion réseau.
 *
 * `navigator.onLine` seul est peu fiable : il signale « en ligne » dès qu'une
 * interface réseau existe, même sans accès Internet réel (Wi-Fi capté mais
 * passerelle injoignable, portail captif d'hôtel…). On complète donc l'événement
 * natif par une vérification active contre notre propre API.
 *
 * Un 4xx/5xx ne compte PAS comme hors ligne : le serveur a répondu, donc le
 * réseau fonctionne. Seul un `fetch` qui rejette (aucune réponse) le prouve.
 * Une API en panne est un autre problème, qui mérite un autre message.
 *
 * @returns {boolean} true si l'API est joignable, false sinon
 */
export function useEnLigne() {
  const [enLigne, setEnLigne] = useState(() => navigator.onLine);

  const verifier = useCallback(async () => {
    if (!navigator.onLine) {
      setEnLigne(false);
      return;
    }
    try {
      // `no-store` : une réponse mémorisée ferait croire à tort au retour du réseau.
      await fetch('/api/sante', { method: 'GET', cache: 'no-store' });
      setEnLigne(true);
    } catch {
      setEnLigne(false);
    }
  }, []);

  // Écouteurs natifs : montés une seule fois. Les garder hors de l'effet de
  // sondage évite de les désabonner/réabonner à chaque bascule d'état.
  useEffect(() => {
    const passerHorsLigne = () => setEnLigne(false);
    window.addEventListener('online', verifier);
    window.addEventListener('offline', passerHorsLigne);
    verifier();
    return () => {
      window.removeEventListener('online', verifier);
      window.removeEventListener('offline', passerHorsLigne);
    };
  }, [verifier]);

  // Sondage UNIQUEMENT pendant une coupure, pour détecter le retour du réseau
  // quand l'événement `online` ne se déclenche pas (fréquent sur mobile).
  // Sonder en permanence viderait batterie et forfait : en ligne, les
  // événements natifs suffisent.
  useEffect(() => {
    if (enLigne) return undefined;
    const intervalle = setInterval(verifier, 15000);
    return () => clearInterval(intervalle);
  }, [enLigne, verifier]);

  return enLigne;
}
