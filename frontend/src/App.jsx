import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Connexion from './pages/Connexion';
import Inscription from './pages/Inscription';
import TableauDeBord from './pages/TableauDeBord';
import Comptes from './pages/Comptes';
import DetailCompte from './pages/DetailCompte';
import Operations from './pages/Operations';
import Historique from './pages/Historique';
import Contacts from './pages/Contacts';
import Objectifs from './pages/Objectifs';
import Produits from './pages/Produits';
import Notifications from './pages/Notifications';
import Prets from './pages/Prets';
import Profil from './pages/Profil';
import Admin from './pages/Admin';
import Bienvenue from './pages/Bienvenue';
import HeroBanque from './components/HeroBanque';

function Prive({ children, adminSeul = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/connexion" replace />;
  if (adminSeul && user.role !== 'admin') return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

/* Route racine : HeroBanque pour les visiteurs, TableauDeBord pour les connectés */
function AccueilOuTableau() {
  const { user } = useAuth();
  return user ? <Layout><TableauDeBord /></Layout> : <HeroBanque />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/bienvenue" element={<Bienvenue />} />
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/inscription" element={<Inscription />} />
      <Route path="/" element={<AccueilOuTableau />} />
      <Route path="/comptes" element={<Prive><Comptes /></Prive>} />
      <Route path="/comptes/:id" element={<Prive><DetailCompte /></Prive>} />
      <Route path="/operations" element={<Prive><Operations /></Prive>} />
      <Route path="/historique" element={<Prive><Historique /></Prive>} />
      <Route path="/contacts" element={<Prive><Contacts /></Prive>} />
      <Route path="/objectifs" element={<Prive><Objectifs /></Prive>} />
      <Route path="/produits" element={<Prive><Produits /></Prive>} />
      <Route path="/notifications" element={<Prive><Notifications /></Prive>} />
      <Route path="/prets" element={<Prive><Prets /></Prive>} />
      <Route path="/profil" element={<Prive><Profil /></Prive>} />
      <Route path="/admin" element={<Prive adminSeul><Admin /></Prive>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
