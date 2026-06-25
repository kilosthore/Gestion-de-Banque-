import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

/** US-01 / US-03 — Consulter et modifier mon profil */
export default function Profil() {
  const { user, rafraichirUser } = useAuth();
  const [f, setF] = useState({ nom: user.nom, prenom: user.prenom || '' });
  const [message, setMessage] = useState(null);

  const enregistrer = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const d = await api.put('/auth/me', f);
      await rafraichirUser();
      setMessage({ type: 'succes', texte: d.message });
    } catch (err) { setMessage({ type: 'erreur', texte: err.message }); }
  };

  return (
    <div>
      <h1>Mon profil 👤</h1>
      <p className="sous-titre">Vos informations personnelles (US-01, US-03)</p>
      {message && <div className={`alerte alerte-${message.type}`}>{message.texte}</div>}

      <div className="grille grille-2">
        <div className="carte">
          <h2>Informations</h2>
          <table>
            <tbody>
              <tr><td className="text-amber-700 dark:text-primaire-400">Email</td><td>{user.email}</td></tr>
              <tr><td className="text-amber-700 dark:text-primaire-400">Rôle</td><td><span className="badge capitalize">{user.role}</span></td></tr>
              <tr><td className="text-amber-700 dark:text-primaire-400">Membre depuis</td><td>{new Date(user.dateCreation).toLocaleDateString('fr-CA')}</td></tr>
            </tbody>
          </table>
        </div>

        <form className="carte" onSubmit={enregistrer}>
          <h2>✏️ Modifier</h2>
          <label>Nom</label>
          <input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} required />
          <label>Prénom</label>
          <input value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} />
          <button className="btn w-full mt-4">Enregistrer ✔</button>
        </form>
      </div>

      <div className="carte mt-4">
        <h2>🔐 Sécurité</h2>
        <p className="sous-titre !mb-0">
          Connexion protégée par double authentification (code à 6 chiffres) ·
          verrouillage automatique après 5 tentatives échouées ·
          session de 30 minutes.
        </p>
      </div>
    </div>
  );
}
