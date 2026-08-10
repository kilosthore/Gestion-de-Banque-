import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import FondAnime from '../components/ui/background-paths';
import marqueSombre from '../assets/torcolbank-mark-sombre.svg';

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
      // Code temporaire délivré par l'admin → choix d'un vrai mot de passe obligatoire
      if (d.user.doitChangerMotDePasse) return navigate('/profil');
      navigate(d.user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setErreur(err.message);
      setChiffres(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } finally {
      setChargement(false);
    }
  };

  /* Mot de passe oublié : l'utilisateur reçoit un code temporaire à 6 chiffres,
     qu'il utilise comme mot de passe à l'étape 1. `doitChangerMotDePasse` le
     redirige ensuite vers /profil pour en choisir un vrai (cf. etape2). */
  const oubli = async (e) => {
    e.preventDefault();
    setErreur(''); setChargement(true);
    try {
      const d = await api.post('/auth/mot-de-passe-oublie', { email });
      setInfo(d.message);
      setCodeDemo(d.codeTemporaireDemo || '');
      setEtape('oubli-envoye');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  };

  // Retour au formulaire de connexion depuis l'écran « mot de passe oublié »
  const retourConnexion = () => {
    setEtape(1); setErreur(''); setInfo(''); setCodeDemo(''); setMotDePasse('');
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
    <div className="ecran-auth relative">
      <FondAnime className="z-0" />
      <div className="boite-auth carte anime">
        <h1 className="flex items-center justify-center gap-2">
          <img src={marqueSombre} alt="" className="w-8 h-8" aria-hidden="true" />
          <span className="texte-or">TorcolBank</span>
        </h1>
        <p className="sous-titre" style={{ textAlign: 'center' }}>
          {{
            1: 'Connexion sécurisée',
            2: 'Vérification en 2 étapes',
            oubli: 'Mot de passe oublié',
            'oubli-envoye': 'Vérifiez votre boîte mail',
          }[etape]}
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
            <p style={{ textAlign: 'center', marginTop: 12, fontSize: '0.9rem' }}>
              <button type="button" onClick={() => { setEtape('oubli'); setErreur(''); }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                         color: '#A9BAD4', textDecoration: 'underline', font: 'inherit' }}>
                Mot de passe oublié ?
              </button>
            </p>
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: '0.9rem' }}>
              Pas encore de profil ? <Link to="/inscription" style={{ color: '#DFA76B', fontWeight: 700 }}>Créer un profil</Link>
            </p>
          </form>
        ) : etape === 'oubli' ? (
          <form onSubmit={oubli}>
            <p style={{ fontSize: '0.9rem', marginBottom: 14, color: '#A9BAD4' }}>
              Saisissez l’adresse de votre profil. Si un compte y correspond, vous
              recevrez un <b>code temporaire à 6 chiffres</b> pour vous reconnecter
              et choisir un nouveau mot de passe.
            </p>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            <button className="btn" style={{ width: '100%', marginTop: 18 }} disabled={chargement}>
              {chargement ? 'Envoi…' : 'Recevoir un code temporaire'}
            </button>
            <button type="button" className="btn btn-secondaire" style={{ width: '100%', marginTop: 10 }}
              onClick={retourConnexion}>
              ← Retour à la connexion
            </button>
          </form>
        ) : etape === 'oubli-envoye' ? (
          <div>
            {info && <div className="alerte alerte-succes">{info}</div>}
            {codeDemo && (
              <div className="alerte" style={{ background: 'rgba(255,255,255,0.08)', color: '#D5DDEA' }}>
                🧪 Mode démo — code temporaire : <b style={{ letterSpacing: 4 }}>{codeDemo}</b>
              </div>
            )}
            <p style={{ fontSize: '0.9rem', color: '#A9BAD4' }}>
              Utilisez ce code <b>comme mot de passe</b> pour vous connecter. Il vous
              sera ensuite demandé d’en choisir un nouveau.
            </p>
            <button type="button" className="btn" style={{ width: '100%', marginTop: 18 }}
              onClick={retourConnexion}>
              Se connecter avec le code →
            </button>
          </div>
        ) : (
          <form onSubmit={etape2}>
            {info && <div className="alerte alerte-succes">{info}</div>}
            {codeDemo && (
              <div className="alerte" style={{ background: 'rgba(255,255,255,0.08)', color: '#D5DDEA' }}>
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
