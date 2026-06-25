/** Étape 2/6 — Coordonnées + mot de passe avec indicateur de force */

const INDICATIFS = [
  { code: '+1', pays: 'Canada / USA' },
  { code: '+33', pays: 'France' },
  { code: '+32', pays: 'Belgique' },
  { code: '+41', pays: 'Suisse' },
  { code: '+212', pays: 'Maroc' },
  { code: '+225', pays: 'Côte d\'Ivoire' },
  { code: '+243', pays: 'RD Congo' },
];

const PAYS = ['Canada', 'États-Unis', 'France', 'Belgique', 'Suisse', 'Maroc', 'Côte d\'Ivoire', 'RD Congo', 'Autre'];

function forceMotDePasse(mdp) {
  if (!mdp) return { score: 0, libelle: '', couleur: '#ddd' };
  let score = 0;
  if (mdp.length >= 8) score++;
  if (/[a-z]/.test(mdp) && /[A-Z]/.test(mdp)) score++;
  if (/\d/.test(mdp)) score++;
  if (/[^A-Za-z0-9]/.test(mdp)) score++;
  if (mdp.length >= 12) score++;
  const libelles = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Excellent'];
  const couleurs = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#059669'];
  return { score, libelle: libelles[Math.min(score - 1, 4)] || 'Très faible', couleur: couleurs[Math.min(score - 1, 4)] || '#ef4444' };
}

export default function Etape2Coordonnees({ data, maj, erreurs }) {
  const force = forceMotDePasse(data.motDePasse);

  return (
    <div>
      <h2>📞 Coordonnées</h2>
      <p className="sous-titre">Pour vous contacter et localiser votre dossier.</p>

      <label>Adresse complète *</label>
      <input value={data.adresseRue || ''} onChange={(e) => maj('adresseRue', e.target.value)}
        placeholder="N° et nom de rue" maxLength={200} aria-invalid={!!erreurs.adresseRue} />
      {erreurs.adresseRue && <small style={{ color: '#ef4444' }}>{erreurs.adresseRue}</small>}

      <div className="grille grille-2" style={{ marginTop: 8 }}>
        <div>
          <label>Ville *</label>
          <input value={data.adresseVille || ''} onChange={(e) => maj('adresseVille', e.target.value)} />
          {erreurs.adresseVille && <small style={{ color: '#ef4444' }}>{erreurs.adresseVille}</small>}
        </div>
        <div>
          <label>Code postal *</label>
          <input value={data.adresseCodePostal || ''} onChange={(e) => maj('adresseCodePostal', e.target.value)} maxLength={12} />
          {erreurs.adresseCodePostal && <small style={{ color: '#ef4444' }}>{erreurs.adresseCodePostal}</small>}
        </div>
      </div>

      <label>Pays *</label>
      <select value={data.adressePays || ''} onChange={(e) => maj('adressePays', e.target.value)}>
        <option value="">— Choisir —</option>
        {PAYS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      {erreurs.adressePays && <small style={{ color: '#ef4444' }}>{erreurs.adressePays}</small>}

      <div className="grille grille-2" style={{ marginTop: 8 }}>
        <div>
          <label>Indicatif</label>
          <select value={data.telephoneIndicatif || '+1'} onChange={(e) => maj('telephoneIndicatif', e.target.value)}>
            {INDICATIFS.map((i) => <option key={i.code} value={i.code}>{i.code} ({i.pays})</option>)}
          </select>
        </div>
        <div>
          <label>Téléphone *</label>
          <input type="tel" value={data.telephoneNumero || ''} onChange={(e) => maj('telephoneNumero', e.target.value)}
            placeholder="514 555-1234" />
          {erreurs.telephoneNumero && <small style={{ color: '#ef4444' }}>{erreurs.telephoneNumero}</small>}
        </div>
      </div>

      <label>Email *</label>
      <input type="email" value={data.email || ''} onChange={(e) => maj('email', e.target.value)} maxLength={254} />
      {erreurs.email && <small style={{ color: '#ef4444' }}>{erreurs.email}</small>}

      <label>Mot de passe *</label>
      <input type="password" value={data.motDePasse || ''} onChange={(e) => maj('motDePasse', e.target.value)} />
      {data.motDePasse && (
        <div style={{ marginTop: 4 }}>
          <div className="progression-fond" style={{ height: 6 }}>
            <div style={{ width: `${force.score * 20}%`, height: '100%', background: force.couleur, transition: 'all 0.3s', borderRadius: 3 }} />
          </div>
          <small style={{ color: force.couleur, fontWeight: 600 }}>{force.libelle}</small>
        </div>
      )}
      <small className="sous-titre">8 caractères minimum avec majuscule, minuscule et chiffre.</small>
      {erreurs.motDePasse && <small style={{ color: '#ef4444' }}>{erreurs.motDePasse}</small>}

      <label>Confirmation du mot de passe *</label>
      <input type="password" value={data.confirmationMotDePasse || ''} onChange={(e) => maj('confirmationMotDePasse', e.target.value)} />
      {erreurs.confirmationMotDePasse && <small style={{ color: '#ef4444' }}>{erreurs.confirmationMotDePasse}</small>}
    </div>
  );
}
