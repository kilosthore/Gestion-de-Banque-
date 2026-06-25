import { useEffect, useState } from 'react';
import { api } from '../api/client';

/** US-13/14 historique + filtres · US-15 relevé mensuel */
export default function Historique() {
  const [onglet, setOnglet] = useState('historique');
  const [transactions, setTransactions] = useState([]);
  const [filtres, setFiltres] = useState({ type: '', recherche: '', dateDebut: '', dateFin: '' });
  const maintenant = new Date();
  const [periode, setPeriode] = useState({ annee: maintenant.getFullYear(), mois: maintenant.getMonth() + 1 });
  const [releve, setReleve] = useState(null);

  const chargerHistorique = () => {
    const q = new URLSearchParams(Object.entries(filtres).filter(([, v]) => v)).toString();
    api.get(`/transactions?${q}`).then((d) => setTransactions(d.transactions));
  };
  const chargerReleve = () => {
    api.get(`/transactions/releve/${periode.annee}/${periode.mois}`).then(setReleve);
  };
  useEffect(chargerHistorique, [filtres]);
  useEffect(chargerReleve, [periode]);

  const maj = (champ) => (e) => setFiltres({ ...filtres, [champ]: e.target.value });
  const nomsMois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  return (
    <div>
      <h1>Historique & relevés</h1>
      <p className="sous-titre">Recherchez vos transactions et consultez vos relevés mensuels</p>

      <div className="onglets">
        <button className={`onglet ${onglet === 'historique' ? 'actif' : ''}`} onClick={() => setOnglet('historique')}>📜 Historique</button>
        <button className={`onglet ${onglet === 'releve' ? 'actif' : ''}`} onClick={() => setOnglet('releve')}>📄 Relevé mensuel</button>
      </div>

      {onglet === 'historique' ? (
        <>
          <div className="carte mb-4">
            <div className="grille grille-3">
              <div>
                <label>Recherche</label>
                <input placeholder="Description…" value={filtres.recherche} onChange={maj('recherche')} />
              </div>
              <div>
                <label>Type</label>
                <select value={filtres.type} onChange={maj('type')}>
                  <option value="">Tous</option>
                  <option value="virement">Virement</option>
                  <option value="interac">Interac</option>
                  <option value="paiement">Paiement</option>
                  <option value="depot">Dépôt</option>
                  <option value="retrait">Retrait</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label>Du</label>
                  <input type="date" value={filtres.dateDebut} onChange={maj('dateDebut')} />
                </div>
                <div className="flex-1">
                  <label>Au</label>
                  <input type="date" value={filtres.dateFin} onChange={maj('dateFin')} />
                </div>
              </div>
            </div>
          </div>

          <div className="carte">
            {transactions.length === 0 && <p className="sous-titre">Aucune transaction trouvée.</p>}
            <table>
              <thead>
                <tr><th>Date</th><th>Description</th><th>Type</th><th>Montant</th></tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id}>
                    <td>{new Date(t.date).toLocaleDateString('fr-CA')}</td>
                    <td>{t.description}{t.statut === 'en_attente' && <span className="badge ml-2">en attente</span>}</td>
                    <td><span className="badge capitalize">{t.type}</span></td>
                    <td><span className={`badge badge-${t.sens}`}>{t.sens === 'credit' ? '+' : '−'}{t.montant.toFixed(2)} $</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="carte mb-4 max-w-md">
            <div className="flex gap-2">
              <div className="flex-1">
                <label>Mois</label>
                <select value={periode.mois} onChange={(e) => setPeriode({ ...periode, mois: Number(e.target.value) })}>
                  {nomsMois.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label>Année</label>
                <select value={periode.annee} onChange={(e) => setPeriode({ ...periode, annee: Number(e.target.value) })}>
                  {[0, 1, 2].map((d) => {
                    const a = maintenant.getFullYear() - d;
                    return <option key={a} value={a}>{a}</option>;
                  })}
                </select>
              </div>
            </div>
          </div>

          {releve && (
            <div className="carte">
              <h2>Relevé — {nomsMois[periode.mois - 1]} {periode.annee} (US-15)</h2>
              <div className="grille grille-3 my-4">
                <div className="carte !p-4 text-center">
                  <p className="sous-titre !mb-1">Entrées</p>
                  <b className="text-green-600 text-xl">+{releve.totalCredits.toFixed(2)} $</b>
                </div>
                <div className="carte !p-4 text-center">
                  <p className="sous-titre !mb-1">Sorties</p>
                  <b className="text-red-600 text-xl">−{releve.totalDebits.toFixed(2)} $</b>
                </div>
                <div className="carte !p-4 text-center">
                  <p className="sous-titre !mb-1">Transactions</p>
                  <b className="text-xl">{releve.nombre}</b>
                </div>
              </div>
              <table>
                <tbody>
                  {releve.transactions.map((t) => (
                    <tr key={t._id}>
                      <td>{new Date(t.date).toLocaleDateString('fr-CA')}</td>
                      <td>{t.description}</td>
                      <td><span className={`badge badge-${t.sens}`}>{t.sens === 'credit' ? '+' : '−'}{t.montant.toFixed(2)} $</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
