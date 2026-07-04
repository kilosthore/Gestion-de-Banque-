import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Home, CreditCard, ArrowLeftRight, History, Users, PiggyBank, Coins,
  TrendingUp, Bell, User, Wrench, Wallet, Moon, Sun, LogOut, CalendarDays, Landmark, PieChart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { entreeCascade } from '../lib/animations';
import { api } from '../api/client';
import { Dock } from './ui/dock-two';
import { PopoverProfil } from './ui/popover-profil';

export default function Layout({ children }) {
  const { user, deconnecter, theme, setTheme } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [nonLues, setNonLues] = useState(0);

  // Cascade d'entrée des cartes (anime.js) à chaque changement de page
  useEffect(() => {
    const id = requestAnimationFrame(() => entreeCascade(document.querySelector('.contenu')));
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  // Alertes quasi temps réel : admins compris (alertes fraude/verrouillage),
  // rafraîchies toutes les 30 s sans bloquer la navigation.
  useEffect(() => {
    if (!user) return;
    const rafraichir = () =>
      api.get('/notifications')
        .then((d) => setNonLues(d.notifications.filter((n) => !n.lue).length))
        .catch(() => {});
    rafraichir();
    const intervalle = setInterval(rafraichir, 30000);
    return () => clearInterval(intervalle);
  }, [user, location.pathname]);

  const sortir = () => { deconnecter(); navigate('/connexion'); };

  const liens = user?.role === 'admin'
    ? [
        ['/admin', Wrench, 'Administration'],
        ['/notifications', Bell, 'Notifications'], // alertes fraude + verrouillages
        ['/profil', User, 'Mon profil'],
      ]
    : [
        ['/', Home, 'Tableau de bord'],
        ['/comptes', CreditCard, 'Mes comptes'],
        ['/operations', ArrowLeftRight, 'Opérations'],
        ['/historique', History, 'Historique'],
        ['/calendrier', CalendarDays, 'Calendrier'],
        ['/contacts', Users, 'Bénéficiaires'],
        ['/objectifs', PiggyBank, 'Épargne'],
        ['/budgets', PieChart, 'Budgets'],
        ['/prets', Coins, 'Prêts'],
        ['/produits', TrendingUp, 'Produits'],
        ['/paypal', Wallet, 'PayPal'],
        ['/notifications', Bell, 'Notifications'],
        ['/profil', User, 'Mon profil'],
      ];

  const itemsDock = user?.role === 'admin'
    ? [
        { icon: Wrench, label: 'Administration', onClick: () => navigate('/admin') },
        { icon: Bell, label: 'Notifications', onClick: () => navigate('/notifications'), badge: nonLues },
        { icon: User, label: 'Mon profil', onClick: () => navigate('/profil') },
      ]
    : [
        { icon: Home, label: 'Tableau de bord', onClick: () => navigate('/') },
        { icon: CreditCard, label: 'Mes comptes', onClick: () => navigate('/comptes') },
        { icon: ArrowLeftRight, label: 'Opérations', onClick: () => navigate('/operations') },
        { icon: History, label: 'Historique', onClick: () => navigate('/historique') },
        { icon: CalendarDays, label: 'Calendrier', onClick: () => navigate('/calendrier') },
        { icon: PieChart, label: 'Budgets', onClick: () => navigate('/budgets') },
        { icon: Wallet, label: 'PayPal', onClick: () => navigate('/paypal') },
        { icon: Bell, label: 'Notifications', onClick: () => navigate('/notifications'), badge: nonLues },
        { icon: User, label: 'Mon profil', onClick: () => navigate('/profil') },
      ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="flex items-center justify-between w-full gap-2">
          <div className="logo flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primaire-400 shrink-0" aria-hidden="true" />
            Ma Banque
          </div>
          <PopoverProfil user={user} onVoirProfil={() => navigate('/profil')} onDeconnexion={sortir} />
        </div>
        {liens.map(([chemin, Icone, libelle]) => (
          <NavLink key={chemin} to={chemin} end={chemin === '/'}
            className={({ isActive }) => `nav-lien ${isActive ? 'actif' : ''}`}>
            <Icone className="w-[18px] h-[18px] shrink-0" /> {libelle}
            {libelle === 'Notifications' && nonLues > 0 && <span className="pastille-notif">{nonLues}</span>}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button data-testid="bouton-theme" className="btn btn-secondaire flex items-center justify-center gap-2"
            onClick={() => setTheme(theme === 'clair' ? 'sombre' : 'clair')}>
            {theme === 'clair'
              ? <><Moon className="w-4 h-4" /> Mode sombre</>
              : <><Sun className="w-4 h-4" /> Mode clair</>}
          </button>
          <button data-testid="bouton-deconnexion" className="btn flex items-center justify-center gap-2" onClick={sortir}>
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </aside>
      <motion.main
        key={location.pathname}
        className="contenu pb-28"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {children}
      </motion.main>
      <div className="fixed bottom-2 left-0 right-0 z-40 pointer-events-none">
        <Dock items={itemsDock} />
      </div>
    </div>
  );
}
