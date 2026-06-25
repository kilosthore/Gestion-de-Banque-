import { Link } from 'react-router-dom';

const ACTIONS = [
  { libelle: 'Nouveau virement', route: '/operations', icone: '💸' },
  { libelle: 'Payer facture', route: '/operations', icone: '🧾' },
  { libelle: 'Déposer chèque', route: '/operations', icone: '📸' },
  { libelle: 'Demander prêt', route: '/prets', icone: '💰' },
];

export default function QuickActions() {
  return (
    <div className="carte">
      <h2>⚡ Actions rapides</h2>
      <div className="grille grille-2" style={{ marginTop: 8 }}>
        {ACTIONS.map((a) => (
          <Link
            key={a.libelle}
            to={a.route}
            className="btn btn-secondaire"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 6px',
              textAlign: 'center',
              minHeight: 70,
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{a.icone}</span>
            <span style={{ fontSize: '0.85rem', marginTop: 4 }}>{a.libelle}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
