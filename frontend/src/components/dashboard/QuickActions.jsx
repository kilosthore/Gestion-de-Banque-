import { Link } from 'react-router-dom';
import { Zap, Send, Receipt, Camera, Coins } from 'lucide-react';
import { IconeFlottante } from '../ui/icone-action';

const ACTIONS = [
  { libelle: 'Nouveau virement', route: '/operations', icone: Send },
  { libelle: 'Payer facture', route: '/operations', icone: Receipt },
  { libelle: 'Déposer chèque', route: '/operations', icone: Camera },
  { libelle: 'Demander prêt', route: '/prets', icone: Coins },
];

export default function QuickActions() {
  return (
    <div className="carte">
      <h2 className="flex items-center gap-2"><Zap className="w-5 h-5" /> Actions rapides</h2>
      <div className="grille grille-2" style={{ marginTop: 8 }}>
        {ACTIONS.map((a) => (
          <Link
            key={a.libelle}
            to={a.route}
            className="btn btn-secondaire"
            data-testid={`action-rapide-${a.route.slice(1)}-${a.libelle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 6px',
              textAlign: 'center',
              minHeight: 70,
            }}
          >
            <IconeFlottante icon={a.icone} />
            <span style={{ fontSize: '0.85rem', marginTop: 4 }}>{a.libelle}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
