import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

/**
 * US-23 — Authentification en 2 étapes :
 * 1. Email + mot de passe  →  2. Code OTP à 6 chiffres
 */
export default function Connexion() {
  const navigate = useNavigate();
  const { connecter } = useAuth();
  const [etape, setEtape] = useState(1);
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [codeDemo, setCodeDemo] = useState('');
  const [chiffres, setChiffres] = useState(['', '', '', '', '', '']);
  const [erreur, setErreur] = useState('');
  const [info, setInfo] = useState('');
  const [chargement, setChargement] = useState(false);
  const refs = useRef([]);

  const etape1 = async (e) => {
    e.preventDefault();
    setErreur(''); setChargement(true);
    try {
      const d = await api.post('/auth/login', { email, motDePasse });
      setTempToken(d.tempToken);
      setCodeDemo(d.codeDemo || '');
      setInfo(d.message);
      setEtape(2);
      setTimeout(() => refs.current[0]?.focus(), 100);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  };

  const saisirChiffre = (i, valeur) => {
    if (!/^\d?$/.test(valeur)) return;
    const copie = [...chiffres];
    copie[i] = valeur;
    setChiffres(copie);
    if (valeur && i < 5) refs.current[i + 1]?.focus();
  };

  const toucheOtp = (i, e) => {
    if (e.key === 'Backspace' && !chiffres[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const collerCode = (e) => {
    const texte = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (texte.length === 6) {
      setChiffres(texte.split(''));
      refs.current[5]?.focus();
      e.preventDefault();
    }
  };

  const etape2 = async (e) => {
    e.preventDefault();
    setErreur(''); setChargement(true);
    try {
      const code = chiffres.join('');
      const d = await api.post('/auth/verify-otp', { tempToken, code });
      connecter(d.token, d.user);
      navigate(d.user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setErreur(err.message);
      setChiffres(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } finally {
      setChargement(false);
    }
  };

  const renvoyer = async () => {
    setErreur('');
    try {
      const d = await api.post('/auth/resend-otp', { tempToken });
      setCodeDemo(d.codeDemo || '');
      setInfo('Nouveau code envoyé ✔');
    } catch (err) {
      setErreur(err.message);
    }
  };

  return (
    <div className="ecran-auth">
      <div className="boite-auth carte anime">
        <h1 style={{ textAlign: 'center' }}>🏦 Ma Banque</h1>
        <p className="sous-titre" style={{ textAlign: 'center' }}>
          {etape === 1 ? 'Connexion sécurisée' : 'Vérification en 2 étapes'}
        </p>

        {erreur && <div className="alerte alerte-erreur">{erreur}</div>}

        {etape === 1 ? (
          <form onSubmit={etape1}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            <label>Mot de passe</label>
            <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
            <button className="btn" style={{ width: '100%', marginTop: 18 }} disabled={chargement}>
              {chargement ? 'Vérification…' : 'Se connecter →'}
            </button>
            <p style={{ textAlign: 'center', marginTop: 14, fontSize: '0.9rem' }}>
              Pas encore de profil ? <Link to="/inscription" style={{ color: 'var(--orange-fonce)', fontWeight: 700 }}>Créer un profil</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={etape2}>
            {info && <div className="alerte alerte-succes">{info}</div>}
            {codeDemo && (
              <div className="alerte" style={{ background: 'var(--surface-2)', color: 'var(--texte-2)' }}>
                🧪 Mode démo — votre code : <b style={{ letterSpacing: 4 }}>{codeDemo}</b>
              </div>
            )}
            <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>
              Saisissez le code à <b>6 chiffres</b> :
            </p>
            <div className="otp-conteneur" onPaste={collerCode}>
              {chiffres.map((c, i) => (
                <input key={i} ref={(el) => (refs.current[i] = el)} className="otp-case"
                  value={c} inputMode="numeric" maxLength={1}
                  onChange={(e) => saisirChiffre(i, e.target.value)}
                  onKeyDown={(e) => toucheOtp(i, e)} />
              ))}
            </div>
            <button className="btn" style={{ width: '100%' }} disabled={chargement || chiffres.join('').length !== 6}>
              {chargement ? 'Vérification…' : 'Valider ✔'}
            </button>
            <button type="button" className="btn btn-secondaire" style={{ width: '100%', marginTop: 10 }} onClick={renvoyer}>
              ↻ Renvoyer un code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
