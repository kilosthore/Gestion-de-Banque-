/** Barre de progression segmentée — étape active en orange, étapes franchies cochées. */
const LIBELLES = ['Personnel', 'Coordonnées', 'Pro & revenus', 'Compte', 'Conformité', 'Documents'];

export default function ProgressBar({ current, total = 6 }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const actif = n === current;
          const franchi = n < current;
          return (
            <div key={n} style={{ flex: 1 }}>
              <div style={{
                height: 6, borderRadius: 3,
                background: actif ? '#f97316' : franchi ? '#fed7aa' : 'var(--bordure)',
              }} />
              <p style={{
                margin: '6px 0 0', fontSize: '0.7rem', textAlign: 'center',
                color: actif ? '#f97316' : franchi ? 'var(--orange-fonce)' : 'var(--gris-fonce, #9ca3af)',
                fontWeight: actif ? 700 : 500,
              }}>
                {franchi ? '✓ ' : ''}{LIBELLES[i]}
              </p>
            </div>
          );
        })}
      </div>
      <p style={{ textAlign: 'center', marginTop: 12, fontWeight: 600 }}>
        Étape {current} / {total}
      </p>
    </div>
  );
}
