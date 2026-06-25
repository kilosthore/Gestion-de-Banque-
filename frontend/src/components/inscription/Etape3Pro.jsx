/** Étape 3/6 — Informations professionnelles et revenus (avec champs conditionnels) */
export default function Etape3Pro({ data, maj, erreurs }) {
  const estSalarie = data.statutPro === 'salarie';
  const estIndependant = data.statutPro === 'independant';

  return (
    <div>
      <h2>💼 Informations professionnelles</h2>
      <p className="sous-titre">Pour évaluer votre capacité financière (utile pour le découvert et le crédit).</p>

      <label>Statut professionnel *</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        {[
          { v: 'salarie', l: '👔 Salarié(e)' },
          { v: 'independant', l: '💼 Indépendant(e)' },
          { v: 'etudiant', l: '🎓 Étudiant(e)' },
          { v: 'sansEmploi', l: '🏠 Sans emploi' },
          { v: 'retraite', l: '👴 Retraité(e)' },
        ].map((o) => (
          <label key={o.v} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            border: '1px solid var(--bordure)', borderRadius: 8, cursor: 'pointer',
            background: data.statutPro === o.v ? '#fff7ed' : 'transparent',
            fontWeight: 'normal',
          }}>
            <input type="radio" name="statutPro" value={o.v}
              checked={data.statutPro === o.v}
              onChange={(e) => maj('statutPro', e.target.value)} />
            {o.l}
          </label>
        ))}
      </div>
      {erreurs.statutPro && <small style={{ color: '#ef4444' }}>{erreurs.statutPro}</small>}

      {/* Champs conditionnels : salarié */}
      {estSalarie && (
        <div style={{ background: '#fff7ed', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <label>Nom de l'employeur *</label>
          <input value={data.nomEmployeur || ''} onChange={(e) => maj('nomEmployeur', e.target.value)} maxLength={150} />
          {erreurs.nomEmployeur && <small style={{ color: '#ef4444' }}>{erreurs.nomEmployeur}</small>}

          <div className="grille grille-2" style={{ marginTop: 8 }}>
            <div>
              <label>Date d'embauche *</label>
              <input type="date" value={data.dateEmbauche || ''} onChange={(e) => maj('dateEmbauche', e.target.value)} />
              {erreurs.dateEmbauche && <small style={{ color: '#ef4444' }}>{erreurs.dateEmbauche}</small>}
            </div>
            <div>
              <label>Type de contrat *</label>
              <select value={data.typeContrat || ''} onChange={(e) => maj('typeContrat', e.target.value)}>
                <option value="">— Choisir —</option>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="Interim">Intérim</option>
                <option value="Stage">Stage</option>
                <option value="Alternance">Alternance</option>
              </select>
              {erreurs.typeContrat && <small style={{ color: '#ef4444' }}>{erreurs.typeContrat}</small>}
            </div>
          </div>
        </div>
      )}

      {/* Champs conditionnels : indépendant */}
      {estIndependant && (
        <div style={{ background: '#fff7ed', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <label>SIRET / Numéro d'entreprise *</label>
          <input value={data.siret || ''} onChange={(e) => maj('siret', e.target.value)}
            placeholder="14 chiffres" maxLength={14} />
          {erreurs.siret && <small style={{ color: '#ef4444' }}>{erreurs.siret}</small>}

          <label>Date de création de l'entreprise *</label>
          <input type="date" value={data.dateCreationEntreprise || ''} onChange={(e) => maj('dateCreationEntreprise', e.target.value)} />
          {erreurs.dateCreationEntreprise && <small style={{ color: '#ef4444' }}>{erreurs.dateCreationEntreprise}</small>}
        </div>
      )}

      <div className="grille grille-2">
        <div>
          <label>Revenu mensuel net ($) *</label>
          <input type="number" min="0" step="0.01" value={data.revenuMensuelNet || ''}
            onChange={(e) => maj('revenuMensuelNet', e.target.value)} />
          {erreurs.revenuMensuelNet && <small style={{ color: '#ef4444' }}>{erreurs.revenuMensuelNet}</small>}
        </div>
        <div>
          <label>Charges mensuelles ($)</label>
          <input type="number" min="0" step="0.01" value={data.chargesMensuelles || ''}
            onChange={(e) => maj('chargesMensuelles', e.target.value)} />
          <small className="sous-titre">Loyer, prêts, abonnements…</small>
        </div>
      </div>
    </div>
  );
}
