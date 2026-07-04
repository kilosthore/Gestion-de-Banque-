/**
 * Catégorisation automatique des transactions (idée « budgets intelligents »).
 * Moteur à mots-clés sur la description — volontairement simple, transparent
 * et déterministe : chaque règle est lisible et testable. Une transaction
 * qui ne matche rien tombe dans « autre ».
 */

const CATEGORIES = [
  'revenus', 'epicerie', 'restaurants', 'logement', 'transport',
  'abonnements', 'sante', 'loisirs', 'virements', 'autre',
];

/* Mots-clés (sans accents, minuscules) → catégorie. Ordre = priorité. */
const REGLES = [
  ['epicerie', ['epicerie', 'supermarche', 'marche', 'metro', 'iga', 'provigo', 'maxi', 'costco', 'walmart', 'super c', 'adonis']],
  ['restaurants', ['restaurant', 'resto', 'cafe', 'pizza', 'sushi', 'mcdo', 'mcdonald', 'tim horton', 'starbucks', 'subway', 'burger', 'poutine', 'livraison repas', 'uber eats', 'doordash']],
  ['logement', ['loyer', 'hypotheque', 'hydro', 'electricite', 'chauffage', 'internet maison', 'assurance habitation', 'condo', 'videotron', 'bell ']],
  ['transport', ['essence', 'stm', 'opus', 'stationnement', 'uber', 'taxi', 'garage', 'auto', 'assurance auto', 'transport', 'train', 'vol ', 'avion']],
  ['abonnements', ['netflix', 'spotify', 'disney', 'abonnement', 'prime', 'icloud', 'gym', 'forfait', 'cellulaire', 'fizz', 'koodo']],
  ['sante', ['pharmacie', 'jean coutu', 'pharmaprix', 'dentiste', 'clinique', 'medecin', 'optometriste', 'lunettes', 'physio']],
  ['loisirs', ['cinema', 'concert', 'jeu', 'steam', 'playstation', 'xbox', 'librairie', 'voyage', 'hotel', 'spectacle', 'sport']],
];

/** Retire les accents et met en minuscules pour un matching robuste. */
const normaliser = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * @param {string} description  description libre de la transaction
 * @param {string} type         virement | interac | paiement | depot | retrait
 * @param {string} sens         debit | credit
 * @returns {string} catégorie budgétaire
 */
function categoriser(description, type, sens) {
  // L'argent qui ENTRE est un revenu (salaire, dépôt, remboursement…)
  if (sens === 'credit' && (type === 'depot' || type === 'virement' || type === 'interac')) {
    return 'revenus';
  }
  const desc = normaliser(description);
  for (const [categorie, motsCles] of REGLES) {
    if (motsCles.some((mot) => desc.includes(mot))) return categorie;
  }
  // Mouvements entre comptes sans description parlante
  if (type === 'virement') return 'virements';
  return 'autre';
}

module.exports = { categoriser, CATEGORIES };
