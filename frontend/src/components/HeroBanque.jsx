import { MeshGradient } from '@paper-design/shaders-react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sun, Moon, Languages } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLangue } from '../context/LangueContext';

/* mini-helper de classes (équiv. cn() de shadcn) */
const cx = (...parts) => parts.filter(Boolean).join(' ');

/**
 * HeroBanque — fond animé MeshGradient (jaune-orange) + filtres SVG glass/gooey.
 * - Mode sombre : fond noir derrière + mix-blend-screen pour garder le dégradé visible.
 * - Texte centré : BIENVENUE (maj/italique) + à la banque (min/italique).
 * - Boutons : toggle thème (gauche), toggle langue (droite), Se connecter (centre).
 */
export default function HeroBanque() {
  const navigate = useNavigate();
  const { theme, setTheme } = useAuth();
  const { langue, setLangue, t } = useLangue();

  const estSombre = theme === 'sombre';

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-black transition-colors duration-300">
      {/* ─── Filtres SVG : glass + gooey ─── */}
      <svg className="absolute inset-0 w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="glass-effect" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.005" numOctaves="1" seed="1" />
            <feDisplacementMap in="SourceGraphic" scale="0.5" />
            <feColorMatrix
              values="1 0 0 0 0.02
                      0 1 0 0 0.02
                      0 0 1 0 0.05
                      0 0 0 0.9 0"
              result="tint"
            />
          </filter>
          <filter id="gooey-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* ─── MeshGradient principal (jaune-orange) ─── */}
      <MeshGradient
        className={cx(
          'absolute inset-0 w-full h-full',
          estSombre && 'mix-blend-screen',
        )}
        colors={['#ffffff', '#fbbf24', '#f59e0b', '#ea580c', '#ffffff']}
        speed={0.3}
      />
      {/* ─── MeshGradient secondaire (wireframe doux) ─── */}
      <MeshGradient
        className={cx(
          'absolute inset-0 w-full h-full opacity-60',
          estSombre && 'mix-blend-screen',
        )}
        colors={['#ffffff', '#fcd34d', '#ffffff', '#f59e0b', '#ffffff']}
        speed={0.2}
        wireframe
      />

      {/* ─── Header : toggles thème (gauche) + langue (droite) ─── */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 md:px-10">
        <button
          type="button"
          onClick={() => setTheme(estSombre ? 'clair' : 'sombre')}
          aria-label={t('basculerTheme')}
          className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-current backdrop-blur-md
                     text-amber-950 hover:bg-current/10
                     transition-all duration-200 font-semibold text-sm italic"
          style={{ filter: 'url(#glass-effect)' }}
        >
          {estSombre ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="not-italic">{estSombre ? t('modeClair') : t('modeSombre')}</span>
        </button>

        <button
          type="button"
          onClick={() => setLangue(langue === 'fr' ? 'en' : 'fr')}
          aria-label={t('changerLangue')}
          className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-current backdrop-blur-md
                     text-amber-950 hover:bg-current/10
                     transition-all duration-200 font-semibold text-sm italic"
          style={{ filter: 'url(#glass-effect)' }}
        >
          <Languages className="w-4 h-4" />
          <span className="not-italic">{langue === 'fr' ? 'EN' : 'FR'}</span>
        </button>
      </header>

      {/* ─── Contenu central : titre + CTA ─── */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6
                       min-h-[calc(100vh-88px)] -mt-12">
        <h1 className="text-amber-950 leading-none">
          <span className="block font-extrabold italic uppercase tracking-tight
                           text-6xl sm:text-7xl md:text-8xl lg:text-9xl">
            {t('bienvenue')}
          </span>
          <span className="block font-medium italic lowercase mt-3
                           text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
            {t('alaBanque')}
          </span>
        </h1>

        <button
          type="button"
          onClick={() => navigate('/connexion')}
          className="group mt-12 inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full
                     border-2 border-current backdrop-blur-md
                     text-amber-950 hover:bg-current/10
                     transition-all duration-200 font-bold italic"
          style={{ filter: 'url(#glass-effect)' }}
        >
          <span>{t('seConnecter')}</span>
          <span className="flex items-center justify-center w-9 h-9 rounded-full
                           border-2 border-current
                           transition-transform group-hover:translate-x-1">
            <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      </main>
    </div>
  );
}
