/** Étape 6/6 — Upload documents + récap éditable + consentements RGPD/CGU */
export default function Etape6Documents({ data, dossier, majDocuments, majConsentements, onEditerEtape }) {
  return (
    <div>
      <h2>📎 Documents & validation</h2>
      <p className="sous-titre">Joignez vos justificatifs et validez votre dossier.</p>

      {/* Documents */}
      <div style={{ background: 'rgba(0,0,0,0.03)', padding: 14, borderRadius: 8, marginBottom: 14 }}>
        <label>Pièce d'identité (PDF, JPG, PNG) *</label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => majDocuments('pieceIdentiteNom', e.target.files?.[0]?.name || '')} />
        {data.pieceIdentiteNom && <small style={{ color: '#10b981' }}>✓ {data.pieceIdentiteNom}</small>}

        <label style={{ marginTop: 8 }}>Justificatif de domicile (moins de 3 mois) *</label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => majDocuments('justificatifDomicileNom', e.target.files?.[0]?.name || '')} />
        {data.justificatifDomicileNom && <small style={{ color: '#10b981' }}>✓ {data.justificatifDomicileNom}</small>}
      </div>

      {/* Récapitulatif éditable */}
      <h3 style={{ marginTop: 18 }}>📋 Récapitulatif de votre dossier</h3>
      <div style={{ background: 'rgba(0,0,0,0.03)', padding: 12, borderRadius: 8, marginBottom: 14 }}>
        {[
          { etape: 1, titre: '👤 Personnel', valeur: `${dossier.informationsPersonnelles.civilite || ''} ${dossier.informationsPersonnelles.prenom || ''} ${dossier.informationsPersonnelles.nom || ''} — né(e) le ${dossier.informationsPersonnelles.dateNaissance || '?'}` },
          { etape: 2, titre: '📞 Coordonnées', valeur: `${dossier.coordonnees.email || '?'} • ${dossier.coordonnees.telephoneIndicatif || ''} ${dossier.coordonnees.telephoneNumero || '?'}` },
          { etape: 3, titre: '💼 Pro', valeur: `${dossier.informationsPro.statutPro || '?'} — Revenu net ${dossier.informationsPro.revenuMensuelNet || 0} $/mois` },
          { etape: 4, titre: '🏦 Compte', valeur: `${dossier.produit.typeCompte || '?'}${dossier.produit.decouvertAutorise ? ` + découvert ${dossier.produit.plafondDecouvert}$` : ''}${dossier.produit.demandeCarte ? ` + carte ${dossier.produit.typeCarte}` : ''}` },
          { etape: 5, titre: '🛡️ KYC', valeur: `Origine fonds : ${dossier.kyc.origineFonds || '?'} • PEP : ${dossier.kyc.personnePolitiquementExposee ? 'Oui' : 'Non'}` },
        ].map((r) => (
          <div key={r.etape} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--bordure)' }}>
            <div>
              <b>{r.titre}</b>
              <p className="sous-titre" style={{ margin: 0 }}>{r.valeur}</p>
            </div>
            <button type="button" onClick={() => onEditerEtape(r.etape)}
              className="btn btn-secondaire" style={{ padding: '4px 10px', fontSize: '0.85rem' }}>
              ✏️ Modifier
            </button>
          </div>
        ))}
      </div>

      {/* Consentements obligatoires */}
      <h3>✅ Consentements obligatoires</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontWeight: 'normal' }}>
          <input type="checkbox" checked={!!dossier.consentements.cgu}
            onChange={(e) => majConsentements('cgu', e.target.checked)} style={{ marginTop: 4 }} />
          <span>J'ai lu et j'accepte les <a href="#" onClick={(e) => e.preventDefault()}>Conditions générales d'utilisation</a>.</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontWeight: 'normal' }}>
          <input type="checkbox" checked={!!dossier.consentements.confidentialite}
            onChange={(e) => majConsentements('confidentialite', e.target.checked)} style={{ marginTop: 4 }} />
          <span>J'accepte la <a href="#" onClick={(e) => e.preventDefault()}>Politique de confidentialité</a> (RGPD).</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontWeight: 'normal' }}>
          <input type="checkbox" checked={!!dossier.consentements.prelevementAutorisation}
            onChange={(e) => majConsentements('prelevementAutorisation', e.target.checked)} style={{ marginTop: 4 }} />
          <span>J'autorise les prélèvements de frais bancaires sur mon compte.</span>
        </label>
      </div>
    </div>
  );
}
