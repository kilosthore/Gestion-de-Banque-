import { Link } from 'react-router-dom';

export default function SavingsGoals({ goals }) {
  return (
    <div className="carte" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>🎯 Mes objectifs d'épargne</h2>
        <Link to="/objectifs" className="sous-titre">Voir tous →</Link>
      </div>
      {(!goals || goals.length === 0) ? (
        <p className="sous-titre" style={{ marginTop: 12 }}>
          Aucun objectif. <Link to="/objectifs">Créez votre premier</Link>.
        </p>
      ) : (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {goals.map((g) => (
            <div key={g._id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <b>{g.progression >= 100 ? '🏆' : '🎯'} {g.nom}</b>
                <span className="sous-titre" style={{ margin: 0 }}>{g.progression} %</span>
              </div>
              <div className="progression-fond">
                <div className="progression-barre" style={{ width: `${Math.min(100, g.progression)}%` }} />
              </div>
              <p className="sous-titre" style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
                {Number(g.montantEpargne).toFixed(2)} $ / {Number(g.montantCible).toFixed(2)} $
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
