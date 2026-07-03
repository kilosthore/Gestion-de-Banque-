import { useEffect, useState } from 'react';
import { Target, Trophy, Plus, Trash2, Coins } from 'lucide-react';
import { api } from '../api/client';
import { IconeAction, IconeFlottante } from '../components/ui/icone-action';
export default function Objectifs() {
  const [objectifs, setObjectifs] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [f, setF] = useState({ nom: '', montantCible: '' });
  const [versement, setVersement] = useState({});
  const [message, setMessage] = useState(null);

  const charger = () => {
    api.get('/objectifs').then((d) => setObjectifs(d.objectifs));
    api.get('/comptes').then((d) => setComptes(d.comptes.filter((c) => c.kind !== 'CarteCredit')));
  };
  useEffect(charger, []);

  const creer = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const d = await api.post('/objectifs', f);
      setF({ nom: '', montantCible: '' });
      setMessage({ type: 'succes', texte: d.message });
      charger();
    } catch (err) { setMessage({ type: 'erreur', texte: err.message }); }
  };

  const verser = async (id) => {
    setMessage(null);
    const v = versement[id] || {};
    try {
      const d = await api.post(`/objectifs/${id}/verser`, { montant: v.montant, compteSourceId: v.compte });
      setMessage({ type: 'succes', texte: d.message });
      setVersement({ ...versement, [id]: {} });
      charger();
    } catch (err) { setMessage({ type: 'erreur', texte: err.message }); }
  };

  return (
    <div>
      <h1 className="flex items-center gap-2.5">
        Objectifs d'épargne
        <IconeFlottante icon={Target} className="text-primaire-600 dark:text-primaire-400" />
      </h1>
      <p className="sous-titre">Définissez vos objectifs et suivez votre progression (US-19)</p>
      {message && <div className={`alerte alerte-${message.type}`}>{message.texte}</div>}

      <div className="grille grille-2">
        <form className="carte" onSubmit={creer}>
          <h2 className="flex items-center gap-2"><Plus className="w-5 h-5" /> Nouvel objectif</h2>
          <label>Nom (ex. : Voyage, Auto…)</label>
          <input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} required />
          <label>Montant cible ($)</label>
          <input type="number" min="1" value={f.montantCible} onChange={(e) => setF({ ...f, montantCible: e.target.value })} required />
          <button className="btn w-full mt-4">Créer ✔</button>
        </form>

        {objectifs.map((o) => (
          <div key={o._id} className="carte">
            <div className="flex justify-between items-center">
              <h2 className="!mb-0 flex items-center gap-2">
                {o.progression >= 100
                  ? <Trophy className="w-5 h-5 text-primaire-500" />
                  : <Target className="w-5 h-5 text-primaire-600 dark:text-primaire-400" />}
                {o.nom}
              </h2>
              <IconeAction icon={Trash2} label="Supprimer l'objectif" variante="danger"
                testId={`supprimer-objectif-${o._id}`}
                onClick={async () => { await api.del(`/objectifs/${o._id}`); charger(); }} />
            </div>
            <p className="sous-titre !mb-2">{o.montantEpargne.toFixed(2)} $ / {o.montantCible.toFixed(2)} $</p>
            <div className="progression-fond">
              <div className="progression-barre" style={{ width: `${o.progression}%` }} />
            </div>
            <p className="font-bold text-amber-700 dark:text-primaire-400 mt-1">{o.progression} %</p>
            <div className="flex gap-2 mt-3">
              <select className="flex-1" value={versement[o._id]?.compte || ''}
                onChange={(e) => setVersement({ ...versement, [o._id]: { ...versement[o._id], compte: e.target.value } })}>
                <option value="">Compte…</option>
                {comptes.map((c) => <option key={c._id} value={c._id}>{c.type} ({c.solde.toFixed(0)} $)</option>)}
              </select>
              <input type="number" min="0.01" placeholder="$" className="!w-24"
                value={versement[o._id]?.montant || ''}
                onChange={(e) => setVersement({ ...versement, [o._id]: { ...versement[o._id], montant: e.target.value } })} />
              <button className="btn flex items-center gap-1.5" onClick={() => verser(o._id)}
                disabled={!versement[o._id]?.montant || !versement[o._id]?.compte} type="button"
                data-testid={`verser-objectif-${o._id}`}>
                <Coins className="w-4 h-4" /> Verser
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
