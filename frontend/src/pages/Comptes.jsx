import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

/** US-04 — Liste des comptes + ouverture d'un nouveau compte */
export default function Comptes() {
  const [comptes, setComptes] = useState([]);
  const [type, setType] = useState('epargne');
  const [message, setMessage] = useState('');

  const charger = () => api.get('/comptes').then((d) => setComptes(d.comptes));
  useEffect(() => { charger(); }, []);

  const ouvrir = async () => {
    setMessage('');
    try {
      const d = await api.post('/comptes', { type });
      setMessage(d.message);
      charger();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const icones = { cheque: '🧾', epargne: '🐷', credit: '💳', pret: '🏠', investissement: '📈' };

  return (
    <div>
      <h1>Mes comptes</h1>
      <p className="sous-titre">Consultez vos soldes et ouvrez de nouveaux comptes</p>
      {message && <div className="alerte alerte-succes">{message}</div>}

      <div className="grille grille-3" style={{ marginBottom: 22 }}>
        {comptes.map((c) => (
          <Link key={c._id} to={`/comptes/${c._id}`} style={{ textDecoration: 'none' }}>
            <div className="carte carte-compte">
              <p style={{ fontSize: '1.6rem' }}>{icones[c.type]}</p>
              <p style={{ textTransform: 'capitalize', fontWeight: 700 }}>
                {c.kind === 'CarteCredit' ? 'Carte de crédit' : c.type}
              </p>
              <p style={{ opacity: 0.85, fontSize: '0.85rem' }}>****{c.numero.slice(-4)}</p>
              <h2 style={{ marginTop: 8 }}>
                {c.kind === 'CarteCredit'
                  ? `${(c.limite - c.soldeUtilise).toFixed(2)} $ dispo`
                  : `${c.solde.toFixed(2)} ${c.devise}`}
              </h2>
            </div>
          </Link>
        ))}
      </div>

      <div className="carte" style={{ maxWidth: 420 }}>
        <h2>➕ Ouvrir un compte</h2>
        <label>Type de compte</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="cheque">Chèque</option>
          <option value="epargne">Épargne</option>
          <option value="credit">Carte de crédit</option>
          <option value="pret">Prêt</option>
          <option value="investissement">Investissement</option>
        </select>
        <button className="btn" style={{ marginTop: 14, width: '100%' }} onClick={ouvrir}>Ouvrir ✔</button>
      </div>
    </div>
  );
}
