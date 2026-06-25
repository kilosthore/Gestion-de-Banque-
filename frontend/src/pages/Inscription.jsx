import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import ProgressBar from '../components/inscription/ProgressBar';
import Etape1Personnel from '../components/inscription/Etape1Personnel';
import Etape2Coordonnees from '../components/inscription/Etape2Coordonnees';
import Etape3Pro from '../components/inscription/Etape3Pro';
import Etape4Produit from '../components/inscription/Etape4Produit';
import Etape5KYC from '../components/inscription/Etape5KYC';
import Etape6Documents from '../components/inscription/Etape6Documents';

/** US-25 — Inscription bancaire en 6 étapes (wizard)
 *  Persistance dans sessionStorage (sauf mot de passe et fichiers).
 *  Validation client par étape + validation serveur via JSON Schema (ajv). */

const CLE_STOCKAGE = 'inscription-wizard';

const DOSSIER_INITIAL = {
  informationsPersonnelles: { civilite: '', prenom: '', nom: '', dateNaissance: '', nationalite: '', lieuNaissance: '' },
  coordonnees: {
    adresseRue: '', adresseVille: '', adresseCodePostal: '', adressePays: '',
    telephoneIndicatif: '+1', telephoneNumero: '', email: '',
    motDePasse: '', confirmationMotDePasse: '',
  },
  informationsPro: {
    statutPro: '', nomEmployeur: '', dateEmbauche: '', typeContrat: '',
    siret: '', dateCreationEntreprise: '',
    revenuMensuelNet: '', chargesMensuelles: '',
  },
  produit: { typeCompte: '', decouvertAutorise: false, plafondDecouvert: 0, demandeCarte: false, typeCarte: '' },
  kyc: {
    personnePolitiquementExposee: null, doubleNationalite: false,
    deuxiemeNationalite: '', nifEtranger: '', origineFonds: '', residentFiscalUSA: null,
  },
  documents: { pieceIdentiteNom: '', justificatifDomicileNom: '' },
  consentements: { cgu: false, confidentialite: false, prelevementAutorisation: false },
};

function calculerAge(dateStr) {
  if (!dateStr) return 0;
  const naissance = new Date(dateStr);
  const diff = Date.now() - naissance.getTime();
  return diff / (365.25 * 24 * 3600 * 1000);
}

