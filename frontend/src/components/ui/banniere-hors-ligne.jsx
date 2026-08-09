import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useEnLigne } from '../../lib/useEnLigne';
import { useLangue } from '../../context/LangueContext';

/**
 * Bandeau affiché quand l'API est injoignable (PWA installée ou onglet ouvert
 * sans réseau).
 *
 * Volontairement NON bloquant : la coquille de l'app est en cache, donc l'écran
 * déjà affiché reste lisible. Masquer la page derrière un écran plein ferait
 * perdre à l'utilisateur des informations qu'il pouvait encore consulter — on
 * se contente de signaler pourquoi les données ne se rafraîchissent plus.
 *
 * `role="status"` (et non `alert`) : l'information est utile mais n'exige pas
 * d'interrompre un lecteur d'écran en pleine lecture.
 */
export default function BanniereHorsLigne() {
  const enLigne = useEnLigne();
  const { t } = useLangue();

  return (
    <AnimatePresence>
      {!enLigne && (
        <motion.div
          data-testid="banniere-hors-ligne"
          role="status"
          aria-live="polite"
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -64, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          // pt-[env(safe-area-inset-top)] : en mode installé (standalone), le
          // bandeau passerait sous l'encoche/barre d'état sans ce retrait.
          // Pastille centrée plutôt que bandeau pleine largeur : le header porte
          // le logo à gauche et le sélecteur de langue à droite — un bandeau les
          // recouvrirait. Le centre est libre, la pastille s'y loge sans rien masquer.
          // pt-[env(safe-area-inset-top)] : en mode installé (standalone), le
          // contenu passerait sous l'encoche / la barre d'état sans ce retrait.
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center
                     px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]"
        >
          <div className="pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2
                          text-sm font-medium text-white shadow-lg
                          bg-cuivre-500/95 backdrop-blur-sm ring-1 ring-white/15">
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t('horsLigne')}</span>
            <span className="hidden text-white/80 sm:inline">— {t('horsLigneDetail')}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
