/** En-tête du tableau de bord : salutation + solde total + variation 30j */
export default function SummaryHeader({ user, totalBalance, currency, trend }) {
  const formatteur = new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: currency || 'CAD',
  });
  const positif = trend >= 0;
  const couleur = positif ? '#10b981' : '#ef4444';
  const fleche = positif ? '↗' : '↘';

  return (
    <div className="carte carte-compte" style={{ marginBottom: 20 }}>
      <p style={{ opacity: 0.9, margin: 0 }}>
        Bonjour, <b>{user?.prenom || user?.nom} 👋</b>
      </p>
      <h1 style={{ fontSize: '2.5rem', margin: '8px 0 4px' }}>
        {formatteur.format(totalBalance)}
      </h1>
      <p style={{ margin: 0, fontWeight: 600 }}>
        <span style={{ color: couleur, marginRight: 6 }}>
          {fleche} {Math.abs(trend).toFixed(1)} %
        </span>
        <span style={{ opacity: 0.9 }}>sur 30 jours • Solde total (hors crédit)</span>
      </p>
    </div>
  );
}
