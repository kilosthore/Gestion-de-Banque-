/** Étape 5/6 — Conformité KYC / LCB-FT / FATCA */
export default function Etape5KYC({ data, maj, erreurs, nationaliteClient, paysResidence }) {
  const afficherDoubleNat = nationaliteClient && paysResidence && nationaliteClient !== paysResidence;

  const radioOuiNon = (nom, label, aide) => (
    <div style={{ marginBottom: 12 }}>
      <label>{label} *</label>
      {aide && <small className="sous-titre" style={{ display: 'block', marginBottom: 4 }}>{aide}</small>}
      <div style={{ display: 'flex', gap: 16 }}>
        {[
          { v: true, l: 'Oui' },
          { v: false, l: 'Non' },
        ].map((o) => (
          <label key={String(o.v)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'normal' }}>
            <input type="radio" name={nom}
              checked={data[nom] === o.v}
              onChange={() => maj(nom, o.v)} />
            {o.l}
          </label>
        ))}
      </div>
      {erreurs[nom] && <small style={{ color: '#ef4444' }}>{erreurs[nom]}</small>}
    </div>
  );

  return (
    <div>
      <h2>🛡️ Conformité (KYC)</h2>
      <p className="sous-titre">Pour satisfaire les obligations légales (LCB-FT, FATCA/CRS). Ces informations sont confidentielles.</p>

      {radioOuiNon('personnePolitiquementExposee', 'Êtes-vous une personne politiquement exposée (PEP) ?',
        'Membre d\'un gouvernement, parlement, autorité judiciaire, ou proche d\'une telle personne.')}

      {afficherDoubleNat && (
        <>
          {radioOuiNon('doubleNationalite', 'Avez-vous une double nationalité ?',
            `Votre nationalité (${nationaliteClient}) diffère de votre pays de résidence (${paysResidence}).`)}

          {data.doubleNationalite && (
            <div style={{ background: '#fff7ed', padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <label>Deuxième nationalité *</label>
              <input value={data.deuxiemeNationalite || ''}
                onChange={(e) => maj('deuxiemeNationalite', e.target.value)} maxLength={80} />
              {erreurs.deuxiemeNationalite && <small style={{ color: '#ef4444' }}>{erreurs.deuxiemeNationalite}</small>}

              <label>Numéro d'identification fiscale étranger (NIF)</label>
              <input value={data.nifEtranger || ''}
                onChange={(e) => maj('nifEtranger', e.target.value)} maxLength={50} />
              <small className="sous-titre">Optionnel mais recommandé pour la conformité fiscale.</small>
            </div>
          )}
        </>
      )}

      <label>Origine des fonds *</label>
      <select value={data.origineFonds || ''} onChange={(e) => maj('origineFonds', e.target.value)}>
        <option value="">— Choisir —</option>
        <option value="salaire">Salaire / revenu professionnel</option>
        <option value="heritage">Héritage</option>
        <option value="vente_bien">Vente d'un bien</option>
        <option value="epargne_personnelle">Épargne personnelle</option>
        <option value="donation">Donation</option>
        <option value="autre">Autre</option>
      </select>
      {erreurs.origineFonds && <small style={{ color: '#ef4444' }}>{erreurs.origineFonds}</small>}

      <div style={{ marginTop: 14 }}>
        {radioOuiNon('residentFiscalUSA', 'Êtes-vous résident fiscal aux États-Unis (FATCA) ?',
          'Citoyen américain, résident permanent (Green Card) ou redevable d\'impôts aux USA.')}
      </div>
    </div>
  );
}
