import { useEffect, useState } from 'react';
import { Users, Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { IconeAction, IconeFlottante } from '../components/ui/icone-action';
export default function Contacts() {
  const [onglet, setOnglet] = useState('beneficiaires');
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [fb, setFb] = useState({ nom: '', coordonnees: '' });
  const [ff, setFf] = useState({ nom: '', categorie: 'electricite' });
  const [edition, setEdition] = useState(null);
  const [message, setMessage] = useState(null);

  const charger = () => {
    api.get('/beneficiaires').then((d) => setBeneficiaires(d.beneficiaires));
    api.get('/fournisseurs').then((d) => setFournisseurs(d.fournisseurs));
  };
  useEffect(charger, []);

  const ok = (texte) => { setMessage({ type: 'succes', texte }); charger(); };
  const ko = (e) => setMessage({ type: 'erreur', texte: e.message });

  const ajouterB = async (e) => {
    e.preventDefault();
    try {
      if (edition) {
        const d = await api.put(`/beneficiaires/${edition}`, fb);
        setEdition(null); ok(d.message);
      } else {
        const d = await api.post('/beneficiaires', fb); ok(d.message);
      }
      setFb({ nom: '', coordonnees: '' });
    } catch (err) { ko(err); }
  };

  const ajouterF = async (e) => {
    e.preventDefault();
    try {
      const d = await api.post('/fournisseurs', ff);
      setFf({ nom: '', categorie: 'electricite' });
      ok(d.message);
    } catch (err) { ko(err); }
  };

  return (
    <div>
      <h1 className="flex items-center gap-2.5">
        Bénéficiaires & fournisseurs
        <IconeFlottante icon={Users} className="text-primaire-600 dark:text-primaire-400" />
      </h1>
      <p className="sous-titre">Gérez vos destinataires de virements et de paiements</p>

      <div className="onglets">
        <button className={`onglet flex items-center gap-1.5 ${onglet === 'beneficiaires' ? 'actif' : ''}`} onClick={() => setOnglet('beneficiaires')}>
          <Users className="w-4 h-4" /> Bénéficiaires
        </button>
        <button className={`onglet flex items-center gap-1.5 ${onglet === 'fournisseurs' ? 'actif' : ''}`} onClick={() => setOnglet('fournisseurs')}>
          <Building2 className="w-4 h-4" /> Fournisseurs
        </button>
      </div>

      {message && <div className={`alerte alerte-${message.type}`}>{message.texte}</div>}

      {onglet === 'beneficiaires' ? (
        <div className="grille grille-2">
          <form className="carte" onSubmit={ajouterB}>
            <h2 className="flex items-center gap-2">
              {edition ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {edition ? 'Modifier' : 'Ajouter'} un bénéficiaire
            </h2>
            <label>Nom</label>
            <input value={fb.nom} onChange={(e) => setFb({ ...fb, nom: e.target.value })} required />
            <label>Coordonnées (email ou n° de compte)</label>
            <input value={fb.coordonnees} onChange={(e) => setFb({ ...fb, coordonnees: e.target.value })} required />
            <button className="btn w-full mt-4">{edition ? 'Enregistrer' : 'Ajouter'} ✔</button>
            {edition && (
              <button type="button" className="btn btn-secondaire w-full mt-2"
                onClick={() => { setEdition(null); setFb({ nom: '', coordonnees: '' }); }}>Annuler</button>
            )}
          </form>
          <div className="carte">
            <h2>Mes bénéficiaires</h2>
            {beneficiaires.length === 0 && <p className="sous-titre">Aucun bénéficiaire.</p>}
            {beneficiaires.map((b) => (
              <div key={b._id} className="flex justify-between items-center py-2.5 border-t border-primaire-200 dark:border-sombre-bordure">
                <div><b>{b.nom}</b><br /><small className="text-amber-700 dark:text-primaire-400">{b.coordonnees}</small></div>
                <div className="flex gap-1.5">
                  <IconeAction icon={Pencil} label="Modifier" variante="neutre" testId={`modifier-beneficiaire-${b._id}`}
                    onClick={() => { setEdition(b._id); setFb({ nom: b.nom, coordonnees: b.coordonnees }); }} />
                  <IconeAction icon={Trash2} label="Supprimer" variante="danger" testId={`supprimer-beneficiaire-${b._id}`}
                    onClick={async () => { await api.del(`/beneficiaires/${b._id}`); charger(); }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grille grille-2">
          <form className="carte" onSubmit={ajouterF}>
            <h2 className="flex items-center gap-2"><Plus className="w-5 h-5" /> Nouveau fournisseur</h2>
            <label>Nom</label>
            <input value={ff.nom} onChange={(e) => setFf({ ...ff, nom: e.target.value })} required />
            <label>Catégorie</label>
            <select value={ff.categorie} onChange={(e) => setFf({ ...ff, categorie: e.target.value })}>
              <option value="electricite">Électricité</option>
              <option value="internet">Internet</option>
              <option value="telephone">Téléphone</option>
              <option value="assurance">Assurance</option>
              <option value="autre">Autre</option>
            </select>
            <button className="btn w-full mt-4">Ajouter ✔</button>
          </form>
          <div className="carte">
            <h2>Mes fournisseurs</h2>
            {fournisseurs.length === 0 && <p className="sous-titre">Aucun fournisseur.</p>}
            {fournisseurs.map((fo) => (
              <div key={fo._id} className="flex justify-between items-center py-2.5 border-t border-primaire-200 dark:border-sombre-bordure">
                <div><b>{fo.nom}</b> <span className="badge capitalize">{fo.categorie}</span></div>
                <button className="btn btn-danger !px-3 !py-1.5"
                  onClick={async () => { await api.del(`/fournisseurs/${fo._id}`); charger(); }}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
