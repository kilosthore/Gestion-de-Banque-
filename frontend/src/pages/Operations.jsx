import { useEffect, useState } from 'react';
import { api } from '../api/client';

/**
 * Opérations bancaires — onglets :
 * US-11 dépôt/retrait · US-06 virement interne · US-07 Interac ·
 * US-09 facture · US-12 chèque photo · US-17 récurrente
 */
const ONGLETS = [
  ['depot', '💰 Dépôt / Retrait'],
  ['interne', '🔁 Virement interne'],
  ['interac', '⚡ Interac'],
  ['facture', '🧾 Facture'],
  ['cheque', '📷 Chèque photo'],
  ['recurrente', '🔄 Récurrente'],
];

export default function Operations() {
  const [onglet, setOnglet] = useState('depot');
  const [comptes, setComptes] = useState([]);
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [planifiees, setPlanifiees] = useState([]);
  const [message, setMessage] = useState(null);
  const [f, setF] = useState({ montant: '', description: '', type: 'depot', recurrence: 'mensuelle' });
  const [imageCheque, setImageCheque] = useState(null);

  const charger = () => {
    api.get('/comptes').then((d) => setComptes(d.comptes));
    api.get('/beneficiaires').then((d) => setBeneficiaires(d.beneficiaires));
    api.get('/fournisseurs').then((d) => setFournisseurs(d.fournisseurs));
    api.get('/transactions/planifiees').then((d) => setPlanifiees(d.transactions));
  };
  useEffect(charger, []);

  const maj = (champ) => (e) => setF({ ...f, [champ]: e.target.value });
  const ok = (texte) => { setMessage({ type: 'succes', texte }); setF({ ...f, montant: '', description: '' }); charger(); };
  const ko = (e) => setMessage({ type: 'erreur', texte: e.message });

  const lireImage = (e) => {
    const fichier = e.target.files[0];
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = () => setImageCheque(lecteur.result);
    lecteur.readAsDataURL(fichier);
  };

  const soumettre = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      if (onglet === 'depot') {
        const d = await api.post('/transactions/depot-retrait', {
          compteId: f.compteId, type: f.type, montant: f.montant, description: f.description,
        });
        ok(d.message);
      } else if (onglet === 'interne') {
        const d = await api.post('/transactions/virement-interne', {
          compteSourceId: f.compteId, compteDestId: f.compteDestId, montant: f.montant, description: f.description,
        });
        ok(d.message);
      } else if (onglet === 'interac') {
        const d = await api.post('/transactions/interac', {
          compteSourceId: f.compteId, beneficiaireId: f.beneficiaireId, montant: f.montant, description: f.description,
        });
        ok(d.message);
      } else if (onglet === 'facture') {
        const d = await api.post('/transactions/paiement-facture', {
          compteSourceId: f.compteId, fournisseurId: f.fournisseurId, montant: f.montant, description: f.description,
        });
        ok(d.message);
      } else if (onglet === 'cheque') {
        const d = await api.post('/transactions/depot-cheque', {
          compteId: f.compteId, montant: f.montant, imageCheque, description: f.description,
        });
        setImageCheque(null);
        ok(d.message);
      } else if (onglet === 'recurrente') {
        const d = await api.post('/transactions/recurrente', {
          compteSourceId: f.compteId, type: 'paiement', montant: f.montant,
          description: f.description, recurrence: f.recurrence, premiereDate: f.premiereDate,
          fournisseurId: f.fournisseurId || null,
        });
        ok(d.message);
      }
    } catch (err) { ko(err); }
  };

  const annulerPlanifiee = async (id) => {
    try { await api.del(`/transactions/planifiees/${id}`); charger(); } catch (err) { ko(err); }
  };

  const ChoixCompte = ({ libelle = 'Compte', champ = 'compteId', exclure }) => (
    <>
      <label>{libelle}</label>
      <select value={f[champ] || ''} onChange={maj(champ)} required>
        <option value="">— choisir —</option>
        {comptes.filter((c) => c.kind !== 'CarteCredit' && c._id !== exclure).map((c) => (
          <option key={c._id} value={c._id}>{c.type} ****{c.numero.slice(-4)} ({c.solde.toFixed(2)} $)</option>
        ))}
      </select>
    </>
  );

  return (
    <div>
      <h1>Opérations</h1>
      <p className="sous-titre">Dépôts, retraits, virements et paiements</p>

      <div className="onglets">
        {ONGLETS.map(([cle, libelle]) => (
          <button key={cle} className={`onglet ${onglet === cle ? 'actif' : ''}`}
            onClick={() => { setOnglet(cle); setMessage(null); }}>{libelle}</button>
        ))}
      </div>

      {message && <div className={`alerte alerte-${message.type}`}>{message.texte}</div>}

      <form onSubmit={soumettre} className="carte max-w-lg">
        {onglet === 'depot' && (
          <>
            <h2>💰 Dépôt ou retrait (US-11)</h2>
            <label>Opération</label>
            <select value={f.type} onChange={maj('type')}>
              <option value="depot">Dépôt</option>
              <option value="retrait">Retrait</option>
            </select>
            <ChoixCompte />
          </>
        )}
        {onglet === 'interne' && (
          <>
            <h2>🔁 Virement entre mes comptes (US-06)</h2>
            <ChoixCompte libelle="Compte source" />
            <ChoixCompte libelle="Compte destination" champ="compteDestId" exclure={f.compteId} />
          </>
        )}
        {onglet === 'interac' && (
          <>
            <h2>⚡ Virement Interac (US-07)</h2>
            <ChoixCompte libelle="Compte source" />
            <label>Bénéficiaire</label>
            <select value={f.beneficiaireId || ''} onChange={maj('beneficiaireId')} required>
              <option value="">— choisir —</option>
              {beneficiaires.map((b) => <option key={b._id} value={b._id}>{b.nom} ({b.coordonnees})</option>)}
            </select>
            {beneficiaires.length === 0 && <p className="sous-titre mt-2">Ajoutez d'abord un bénéficiaire (page Bénéficiaires).</p>}
          </>
        )}
        {onglet === 'facture' && (
          <>
            <h2>🧾 Payer une facture (US-09)</h2>
            <ChoixCompte libelle="Compte source" />
            <label>Fournisseur</label>
            <select value={f.fournisseurId || ''} onChange={maj('fournisseurId')} required>
              <option value="">— choisir —</option>
              {fournisseurs.map((fo) => <option key={fo._id} value={fo._id}>{fo.nom} ({fo.categorie})</option>)}
            </select>
          </>
        )}
        {onglet === 'cheque' && (
          <>
            <h2>📷 Déposer un chèque par photo (US-12)</h2>
            <ChoixCompte />
            <label>Photo du chèque</label>
            <input type="file" accept="image/*" onChange={lireImage} required className="!p-2" />
            {imageCheque && <img src={imageCheque} alt="chèque" className="mt-2 rounded-xl max-h-36 border-2 border-primaire-200" />}
          </>
        )}
        {onglet === 'recurrente' && (
          <>
            <h2>🔄 Transaction récurrente (US-17)</h2>
            <ChoixCompte libelle="Compte source" />
            <label>Fournisseur (optionnel)</label>
            <select value={f.fournisseurId || ''} onChange={maj('fournisseurId')}>
              <option value="">—</option>
              {fournisseurs.map((fo) => <option key={fo._id} value={fo._id}>{fo.nom}</option>)}
            </select>
            <label>Fréquence</label>
            <select value={f.recurrence} onChange={maj('recurrence')}>
              <option value="hebdomadaire">Hebdomadaire</option>
              <option value="mensuelle">Mensuelle</option>
            </select>
            <label>Première échéance</label>
            <input type="date" value={f.premiereDate || ''} onChange={maj('premiereDate')} required />
          </>
        )}

        <label>Montant ($)</label>
        <input type="number" min="0.01" step="0.01" value={f.montant} onChange={maj('montant')} required />
        <label>Description (optionnel)</label>
        <input value={f.description} onChange={maj('description')} />
        <button className="btn w-full mt-4">Confirmer ✔</button>
      </form>

      {onglet === 'recurrente' && planifiees.length > 0 && (
        <div className="carte max-w-lg mt-4">
          <h2>📅 Mes transactions planifiées</h2>
          <table>
            <tbody>
              {planifiees.map((t) => (
                <tr key={t._id}>
                  <td>{t.description}<br /><small className="text-amber-700 dark:text-primaire-400">{t.recurrence} · prochaine : {new Date(t.prochaineDate).toLocaleDateString('fr-CA')}</small></td>
                  <td>{t.montant.toFixed(2)} $</td>
                  <td><button className="btn btn-danger !px-3 !py-1.5" onClick={() => annulerPlanifiee(t._id)}>Annuler</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