export default function Inscription() {
  const [etape, setEtape] = useState(1);
  const [dossier, setDossier] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(CLE_STOCKAGE) || 'null');
      if (saved) {
        // Ne JAMAIS restaurer le mot de passe (sécurité)
        if (saved.coordonnees) {
          saved.coordonnees.motDePasse = '';
          saved.coordonnees.confirmationMotDePasse = '';
        }
        return { ...DOSSIER_INITIAL, ...saved };
      }
    } catch { /* ignore */ }
    return DOSSIER_INITIAL;
  });
  const [erreurs, setErreurs] = useState({});
  const [enCours, setEnCours] = useState(false);
  const [numeroDossier, setNumeroDossier] = useState(null);
  const [erreurGlobale, setErreurGlobale] = useState(null);

  // Persistance auto (sauf mot de passe)
  useEffect(() => {
    const aSauver = JSON.parse(JSON.stringify(dossier));
    if (aSauver.coordonnees) {
      delete aSauver.coordonnees.motDePasse;
      delete aSauver.coordonnees.confirmationMotDePasse;
    }
    sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify(aSauver));
  }, [dossier]);

  const majSection = (section) => (champ, valeur) => {
    setDossier((d) => ({ ...d, [section]: { ...d[section], [champ]: valeur } }));
    if (erreurs[champ]) setErreurs((e) => ({ ...e, [champ]: undefined }));
  };

  /* ───── Validations par étape ───── */
  const validerEtape1 = () => {
    const e = {};
    const p = dossier.informationsPersonnelles;
    if (!p.civilite) e.civilite = 'Requis';
    if (!p.prenom || p.prenom.length < 2) e.prenom = 'Au moins 2 caractères';
    if (!p.nom || p.nom.length < 2) e.nom = 'Au moins 2 caractères';
    if (!p.dateNaissance) e.dateNaissance = 'Requis';
    else if (calculerAge(p.dateNaissance) < 18) e.dateNaissance = 'Vous devez être majeur (18 ans+)';
    if (!p.nationalite) e.nationalite = 'Requis';
    if (!p.lieuNaissance) e.lieuNaissance = 'Requis';
    return e;
  };
  const validerEtape2 = () => {
    const e = {};
    const c = dossier.coordonnees;
    if (!c.adresseRue || c.adresseRue.length < 3) e.adresseRue = 'Adresse trop courte';
    if (!c.adresseVille) e.adresseVille = 'Requis';
    if (!c.adresseCodePostal) e.adresseCodePostal = 'Requis';
    if (!c.adressePays) e.adressePays = 'Requis';
    if (!c.telephoneNumero || !/^[0-9 -]{6,20}$/.test(c.telephoneNumero)) e.telephoneNumero = 'Format invalide';
    if (!c.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) e.email = 'Email invalide';
    if (!c.motDePasse) e.motDePasse = 'Requis';
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(c.motDePasse))
      e.motDePasse = '8+ caractères avec maj, min et chiffre';
    if (c.motDePasse !== c.confirmationMotDePasse) e.confirmationMotDePasse = 'Les mots de passe ne correspondent pas';
    return e;
  };
  const validerEtape3 = () => {
    const e = {};
    const p = dossier.informationsPro;
    if (!p.statutPro) e.statutPro = 'Requis';
    if (p.statutPro === 'salarie') {
      if (!p.nomEmployeur) e.nomEmployeur = 'Requis pour un salarié';
      if (!p.dateEmbauche) e.dateEmbauche = 'Requis';
      if (!p.typeContrat) e.typeContrat = 'Requis';
    }
    if (p.statutPro === 'independant') {
      if (!p.siret || !/^[0-9]{14}$/.test(p.siret)) e.siret = 'SIRET = 14 chiffres';
      if (!p.dateCreationEntreprise) e.dateCreationEntreprise = 'Requis';
    }
    if (p.revenuMensuelNet === '' || Number(p.revenuMensuelNet) < 0) e.revenuMensuelNet = 'Requis (≥ 0)';
    return e;
  };
  const validerEtape4 = () => {
    const e = {};
    const p = dossier.produit;
    if (!p.typeCompte) e.typeCompte = 'Choisissez un type';
    if (p.demandeCarte && !p.typeCarte) e.typeCarte = 'Choisissez un type de carte';
    return e;
  };
  const validerEtape5 = () => {
    const e = {};
    const k = dossier.kyc;
    if (k.personnePolitiquementExposee === null) e.personnePolitiquementExposee = 'Requis';
    if (k.doubleNationalite && !k.deuxiemeNationalite) e.deuxiemeNationalite = 'Requis';
    if (!k.origineFonds) e.origineFonds = 'Requis';
    if (k.residentFiscalUSA === null) e.residentFiscalUSA = 'Requis';
    return e;
  };

  const validateurs = [null, validerEtape1, validerEtape2, validerEtape3, validerEtape4, validerEtape5];

  const peutSoumettre = () =>
    dossier.documents.pieceIdentiteNom &&
    dossier.documents.justificatifDomicileNom &&
    dossier.consentements.cgu &&
    dossier.consentements.confidentialite &&
    dossier.consentements.prelevementAutorisation;

  /* ───── Navigation ───── */
  const suivant = () => {
    if (etape <= 5) {
      const errs = validateurs[etape]();
      if (Object.keys(errs).length) {
        setErreurs(errs);
        return;
      }
    }
    setErreurs({});
    setErreurGlobale(null);
    setEtape((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const precedent = () => {
    setErreurs({});
    setErreurGlobale(null);
    setEtape((s) => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ───── Soumission finale ───── */
  const soumettre = async () => {
    setEnCours(true);
    setErreurGlobale(null);
    try {
      // Construire le payload conforme au JSON Schema (retire les champs frontend uniquement)
      const payload = JSON.parse(JSON.stringify(dossier));
      delete payload.coordonnees.confirmationMotDePasse;
      // Convertir les nombres stockés en string
      payload.informationsPro.revenuMensuelNet = Number(payload.informationsPro.revenuMensuelNet);
      if (payload.informationsPro.chargesMensuelles === '' || payload.informationsPro.chargesMensuelles === null) {
        delete payload.informationsPro.chargesMensuelles;
      } else {
        payload.informationsPro.chargesMensuelles = Number(payload.informationsPro.chargesMensuelles);
      }
      // Nettoyer les champs conditionnels vides
      if (payload.informationsPro.statutPro !== 'salarie') {
        delete payload.informationsPro.nomEmployeur;
        delete payload.informationsPro.dateEmbauche;
        delete payload.informationsPro.typeContrat;
      }
      if (payload.informationsPro.statutPro !== 'independant') {
        delete payload.informationsPro.siret;
        delete payload.informationsPro.dateCreationEntreprise;
      }
      if (!payload.produit.demandeCarte) delete payload.produit.typeCarte;
      if (!payload.produit.decouvertAutorise) delete payload.produit.plafondDecouvert;
      if (!payload.kyc.doubleNationalite) {
        delete payload.kyc.deuxiemeNationalite;
        delete payload.kyc.nifEtranger;
      }

      const r = await api.post('/auth/register-complet', payload);
      sessionStorage.removeItem(CLE_STOCKAGE);
      setNumeroDossier(r.numeroDossier);
    } catch (err) {
      setErreurGlobale(err.message);
    } finally {
      setEnCours(false);
    }
  };

  /* ───── Page de confirmation ───── */
  if (numeroDossier) {
    return (
      <div className="ecran-auth">
        <div className="boite-auth carte" style={{ textAlign: 'center', maxWidth: 560 }}>
          <div style={{ fontSize: '3rem' }}>✅</div>
          <h1>Dossier reçu</h1>
          <p>Votre demande d'ouverture de compte a été enregistrée avec succès.</p>
          <div style={{ background: '#fff7ed', padding: 14, borderRadius: 8, margin: '16px 0' }}>
            <p className="sous-titre" style={{ margin: 0 }}>Votre numéro de dossier :</p>
            <h2 style={{ margin: '6px 0', color: '#f97316', fontFamily: 'monospace' }}>{numeroDossier}</h2>
          </div>
          <p>📩 Un email récapitulatif vous sera envoyé à l'adresse renseignée.</p>
          <p className="sous-titre">⏱ Délai de traitement annoncé : 24 h ouvrées.</p>
          <Link to="/connexion" className="btn" style={{ marginTop: 12, display: 'inline-block' }}>
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  /* ───── Rendu du wizard ───── */
  return (
    <div className="ecran-auth">
      <div className="boite-auth carte anime" style={{ maxWidth: 720 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 8 }}>Ouvrir un compte 🏦</h1>
        <p className="sous-titre" style={{ textAlign: 'center' }}>
          6 étapes pour devenir client. Vos données sont sauvegardées automatiquement.
        </p>

        <ProgressBar current={etape} total={6} />

        {erreurGlobale && <div className="alerte alerte-erreur">{erreurGlobale}</div>}

        {etape === 1 && (
          <Etape1Personnel
            data={dossier.informationsPersonnelles}
            maj={majSection('informationsPersonnelles')}
            erreurs={erreurs}
          />
        )}
        {etape === 2 && (
          <Etape2Coordonnees
            data={dossier.coordonnees}
            maj={majSection('coordonnees')}
            erreurs={erreurs}
          />
        )}
        {etape === 3 && (
          <Etape3Pro
            data={dossier.informationsPro}
            maj={majSection('informationsPro')}
            erreurs={erreurs}
          />
        )}
        {etape === 4 && (
          <Etape4Produit
            data={dossier.produit}
            maj={majSection('produit')}
            erreurs={erreurs}
          />
        )}
        {etape === 5 && (
          <Etape5KYC
            data={dossier.kyc}
            maj={majSection('kyc')}
            erreurs={erreurs}
            nationaliteClient={dossier.informationsPersonnelles.nationalite}
            paysResidence={dossier.coordonnees.adressePays}
          />
        )}
        {etape === 6 && (
          <Etape6Documents
            data={dossier.documents}
            dossier={dossier}
            majDocuments={majSection('documents')}
            majConsentements={majSection('consentements')}
            onEditerEtape={setEtape}
          />
        )}

        {/* Navigation entre étapes */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'space-between' }}>
          {etape > 1 ? (
            <button type="button" className="btn btn-secondaire" onClick={precedent}>
              ← Précédent
            </button>
          ) : (
            <Link to="/connexion" className="btn btn-secondaire">Annuler</Link>
          )}

          {etape < 6 ? (
            <button type="button" className="btn" onClick={suivant}>
              Suivant →
            </button>
          ) : (
            <button type="button" className="btn"
              onClick={soumettre}
              disabled={enCours || !peutSoumettre()}
              title={!peutSoumettre() ? 'Téléversez vos documents et cochez les consentements' : ''}>
              {enCours ? 'Envoi en cours…' : 'Soumettre ma demande ✔'}
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: '0.85rem' }}>
          Déjà inscrit ? <Link to="/connexion" style={{ color: 'var(--orange-fonce)', fontWeight: 700 }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
