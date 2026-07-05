import { motion, useReducedMotion } from 'framer-motion';

/**
 * CheminsFlottants — rubans SVG animés (adapté du composant « Background Paths »).
 * Marine en mode clair, cuivre en mode sombre (via currentColor + classes Tailwind).
 * Si l'utilisateur préfère les mouvements réduits, les tracés restent statiques.
 */
function CheminsFlottants({ position }) {
  const mouvementReduit = useReducedMotion();

  const chemins = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="w-full h-full text-primaire-600 dark:text-cuivre-400"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {chemins.map((chemin) => (
          <motion.path
            key={chemin.id}
            d={chemin.d}
            stroke="currentColor"
            strokeWidth={chemin.width}
            strokeOpacity={0.04 + chemin.id * 0.012}
            initial={{ pathLength: 0.3, opacity: 0.5 }}
            animate={
              mouvementReduit
                ? { pathLength: 1, opacity: 0.35 }
                : {
                    pathLength: 1,
                    opacity: [0.2, 0.5, 0.2],
                    pathOffset: [0, 1, 0],
                  }
            }
            transition={
              mouvementReduit
                ? { duration: 0 }
                : {
                    duration: 20 + Math.random() * 10,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'linear',
                  }
            }
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * FondAnime — couche plein écran à poser derrière le contenu de n'importe
 * quelle page (position fixed, aucune interaction). Passer la classe z-*
 * adaptée au contexte d'empilement de la page hôte :
 * « -z-10 » dans le Layout (contexte .app), « z-0 » sur l'écran d'auth.
 */
export default function FondAnime({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      <CheminsFlottants position={1} />
      <CheminsFlottants position={-1} />
    </div>
  );
}

export { CheminsFlottants };
