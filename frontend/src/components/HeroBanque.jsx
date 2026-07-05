import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Languages, UserPlus } from 'lucide-react';
import { LampContainer } from './ui/lamp';
import { useLangue } from '../context/LangueContext';
import marqueSombre from '../assets/torcolbank-mark-sombre.svg';

/**
 * HeroBanque — page d'accueil publique.
 * Animation « Lamp » (lumière cuivre sur encre marine) qui révèle le nom
 * TorcolBank en blanc, le slogan, puis les boutons d'action.
 */
export default function HeroBanque() {
  const navigate = useNavigate();
  const { langue, setLangue, t } = useLangue();

  return (
    <div className="relative min-h-screen bg-[#0A1122]">
      {/* ─── Header : marque (gauche) + toggle langue (droite) ─── */}
      <header className="absolute top-0 inset-x-0 z-[60] flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-2.5 text-white font-bold text-lg tracking-tight">
          <img src={marqueSombre} alt="" className="w-9 h-9" aria-hidden="true" />
          <span>Torcol<span className="text-cuivre-400">Bank</span></span>
        </div>
        <button
          type="button"
          onClick={() => setLangue(langue === 'fr' ? 'en' : 'fr')}
          aria-label={t('changerLangue')}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white/80
                     hover:text-white hover:border-white/40 backdrop-blur-md
                     transition-all duration-200 font-semibold text-sm"
        >
          <Languages className="w-4 h-4" />
          {langue === 'fr' ? 'EN' : 'FR'}
        </button>
      </header>

      {/* ─── Lampe + contenu central ─── */}
      <LampContainer>
        <motion.h1
          initial={{ opacity: 0.4, y: 90 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
          className="text-white text-center font-bold tracking-tight
                     text-5xl sm:text-6xl md:text-7xl lg:text-8xl"
        >
          TorcolBank
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: 'easeInOut' }}
          className="mt-5 text-cuivre-300 italic font-medium text-center
                     text-lg sm:text-xl md:text-2xl"
        >
          « {t('slogan')} »
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8, ease: 'easeInOut' }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <button
            type="button"
            onClick={() => navigate('/connexion')}
            className="group inline-flex items-center gap-3 px-8 py-3 rounded-full
                       bg-cuivre-500 hover:bg-cuivre-400 text-white font-bold
                       shadow-[0_8px_32px_rgba(194,118,46,0.35)]
                       transition-all duration-200 hover:-translate-y-0.5
                       focus-visible:outline focus-visible:outline-2
                       focus-visible:outline-offset-2 focus-visible:outline-cuivre-300"
          >
            {t('seConnecter')}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/inscription')}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full
                       border border-white/25 text-white/90 font-semibold
                       hover:bg-white/10 hover:border-white/40 backdrop-blur-md
                       transition-all duration-200"
          >
            <UserPlus className="w-4 h-4" />
            {t('creerCompte')}
          </button>
        </motion.div>
      </LampContainer>
    </div>
  );
}
