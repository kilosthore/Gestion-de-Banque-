/** Étape 1/6 — Informations personnelles (identification) */
export default function Etape1Personnel({ data, maj, erreurs }) {
  const champ = (nom, label, props = {}) => (
    <div>
      <label>{label} {props.required && '*'}</label>
      <input
        {...props}
        value={data[nom] || ''}
        onChange={(e) => maj(nom, e.target.value)}
        aria-invalid={!!erreurs[nom]}
      />
      {erreurs[nom] && <small style={{ color: '#ef4444' }}>{erreurs[nom]}</small>}
      {props.help && <small className="sous-titre">{props.help}</small>}
    </div>
  );

  return (
    <div>
      <h2>📋 Informations personnelles</h2>
      <p className="sous-titre">Identifiez-vous (tel qu'inscrit sur votre pièce d'identité).</p>

      <label>Civilité *</label>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {['M.', 'Mme', 'Autre'].map((v) => (
          <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'normal' }}>
            <input type="radio" name="civilite" value={v}
              checked={data.civilite === v}
              onChange={(e) => maj('civilite', e.target.value)} />
            {v}
          </label>
        ))}
      </div>
      {erreurs.civilite && <small style={{ color: '#ef4444' }}>{erreurs.civilite}</small>}

      {champ('prenom', 'Prénom', { required: true, maxLength: 50, help: 'Tel qu\'indiqué sur votre pièce d\'identité' })}
      {champ('nom', 'Nom', { required: true, maxLength: 50 })}
      {champ('dateNaissance', 'Date de naissance', { type: 'date', required: true, help: 'Vous devez être majeur (18 ans minimum)' })}
      {champ('nationalite', 'Nationalité', { required: true, placeholder: 'Ex. : Canadienne' })}
      {champ('lieuNaissance', 'Lieu de naissance', { required: true, placeholder: 'Ville, pays' })}
    </div>
  );
}
