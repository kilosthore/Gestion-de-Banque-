import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

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
        ['/admin', '🛠️', 'Administration'],
        ['/profil', '👤', 'Mon profil'],
      ]
    : [
        ['/', '🏠', 'Tableau de bord'],
        ['/comptes', '💳', 'Mes comptes'],
        ['/operations', '💸', 'Opérations'],
        ['/historique', '📜', 'Historique'],
        ['/contacts', '👥', 'Bénéficiaires'],
        ['/objectifs', '🎯', 'Épargne'],
        ['/prets', '💰', 'Prêts'],
        ['/produits', '📈', 'Produits'],
        ['/notifications', '🔔', 'Notifications'],
        ['/profil', '👤', 'Mon profil'],
      ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">🏦 Ma Banque</div>
        {liens.map(([chemin, icone, libelle]) => (
          <NavLink key={chemin} to={chemin} end={chemin === '/'}
            className={({ isActive }) => `nav-lien ${isActive ? 'actif' : ''}`}>
            <span>{icone}</span> {libelle}
            {libelle === 'Notifications' && nonLues > 0 && <span className="pastille-notif">{nonLues}</span>}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-secondaire" onClick={() => setTheme(theme === 'clair' ? 'sombre' : 'clair')}>
            {theme === 'clair' ? '🌙 Mode sombre' : '☀️ Mode clair'}
          </button>
          <button className="btn" onClick={sortir}>🚪 Déconnexion</button>
        </div>
      </aside>
      <main className="contenu">{children}</main>
    </div>
  );
}
