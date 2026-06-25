import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = sessionStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  // Thème dynamique clair / sombre (toujours jaune-orange)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'clair');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const connecter = (token, u) => {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  };

  const deconnecter = async () => {
    // E1 — notifier le serveur pour révoquer le JWT côté blacklist (best effort)
    try { await api.post('/auth/logout'); } catch { /* on continue même si l'appel échoue */ }
    sessionStorage.clear();
    setUser(null);
  };

  const rafraichirUser = async () => {
    const { user: u } = await api.get('/auth/me');
    sessionStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  };

  return (
    <AuthContext.Provider value={{ user, connecter, deconnecter, rafraichirUser, theme, setTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
