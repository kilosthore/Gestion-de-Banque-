import { useEffect, useState } from 'react';
import { api } from '../api/client';

/** US-21 — Paramètres globaux · US-22 — Réinitialiser un profil client */
export default function Admin() {
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [parametres, setParametres] = useState(null);
  const [demandesPret, setDemandesPret] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [commentaires, setCommentaires] = useState({});
  const [message, setMessage] = useState(null);

  const charger = () => {
    api.get('/admin/stats').then(setStats);
    api.get('/admin/clients').then((d) => setClients(d.clients));
    api.get('/admin/parametres').then((d) => setParametres(d.parametres));
    api.get('/admin/prets/demandes').then((d) => setDemandesPret(d.demandes));
    api.get('/admin/dossiers').then((d) => setDossiers(d.dossiers));
  };

  const deciderDossier = async (id, statut) => {
    setMessage(null);
    try {
      const d = await api.put(`/admin/dossiers/${id}`, {
        statut,
        commentaire: commentaires[`dossier-${id}`] || null,
      });
      setMessage({ type: 'succes', texte: d.message });
      setCommentaires({ ...commentaires, [`dossier-${id}`]: '' });
      charger();
    } catch (err) {
      setMessage({ type: 'erreur', texte: err.message });
    }
  };
  useEffect(charger, []);

  const deciderPret = async (id, statut) => {
    setMessage(null);
    try {
      const d = await api.put(`/admin/prets/demandes/${id}`, {
        statut,
        commentaireDecision: commentaires[id] || null,
      });
      setMessage({ type: 'succes', texte: d.message });
      setCommentaires({ ...commentaires, [id]: '' });
      charger();
    } catch (err) {
      setMessage({ type: 'erreur', texte: err.message });
    }
  };

  const enregistrerParams = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const d = await api.put('/admin/parametres', {
        seuilSoldeFaible: parametres.seuilSoldeFaible,
        devise: parametres.devise,
      });
      setMessage({ type: 'succes', texte: d.message });
    } catch (err) { setMessage({ type: 'erreur', texte: err.message }); }
  };

  const reinitialiser = async (id, nom) => {
    if (!window.confirm(`Réinitialiser le profil de ${nom} ?`)) return;
    setMessage(null);
    try {
      const d = await api.post(`/admin/clients/${id}/reinitialiser`);
      setMessage({ type: 'succes', texte: d.message });
    } catch (err) { setMessage({ type: 'erreur', texte: err.message }); }
  };

  return (
    <div>
      <h1>Administration 🛠️</h1>
      <p className="sous-titre">Paramètres globaux et gestion des profils clients</p>
      {message && <div className={`alerte alerte-${message.type}`}>{message.texte}</div>}

      {stats && (
        <div className="grille grille-3 mb-4">
          <div className="carte carte-compte text-center">
            <p className="opacity-90">Clients</p><h1 className="text-3xl">{stats.clients}</h1>
          </div>
          <div className="carte carte-compte text-center">
            <p className="opacity-90">Comptes</p><h1 className="text-3xl">{stats.comptes}</h1>
          </div>
          <div className="carte carte-compte text-center">
            <p className="opacity-90">Transactions</p><h1 className="text-3xl">{stats.transactions}</h1>
          </div>
        </div>
      )}

      <div className="grille grille-2">
        {parametres && (
          <form className="carte" onSubmit={enregistrerParams}>
            <h2>⚙️ Paramètres globaux (US-21)</h2>
            <label>Seuil de solde faible ($)</label>
            <input type="number" min="0" value={parametres.seuilSoldeFaible}
              onChange={(e) => setParametres({ ...parametres, seuilSoldeFaible: e.target.value })} />
            <label>Devise</label>
            <select value={parametres.devise} onChange={(e) => setParametres({ ...parametres, devise: e.target.value })}>
              <option value="CAD">CAD — Dollar canadien</option>
              <option value="USD">USD — Dollar américain</option>
              <option value="EUR">EUR — Euro</option>
            </select>
            <button className="btn w-full mt-4">Enregistrer ✔</button>
          </form>
        )}

        <div className="carte">
          <h2>📋 Dossiers d'inscription (US-25)</h2>
          {dossiers.length === 0 && <p className="sous-titre">Aucun dossier en attente.</p>}
          {dossiers.map((d) => {
            const di = d.donneesInscription || {};
            return (
              <div key={d._id} className="py-3 border-t border-primaire-200 dark:border-sombre-bordure">
                <div className="flex justify-between items-center">
                  <div>
                    <b>{di.informationsPersonnelles?.civilite} {di.informationsPersonnelles?.prenom} {di.informationsPersonnelles?.nom}</b>
                    <br /><small>{d.email}</small>
                    <br /><small>Dossier <code>{d.numeroDossier}</code></small>
                  </div>
                  <span className="badge" style={{
                    background: d.statutDossier === 'rejete' ? '#ef4444' : '#f59e0b',
                    color: 'white',
                  }}>
                    {d.statutDossier === 'rejete' ? '❌ Rejeté' : '⏳ En vérification'}
                  </span>
                </div>
                <p className="sous-titre !mt-2 !mb-1">
                  <em>Statut pro :</em> {di.informationsPro?.statutPro || '?'} •{' '}
                  <em>Revenu :</em> {di.informationsPro?.revenuMensuelNet || 0} $/mois •{' '}
                  <em>Compte demandé :</em> {di.produit?.typeCompte || '?'}
                </p>
                {d.statutDossier === 'en_verification' && (
                  <div className="mt-2">
                    <input type="text" placeholder="Commentaire (optionnel)"
                      value={commentaires[`dossier-${d._id}`] || ''}
                      onChange={(e) => setCommentaires({ ...commentaires, [`dossier-${d._id}`]: e.target.value })}
                    />
                    <div className="flex gap-2 mt-2">
                      <button className="btn !px-3 !py-1.5" style={{ background: '#10b981' }}
                        onClick={() => deciderDossier(d._id, 'actif')}>✅ Valider</button>
                      <button className="btn btn-danger !px-3 !py-1.5"
                        onClick={() => deciderDossier(d._id, 'rejete')}>❌ Rejeter</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="carte">
          <h2>💰 Demandes de prêt (US-24)</h2>
          {demandesPret.length === 0 && <p className="sous-titre">Aucune demande pour l'instant.</p>}
          {demandesPret.map((d) => (
            <div key={d._id} className="py-3 border-t border-primaire-200 dark:border-sombre-bordure">
              <div className="flex justify-between items-center">
                <div>
                  <b>{d.clientNom}</b> <small>({d.clientEmail})</small><br />
                  <span>{d.montant.toFixed(2)} $ sur {d.duree} mois</span>
                </div>
                <span className="badge" style={{
                  background: d.statut === 'approuvee' ? '#10b981' : d.statut === 'refusee' ? '#ef4444' : '#f59e0b',
                  color: 'white',
                }}>
                  {d.statut === 'en_attente' ? '⏳ En attente' : d.statut === 'approuvee' ? '✅ Approuvée' : '❌ Refusée'}
                </span>
              </div>
              <p className="sous-titre !mb-1 !mt-2">
                <em>Revenu mensuel :</em> {d.revenuMensuel.toFixed(2)} $ • <em>Motif :</em> {d.motif}
              </p>
              {d.statut === 'en_attente' && (
                <div className="mt-2">
                  <input type="text" placeholder="Commentaire (optionnel)"
                    value={commentaires[d._id] || ''}
                    onChange={(e) => setCommentaires({ ...commentaires, [d._id]: e.target.value })}
                  />
                  <div className="flex gap-2 mt-2">
                    <button className="btn !px-3 !py-1.5" style={{ background: '#10b981' }}
                      onClick={() => deciderPret(d._id, 'approuvee')}>✅ Approuver</button>
                    <button className="btn btn-danger !px-3 !py-1.5"
                      onClick={() => deciderPret(d._id, 'refusee')}>❌ Refuser</button>
                  </div>
                </div>
              )}
              {d.commentaireDecision && (
                <p className="sous-titre !mt-1"><em>Décision :</em> {d.commentaireDecision}</p>
              )}
            </div>
          ))}
        </div>

        <div className="carte">
          <h2>👥 Clients (US-22)</h2>
          {clients.length === 0 && <p className="sous-titre">Aucun client inscrit.</p>}
          {clients.map((c) => (
            <div key={c._id} className="flex justify-between items-center py-2.5 border-t border-primaire-200 dark:border-sombre-bordure">
              <div>
                <b>{c.prenom} {c.nom}</b><br />
                <small className="text-amber-700 dark:text-primaire-400">{c.email}</small>
              </div>
              <button className="btn btn-secondaire !px-3 !py-1.5" onClick={() => reinitialiser(c._id, c.nom)}>
                🔄 Réinitialiser
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
