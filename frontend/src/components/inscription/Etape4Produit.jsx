/** Étape 4/6 — Choix du compte bancaire (avec options conditionnelles) */
export default function Etape4Produit({ data, maj, erreurs }) {
  const estCheque = data.typeCompte === 'cheque';

  return (
    <div>
      <h2>🏦 Choix du compte</h2>
      <p className="sous-titre">Configurez le produit bancaire qui vous correspond.</p>

      <label>Type de compte *</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {[
          { v: 'cheque', t: 'Compte chèque', d: 'Pour la gestion quotidienne (virements, paiements, carte)' },
          { v: 'epargne', t: 'Compte épargne', d: 'Pour faire fructifier votre argent (taux 2,5 %)' },
          { v: 'jeune', t: 'Compte jeune (18-25 ans)', d: 'Sans frais de gestion, avec carte gratuite' },
        ].map((o) => (
          <label key={o.v} style={{
            padding: 14, border: '2px solid var(--bordure)', borderRadius: 8, cursor: 'pointer',
            background: data.typeCompte === o.v ? '#fff7ed' : 'transparent',
            borderColor: data.typeCompte === o.v ? '#f97316' : 'var(--bordure)',
            fontWeight: 'normal',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <input type="radio" name="typeCompte" value={o.v}
                checked={data.typeCompte === o.v}
                onChange={(e) => maj('typeCompte', e.target.value)}
                style={{ marginTop: 4 }} />
              <div>
                <div style={{ fontWeight: 600 }}>{o.t}</div>
                <small className="sous-titre">{o.d}</small>
              </div>
            </div>
          </label>
        ))}
      </div>
      {erreurs.typeCompte && <small style={{ color: '#ef4444' }}>{erreurs.typeCompte}</small>}

      {/* Découvert autorisé (seulement pour chèque) */}
      {estCheque && (
        <div style={{ background: '#fff7ed', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'normal' }}>
            <input type="checkbox" checked={!!data.decouvertAutorise}
              onChange={(e) => maj('decouvertAutorise', e.target.checked)} />
            <span>Activer le découvert autorisé</span>
          </label>

          {data.decouvertAutorise && (
            <div style={{ marginTop: 10 }}>
              <label>Plafond du découvert : <b>{data.plafondDecouvert || 0} $</b></label>
              <input type="range" min="0" max="2000" step="100"
                value={data.plafondDecouvert || 0}
                onChange={(e) => maj('plafondDecouvert', Number(e.target.value))}
                style={{ width: '100%' }} />
              <small className="sous-titre">De 0 à 2000 $. Frais : 0,5 % du montant utilisé / mois.</small>
            </div>
          )}
        </div>
      )}

      {/* Demande de carte */}
      <div style={{ background: 'rgba(255,255,255,0.5)', padding: 12, borderRadius: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'normal' }}>
          <input type="checkbox" checked={!!data.demandeCarte}
            onChange={(e) => maj('demandeCarte', e.target.checked)} />
          <span>Je souhaite recevoir une carte bancaire</span>
        </label>

        {data.demandeCarte && (
          <div style={{ marginTop: 10 }}>
            <label>Type de carte *</label>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { v: 'debit', l: '💳 Carte de débit (gratuite)' },
                { v: 'credit', l: '💎 Carte de crédit (5 $/mois)' },
              ].map((o) => (
                <label key={o.v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'normal' }}>
                  <input type="radio" name="typeCarte" value={o.v}
                    checked={data.typeCarte === o.v}
                    onChange={(e) => maj('typeCarte', e.target.value)} />
                  {o.l}
                </label>
              ))}
            </div>
            {erreurs.typeCarte && <small style={{ color: '#ef4444' }}>{erreurs.typeCarte}</small>}
          </div>
        )}
      </div>
    </div>
  );
}
