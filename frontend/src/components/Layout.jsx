import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Home, CreditCard, ArrowLeftRight, History, Users, PiggyBank, Coins,
  TrendingUp, Bell, User, Wrench, Wallet, Moon, Sun, LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Dock } from './ui/dock-two';
import { PopoverProfil } from './ui/popover-profil';

export default function Layout({ children }) {
  const { user, deconnecter, theme, setTheme } = useAuth();
  const navigate = useNavigate();
  const [nonLues, setNonLues] = useState(0);

  useEffect(() => {
    if (user?.role !== 'client') return;
    api.get('/notifications')
      .then((d) => setNonLues(d.notifications.filter((n) => !n.lue).length))
      .catch(() => {});
  }, [user]);

  const sortir = () => { deconnecter(); navigate('/connexion'); };

  const liens = user?.role === 'admin'
    ? [
        ['/admin', Wrench, 'Administration'],
        ['/profil', User, 'Mon profil'],
      ]
    : [
        ['/', Home, 'Tableau de bord'],
        ['/comptes', CreditCard, 'Mes comptes'],
        ['/operations', ArrowLeftRight, 'Opérations'],
        ['/historique', History, 'Historique'],
        ['/contacts', Users, 'Bénéficiaires'],
        ['/objectifs', PiggyBank, 'Épargne'],
        ['/prets', Coins, 'Prêts'],
        ['/produits', TrendingUp, 'Produits'],
        ['/paypal', Wallet, 'PayPal'],
        ['/notifications', Bell, 'Notifications'],
        ['/profil', User, 'Mon profil'],
      ];

  const itemsDock = user?.role === 'admin'
    ? [
        { icon: Wrench, label: 'Administration', onClick: () => navigate('/admin') },
        { icon: User, label: 'Mon profil', onClick: () => navigate('/profil') },
      ]
    : [
        { icon: Home, label: 'Tableau de bord', onClick: () => navigate('/') },
        { icon: CreditCard, label: 'Mes comptes', onClick: () => navigate('/comptes') },
        { icon: ArrowLeftRight, label: 'Opérations', onClick: () => navigate('/operations') },
        { icon: History, label: 'Historique', onClick: () => navigate('/historique') },
        { icon: Wallet, label: 'PayPal', onClick: () => navigate('/paypal') },
        { icon: Bell, label: 'Notifications', onClick: () => navigate('/notifications') },
        { icon: User, label: 'Mon profil', onClick: () => navigate('/profil') },
      ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="flex items-center justify-between w-full gap-2">
          <div className="logo">🏦 Ma Banque</div>
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
      <main className="contenu pb-28">{children}</main>
      <div className="fixed bottom-2 left-0 right-0 z-40">
        <Dock items={itemsDock} />
      </div>
    </div>
  );
}
