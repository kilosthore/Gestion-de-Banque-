/**
 * Animations globales (anime.js v4) — thème « Verre Obsidienne & Or ».
 * Branché une seule fois dans Layout : toutes les pages en héritent.
 * Chaque helper respecte prefers-reduced-motion (accessibilité).
 */
import { animate, stagger } from 'animejs';

const mouvementsReduits = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Entrée en cascade des cartes de la page (remplace l'apparition CSS uniforme). */
export function entreeCascade(scope = document) {
  if (mouvementsReduits() || !scope) return;
  const cibles = scope.querySelectorAll('.carte');
  if (!cibles.length) return;
  cibles.forEach((el) => { el.style.animation = 'none'; }); // coupe l'apparition CSS pour éviter le double jeu
  animate(cibles, {
    opacity: [0, 1],
    translateY: [18, 0],
    scale: [0.98, 1],
    delay: stagger(70, { start: 60 }),
    duration: 550,
    ease: 'outExpo',
  });
}

/**
 * Compteur animé pour un montant (ex : solde du tableau de bord).
 * Usage : compterMontant(ref.current, 12450.5, { suffixe: ' $' })
 */
export function compterMontant(el, valeur, { duree = 900, decimales = 2, suffixe = '' } = {}) {
  if (!el) return;
  const formater = (v) =>
    v.toLocaleString('fr-CA', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }) + suffixe;
  if (mouvementsReduits()) { el.textContent = formater(valeur); return; }
  const etat = { v: 0 };
  animate(etat, {
    v: valeur,
    duration: duree,
    ease: 'outCubic',
    onUpdate: () => { el.textContent = formater(etat.v); },
  });
}
