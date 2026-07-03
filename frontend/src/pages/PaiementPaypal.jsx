import { useEffect, useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { api } from '../api/client';

/** Paiement PayPal (sandbox) : dépôt sur un compte ou souscription d'un produit */
export default function PaiementPaypal() {
  const [config, setConfig] = useState(null);
  const [erreurConfig, setErreurConfig] = useState('');
  const [comptes, setComptes] = useState([]);
  const [produits, setProduits] = useState([]);
  const [usage, setUsage] = useState('depot');
  const [compteId, setCompteId] = useState('');
  const [produitId, setProduitId] = useState('');
  const [montant, setMontant] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    api.get('/paypal/config').then(setConfig).catch((e) => setErreurConfig(e.message));
    api.get('/comptes').then((d) => {
      const c = d.comptes.filter((x) => x.kind === 'Compte');
      setComptes(c);
      if (c[0]) setCompteId(c[0]._id);
    }).catch(() => {});
    api.get('/produits').then((d) => {
      setProduits(d.produits);
      if (d.produits[0]) setProduitId(d.produits[0]._id);
    }).catch(() => {});
  }, []);

  const m = Number(montant);
  const pret = m > 0 && m <= 10000 && (usage === 'depot' ? Boolean(compteId) : Boolean(produitId));

  const creerOrdre = async () => {
    setErreur('');
    setConfirmation(null);
    const d = await api.post('/paypal/orders', { usage, compteId, produitId, montant: m });
    return d.orderId;
  };

  const confirmer = async (data) => {
    try {
      const d = await api.post(`/paypal/orders/${data.orderID}/capture`, {});
      setConfirmation(d);
      setMontant('');
    } catch (e) {
      setErreur(e.message);
    }
  };

  return (
    <div data-testid="page-paypal">
      <h1 className="flex items-center gap-2.5">
        Payer avec PayPal
        <IconeFlottante icon={Wallet} className="text-primaire-600 dark:text-primaire-400" />
      </h1>
      <p className="sous-titre">Alimentez un compte ou souscrivez un produit financier (environnement sandbox)</p>

      {erreurConfig && <div className="carte" data-testid="paypal-config-erreur">⚠️ {erreurConfig}</div>}

      <div className="grille grille-2">
        <div className="carte">
          <h2>1. Que souhaitez-vous faire ?</h2>
          <div className="flex gap-2 mb-4">
            <button
              data-testid="paypal-mode-depot"
              className={usage === 'depot' ? 'btn' : 'btn btn-secondaire'}
              onClick={() => { setUsage('depot'); setConfirmation(null); setErreur(''); }}>
              💵 Dépôt sur mon compte
            </button>
            <button
              data-testid="paypal-mode-produit"
              className={usage === 'produit' ? 'btn' : 'btn btn-secondaire'}
              onClick={() => { setUsage('produit'); setConfirmation(null); setErreur(''); }}>
              📈 Souscrire un produit
            </button>
          </div>

          {usage === 'depot' ? (
            <label className="block mb-3">
              Compte à créditer
              <select data-testid="paypal-select-compte" value={compteId} onChange={(e) => setCompteId(e.target.value)}>
                {comptes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.type} ****{c.numero.slice(-4)} — {c.solde.toFixed(2)} $
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block mb-3">
              Produit financier
              <select data-testid="paypal-select-produit" value={produitId} onChange={(e) => setProduitId(e.target.value)}>
                {produits.map((p) => (
                  <option key={p._id} value={p._id}>{p.nom} ({p.type}) — {p.valeur} %</option>
                ))}
              </select>
              <span className="sous-titre block mt-1">Le montant sera crédité sur votre compte investissement (créé au besoin).</span>
            </label>
          )}

          <label className="block">
            Montant (max 10 000 $ CAD)
            <input
              data-testid="paypal-input-montant"
              type="number" min="1" max="10000" step="0.01"
              value={montant} onChange={(e) => setMontant(e.target.value)}
              placeholder="Ex. : 100" />
          </label>
        </div>

        <div className="carte">
          <h2>2. Payer</h2>
          {confirmation && (
            <div data-testid="paypal-confirmation" className="mb-3">
              <p className="text-lg font-bold">✅ {confirmation.message}</p>
              <p className="sous-titre">{confirmation.paiement?.description} — {confirmation.paiement?.montant?.toFixed(2)} $</p>
              {confirmation.compte && (
                <p data-testid="paypal-nouveau-solde">
                  Nouveau solde ({confirmation.compte.type} ****{confirmation.compte.numero.slice(-4)}) :{' '}
                  <b>{confirmation.compte.solde.toFixed(2)} $</b>
                </p>
              )}
            </div>
          )}
          {erreur && <p data-testid="paypal-erreur" className="mb-3">❌ {erreur}</p>}
          {!pret && !confirmation && <p className="sous-titre">Saisissez un montant valide pour afficher le bouton PayPal.</p>}

          {config && pret && (
            <div data-testid="paypal-boutons">
              <PayPalScriptProvider options={{ clientId: config.clientId, currency: config.devise, intent: 'capture' }}>
                <PayPalButtons
                  forceReRender={[usage, compteId, produitId, m]}
                  style={{ layout: 'vertical', label: 'paypal' }}
                  createOrder={creerOrdre}
                  onApprove={confirmer}
                  onError={(e) => setErreur(String(e?.message || e))}
                />
              </PayPalScriptProvider>
            </div>
          )}
          <p className="sous-titre mt-3">🧪 Mode sandbox : utilisez un compte acheteur de test PayPal (developer.paypal.com → Testing Tools).</p>
        </div>
      </div>
    </div>
  );
}
