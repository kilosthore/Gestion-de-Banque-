import { Link } from 'react-router-dom';

/** Catégorisation auto basée sur des mots-clés dans la description */
function categoriser(description = '') {
  const d = description.toLowerCase();
  if (d.includes('salaire') || d.includes('revenu')) return { libelle: 'Revenu', couleur: '#10b981' };
  if (d.includes('facture')) return { libelle: 'Facture', couleur: '#3b82f6' };
  if (d.includes('interac')) return { libelle: 'Interac', couleur: '#f59e0b' };
  if (d.includes('virement')) return { libelle: 'Virement', couleur: '#8b5cf6' };
  if (d.includes('épargne') || d.includes('objectif')) return { libelle: 'Épargne', couleur: '#06b6d4' };
  if (d.includes('achat carte')) return { libelle: 'Achat carte', couleur: '#ec4899' };
  if (d.includes('dépôt') || d.includes('depot')) return { libelle: 'Dépôt', couleur: '#10b981' };
  if (d.includes('retrait')) return { libelle: 'Retrait', couleur: '#f97316' };
  return { libelle: 'Autre', couleur: '#6b7280' };
}

function Ligne({ tx }) {
  const cat = categoriser(tx.description);
  const positif = tx.sens === 'credit';
  const signe = positif ? '+' : '−';
  const couleurMontant = positif ? '#10b981' : '#ef4444';

  return (
    <tr style={{ borderTop: '1px solid var(--bordure)' }}>
      <td style={{ padding: '8px 4px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
        {new Date(tx.date).toLocaleDateString('fr-CA')}
      </td>
      <td style={{ padding: '8px 4px' }}>{tx.description || '—'}</td>
      <td style={{ padding: '8px 4px' }}>
        <span style={{
          background: cat.couleur, color: 'white', padding: '2px 8px',
          borderRadius: 10, fontSize: '0.75rem', whiteSpace: 'nowrap',
        }}>
          {cat.libelle}
        </span>
      </td>
      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700, color: couleurMontant }}>
        {signe} {Number(tx.montant).toFixed(2)} $
      </td>
    </tr>
  );
}

export default function RecentTransactions({ transactions }) {
  return (
    <div className="carte" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>📜 Dernières transactions</h2>
        <Link to="/historique" className="sous-titre">Voir tout →</Link>
      </div>
      {(!transactions || transactions.length === 0) ? (
        <p className="sous-titre" style={{ marginTop: 12 }}>Aucune transaction.</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: '6px 4px', fontSize: '0.8rem', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '6px 4px', fontSize: '0.8rem', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '6px 4px', fontSize: '0.8rem', fontWeight: 600 }}>Catégorie</th>
                <th style={{ padding: '6px 4px', fontSize: '0.8rem', fontWeight: 600, textAlign: 'right' }}>Montant</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => <Ligne key={t._id} tx={t} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
