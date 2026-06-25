import { Link } from 'react-router-dom';

const LIBELLE_TYPE = {
  cheque: 'Compte chèque',
  epargne: 'Compte épargne',
  credit: 'Carte de crédit',
  pret: 'Prêt',
  investissement: 'Investissement',
};
const ICONE_TYPE = {
  cheque: '🏦',
  epargne: '💰',
  credit: '💳',
  pret: '🏠',
  investissement: '📈',
};

function CarteCompte({ account }) {
  const libelle = LIBELLE_TYPE[account.type] || account.type;
  const icone = ICONE_TYPE[account.type] || '📊';
  const masque = '••• ' + (account.numero || '').slice(-4);

  // CarteCredit : affichage utilisé / limite + barre de progression
  if (account.kind === 'CarteCredit') {
    const utilise = Number(account.soldeUtilise || 0);
    const limite = Number(account.limite || 1);
    const pct = Math.min(100, (utilise / limite) * 100);
    const couleurBarre = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';

    return (
      <div className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{icone} {libelle}</h3>
          <span className="sous-titre" style={{ margin: 0 }}>{masque}</span>
        </div>
        <p style={{ margin: 0 }}>
          <b>{utilise.toFixed(2)} $</b>
          <span className="sous-titre"> utilisés sur {limite.toFixed(2)} $</span>
        </p>
        <div className="progression-fond">
          <div className="progression-barre" style={{ width: `${pct}%`, background: couleurBarre }} />
        </div>
        <Link to={`/comptes/${account._id}`} className="btn btn-secondaire" style={{ alignSelf: 'flex-start' }}>
          Voir détails →
        </Link>
      </div>
    );
  }

  // Compte classique
  return (
    <div className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{icone} {libelle}</h3>
        <span className="sous-titre" style={{ margin: 0 }}>{masque}</span>
      </div>
      <p style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: 'var(--orange-fonce)' }}>
        {Number(account.solde).toFixed(2)} {account.devise}
      </p>
      <Link to={`/comptes/${account._id}`} className="btn btn-secondaire" style={{ alignSelf: 'flex-start' }}>
        Voir détails →
      </Link>
    </div>
  );
}

export default function AccountCards({ accounts }) {
  if (!accounts || accounts.length === 0) {
    return (
      <div className="carte">
        <h2>💳 Mes comptes</h2>
        <p className="sous-titre">Aucun compte ouvert.</p>
        <Link to="/comptes" className="btn">Ouvrir un compte</Link>
      </div>
    );
  }
  return (
    <div className="carte">
      <h2>💳 Mes comptes ({accounts.length})</h2>
      <div className="grille grille-2" style={{ marginTop: 12 }}>
        {accounts.map((a) => <CarteCompte key={a._id} account={a} />)}
      </div>
    </div>
  );
}
