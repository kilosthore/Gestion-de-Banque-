import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';

/** US-05 — Détail d'un compte + US-18 — Payer la carte de crédit */
export default function DetailCompte() {
  const { id } = useParams();
  const [compte, setCompte] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [montant, setMontant] = useState('');
  const [source, setSource] = useState('');
  const [message, setMessage] = useState(null);

  const charger = () => {
    api.get(`/comptes/${id}`).then((d) => { setCompte(d.compte); setTransactions(d.transactions); });
    api.get('/comptes').then((d) => setComptes(d.comptes.filter((c) => c.kind !== 'CarteCredit' && c._id !== id)));
  };
  useEffect(charger, [id]);

  const payerCarte = async () => {
    setMessage(null);
    try {
      const d = await api.post(`/comptes/${id}/payer-carte`, { montant, compteSourceId: source });
      setMessage({ type: 'succes', texte: d.message });
      setMontant('');
      charger();
    } catch (e) {
      setMessage({ type: 'erreur', texte: e.message });
    }
  };

  if (!compte) return <p className="sous-titre">Chargement…</p>;
  const estCarte = compte.kind === 'CarteCredit';

  return (
    <div>
      <Link to="/comptes" className="text-amber-700 dark:text-primaire-400 font-bold no-underline">← Mes comptes</Link>
      <div className="carte carte-compte my-4">
        <p className="capitalize font-bold opacity-90">{estCarte ? 'Carte de crédit' : `Compte ${compte.type}`}</p>
        <p className="text-sm opacity-80">N° {compte.numero} · ouvert le {new Date(compte.dateOuverture).toLocaleDateString('fr-CA')}</p>
        {estCarte ? (
          <div className="mt-2">
            <h1 className="text-3xl">{compte.soldeUtilise.toFixed(2)} $ utilisés</h1>
            <p className="opacity-90">Limite : {compte.limite.toFixed(2)} $ · Disponible : {(compte.limite - compte.soldeUtilise).toFixed(2)} $</p>
            <div className="progression-fond mt-3 bg-white/30">
              <div className="progression-barre bg-white bg-none" style={{ width: `${Math.min(100, (compte.soldeUtilise / compte.limite) * 100)}%` }} />
            </div>
          </div>
        ) : (
          <h1 className="text-3xl mt-2">{compte.solde.toFixed(2)} {compte.devise}</h1>
        )}
      </div>

      {message && <div className={`alerte alerte-${message.type}`}>{message.texte}</div>}

      {estCarte && (
        <div className="carte max-w-md mb-4">
          <h2>💸 Payer ma carte (US-18)</h2>
          <label>Depuis le compte</label>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">— choisir —</option>
            {comptes.map((c) => (
              <option key={c._id} value={c._id}>{c.type} ****{c.numero.slice(-4)} ({c.solde.toFixed(2)} $)</option>
            ))}
          </select>
          <label>Montant ($)</label>
          <input type="number" min="0.01" step="0.01" value={montant} onChange={(e) => setMontant(e.target.value)} />
          <button className="btn w-full mt-3.5" onClick={payerCarte} disabled={!montant || !source}>Payer ✔</button>
        </div>
      )}

      <div className="carte">
        <h2>📜 Dernières transactions</h2>
        {transactions.length === 0 && <p className="sous-titre">Aucune transaction.</p>}
        <table>
          <tbody>
            {transactions.map((t) => (
              <tr key={t._id}>
                <td>{new Date(t.date).toLocaleDateString('fr-CA')}</td>
                <td>{t.description}</td>
                <td><span className={`badge badge-${t.sens}`}>{t.sens === 'credit' ? '+' : '−'}{t.montant.toFixed(2)} $</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
