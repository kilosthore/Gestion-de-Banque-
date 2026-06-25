import { createContext, useContext, useEffect, useState } from 'react';
import { traductions } from '../i18n/traductions';

const LangueContext = createContext(null);

export function LangueProvider({ children }) {
  const [langue, setLangue] = useState(() => localStorage.getItem('langue') || 'fr');

  useEffect(() => {
    localStorage.setItem('langue', langue);
    document.documentElement.lang = langue;
  }, [langue]);

  const t = (cle) => traductions[langue]?.[cle] ?? cle;

  return (
    <LangueContext.Provider value={{ langue, setLangue, t }}>
      {children}
    </LangueContext.Provider>
  );
}

export const useLangue = () => useContext(LangueContext);
