import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { LangueProvider } from './context/LangueContext';
import './styles/theme.css';

// PWA : enregistrement du service worker (démarrage instantané + écran d'accueil).
// Uniquement en production : en dev, un SW servirait des assets périmés et
// masquerait le rechargement à chaud de Vite. `load` évite de concurrencer le
// premier rendu. L'échec est sans gravité — l'app fonctionne sans SW.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LangueProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LangueProvider>
    </BrowserRouter>
  </React.StrictMode>
);
