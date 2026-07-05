/** Barre de progression segmentée — étape active en cuivre, étapes franchies cochées.
    Affichée sur l'écran d'auth (fond marine sombre) : couleurs cuivre claires. */
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
                background: actif ? '#C2762E' : franchi ? '#EBC9A4' : 'rgba(255,255,255,0.15)',
              }} />
              <p style={{
                margin: '6px 0 0', fontSize: '0.7rem', textAlign: 'center',
                color: actif ? '#DFA76B' : franchi ? '#EBC9A4' : '#8FA0B8',
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
