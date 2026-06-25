import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, ShieldCheck, ArrowRight } from 'lucide-react';
import PixelHero from '../components/PixelHero';

/**
 * Page d'accueil publique — affiche le PixelHero
 * et une section de cartes d'actions vers les routes existantes.
 */
export default function Bienvenue() {
  const navigate = useNavigate();

  const actions = [
    {
      icone: <LogIn className="w-6 h-6" />,
      titre: 'Se connecter',
      texte: 'Accédez à vos comptes et tableau de bord en toute sécurité.',
      cta: 'Connexion',
      route: '/connexion',
    },
    {
      icone: <UserPlus className="w-6 h-6" />,
      titre: 'Créer un compte',
      texte: 'Rejoignez la Banque en quelques minutes — un compte chèque offert.',
      cta: 'Inscription',
      route: '/inscription',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PixelHero
        word1="Bienvenue"
        word2="à la Banque"
        description="Votre banque en ligne, simple, sécurisée et toujours disponible. Gérez vos comptes, suivez vos dépenses et atteignez vos objectifs financiers en quelques clics."
        primaryCta="Se connecter"
        primaryCtaMobile="Connexion"
        secondaryCta="Créer un compte"
        secondaryCtaMobile="S'inscrire"
        onPrimaryClick={() => navigate('/connexion')}
        onSecondaryClick={() => navigate('/inscription')}
      />

      {/* Section cartes d'actions */}
      <section className="px-4 py-16 md:py-24 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-amber-950 dark:text-primaire-100 mb-3">
            Commencez en quelques secondes
          </h2>
          <p className="text-amber-700 dark:text-primaire-400 text-base md:text-lg">
            Choisissez l'action qui vous convient pour démarrer votre expérience bancaire.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {actions.map((a) => (
            <button
              key={a.route}
              type="button"
              onClick={() => navigate(a.route)}
              className="text-left bg-white dark:bg-sombre-surface border-2 border-primaire-200 dark:border-sombre-bordure rounded-2xl p-6 md:p-8 shadow-ambre hover:shadow-ambre-lg hover:border-primaire-500 hover:-translate-y-1 transition-all duration-200 group"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-degrade text-white shadow-ambre">
                  {a.icone}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-amber-950 dark:text-primaire-100 mb-1">
                    {a.titre}
                  </h3>
                  <p className="text-amber-700 dark:text-primaire-400 text-sm">{a.texte}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 text-amber-700 dark:text-primaire-400 font-bold text-sm group-hover:text-primaire-600 dark:group-hover:text-primaire-300 transition-colors">
                {a.cta}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          ))}
        </div>

        {/* Bandeau sécurité */}
        <div className="mt-10 flex items-center justify-center gap-3 text-amber-700 dark:text-primaire-400 text-sm">
          <ShieldCheck className="w-5 h-5" />
          <span>Authentification en 2 étapes — vos données sont protégées.</span>
        </div>
      </section>
    </div>
  );
}
