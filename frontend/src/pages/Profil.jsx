import { useState } from 'react';
import { User, ShieldCheck, Pencil, KeyRound, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { IconeFlottante } from '../components/ui/icone-action';
import { PopoverInfo } from '../components/ui/popover-info';

/** US-01 / US-03 — Consulter et modifier mon profil */
export default function Profil() {
  const { user, rafraichirUser } = useAuth();
  const [f, setF] = useState({ nom: user.nom, prenom: user.prenom || '' });
  const [mdp, setMdp] = useState({ ancienMotDePasse: '', nouveauMotDePasse: '', confirmation: '' });
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

  const changerMotDePasse = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (mdp.nouveauMotDePasse !== mdp.confirmation) {
      return setMessage({ type: 'erreur', texte: 'La confirmation ne correspond pas au nouveau mot de passe.' });
    }
    try {
      const d = await api.post('/auth/changer-mot-de-passe', {
        ancienMotDePasse: mdp.ancienMotDePasse,
        nouveauMotDePasse: mdp.nouveauMotDePasse,
      });
      setMdp({ ancienMotDePasse: '', nouveauMotDePasse: '', confirmation: '' });
      await rafraichirUser();
      setMessage({ type: 'succes', texte: d.message });
    } catch (err) { setMessage({ type: 'erreur', texte: err.message }); }
  };

  return (
    <div>
      <h1 className="flex items-center gap-2.5">
        Mon profil
        <IconeFlottante icon={User} className="text-primaire-600 dark:text-primaire-400" />
      </h1>
      <p className="sous-titre">Vos informations personnelles</p>
      {user.doitChangerMotDePasse && (
        <div className="alerte alerte-erreur flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          Vous êtes connecté avec un code temporaire : choisissez un nouveau mot de passe
          ci-dessous avant de continuer.
        </div>
      )}
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
          <h2 className="flex items-center gap-2"><Pencil className="w-4 h-4" /> Modifier</h2>
          <label>Nom</label>
          <input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} required />
          <label>Prénom</label>
          <input value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} />
          <button className="btn w-full mt-4">Enregistrer ✔</button>
        </form>
      </div>

      <form className="carte mt-4" onSubmit={changerMotDePasse}>
        <h2 className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primaire-600 dark:text-primaire-400" /> Changer mon mot de passe
        </h2>
        <div className="grille grille-3">
          <div>
            <label htmlFor="mdp-actuel">Mot de passe actuel (ou code temporaire)</label>
            <input id="mdp-actuel" type="password" required autoComplete="current-password"
              value={mdp.ancienMotDePasse}
              onChange={(e) => setMdp({ ...mdp, ancienMotDePasse: e.target.value })} />
          </div>
          <div>
            <label htmlFor="mdp-nouveau">Nouveau mot de passe</label>
            <input id="mdp-nouveau" type="password" required autoComplete="new-password"
              minLength={8} value={mdp.nouveauMotDePasse}
              onChange={(e) => setMdp({ ...mdp, nouveauMotDePasse: e.target.value })} />
          </div>
          <div>
            <label htmlFor="mdp-confirmation">Confirmation</label>
            <input id="mdp-confirmation" type="password" required autoComplete="new-password"
              minLength={8} value={mdp.confirmation}
              onChange={(e) => setMdp({ ...mdp, confirmation: e.target.value })} />
          </div>
        </div>
        <p className="sous-titre !mb-2 mt-2 text-sm">
          8 caractères minimum, avec majuscule, minuscule et chiffre.
        </p>
        <button className="btn">Mettre à jour le mot de passe</button>
      </form>

      <div className="carte mt-4">
        <h2 className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primaire-600 dark:text-primaire-400" /> Sécurité
          <PopoverInfo titre="Sécurité du compte"
            description="Connexion en deux étapes : mot de passe puis code à 6 chiffres envoyé par email. Après 5 tentatives échouées, le compte est verrouillé 15 minutes. Cliquez à l'extérieur pour fermer." />
        </h2>
        <p className="sous-titre !mb-0">
          Connexion protégée par double authentification (code à 6 chiffres) ·
          verrouillage automatique après 5 tentatives échouées ·
          session de 30 minutes.
        </p>
      </div>
    </div>
  );
}
