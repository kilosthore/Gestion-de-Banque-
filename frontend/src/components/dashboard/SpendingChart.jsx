import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

const MOIS = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function SpendingChart({ data }) {
  const donnees = (data || []).map((d) => ({
    mois: `${MOIS[d.mois]} ${String(d.annee).slice(-2)}`,
    Entrées: Math.round(d.credits),
    Sorties: Math.round(d.debits),
  }));

  return (
    <div className="carte" style={{ marginTop: 20 }}>
      <h2>📊 Entrées vs sorties — 6 derniers mois</h2>
      {donnees.length === 0 ? (
        <p className="sous-titre">Aucune donnée pour cette période.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={donnees} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bordure)" />
            <XAxis dataKey="mois" stroke="currentColor" style={{ fontSize: '0.8rem' }} />
            <YAxis stroke="currentColor" style={{ fontSize: '0.8rem' }} />
            <Tooltip
              formatter={(v) => `${Number(v).toFixed(2)} $`}
              contentStyle={{ background: 'var(--fond)', border: '1px solid var(--bordure)' }}
            />
            <Legend />
            <Bar dataKey="Entrées" fill="#10b981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Sorties" fill="#ef4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
