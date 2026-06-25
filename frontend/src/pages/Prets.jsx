import { useEffect, useState } from 'react';
import { api } from '../api/client';

/** US-24 — Demandes de prêt : soumission + historique avec statuts */
export default function Prets() {
  const [demandes, setDemandes] = useState([]);
  const [f, setF] = useState({ montant: '', duree: '', motif: '', revenuMensuel: '' });
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const charger = () => {
    api.get('/prets/demandes').then((d) => setDemandes(d.demandes));
  };
  useEffect(charger, []);

  const soumettre = async (e) => {
    e.preventDefault();
    setMessage(null);
    setEnCours(true);
    try {
      const d = await api.post('/prets/demandes', {
        montant: f.montant,
        duree: f.duree,
        motif: f.motif,
        revenuMensuel: f.revenuMensuel,
      });
      setMessage({ type: 'succes', texte: d.message });
      setF({ montant: '', duree: '', motif: '', revenuMensuel: '' });
      charger();
    } catch (err) {
      setMessage({ type: 'erreur', texte: err.message });
    } finally {
      setEnCours(false);
    }
  };

  const badgeStatut = (statut) => {
    if (statut === 'approuvee') return <span className="badge" style={{ background: '#10b981', color: 'white' }}>✅ Approuvée</span>;
    if (statut === 'refusee') return <span className="badge" style={{ background: '#ef4444', color: 'white' }}>❌ Refusée</span>;
    return <span className="badge" style={{ background: '#f59e0b', color: 'white' }}>⏳ En attente</span>;
  };

  const aUneDemandeEnAttente = demandes.some((d) => d.statut === 'en_attente');

  return (
    <div>
      <h1>Demandes de prêt 💰</h1>
      <p className="sous-titre">Soumettez une demande de prêt et suivez son statut (US-24)</p>
      {message && <div className={`alerte alerte-${message.type}`}>{message.texte}</div>}

      <div className="grille grille-2">
        <form className="carte" onSubmit={soumettre}>
          <h2>📝 Nouvelle demande</h2>
          {aUneDemandeEnAttente && (
            <div className="alerte alerte-info">
              Vous avez déjà une demande en attente. Patientez la décision avant d'en soumettre une nouvelle.
            </div>
          )}
          <label>Montant souhaité ($)</label>
          <input type="number" min="1" max="1000000" step="0.01" required
            value={f.montant}
            onChange={(e) => setF({ ...f, montant: e.target.value })}
            disabled={aUneDemandeEnAttente}
          />
          <label>Durée (mois, 1 à 360)</label>
          <input type="number" min="1" max="360" required
            value={f.duree}
            onChange={(e) => setF({ ...f, duree: e.target.value })}
            disabled={aUneDemandeEnAttente}
          />
          <label>Revenu mensuel net ($)</label>
          <input type="number" min="0" step="0.01" required
            value={f.revenuMensuel}
            onChange={(e) => setF({ ...f, revenuMensuel: e.target.value })}
            disabled={aUneDemandeEnAttente}
          />
          <label>Motif (projet, achat, etc.)</label>
          <textarea required maxLength={500} rows={3}
            value={f.motif}
            onChange={(e) => setF({ ...f, motif: e.target.value })}
            disabled={aUneDemandeEnAttente}
            placeholder="Ex. : Achat véhicule, rénovation maison, études…"
          />
          <button className="btn w-full mt-4" disabled={enCours || aUneDemandeEnAttente}>
            {enCours ? 'Envoi en cours…' : 'Envoyer la demande ✔'}
          </button>
        </form>

        <div className="carte">
          <h2>📜 Historique de mes demandes</h2>
          {demandes.length === 0 && <p className="sous-titre">Aucune demande pour l'instant.</p>}
          {demandes.map((d) => (
            <div key={d._id} className="py-3 border-t border-primaire-200 dark:border-sombre-bordure">
              <div className="flex justify-between items-center">
                <b>{d.montant.toFixed(2)} $ sur {d.duree} mois</b>
                {badgeStatut(d.statut)}
              </div>
              <p className="sous-titre !mb-1">
                Demandé le {new Date(d.dateDemande).toLocaleDateString('fr-CA')}
                {d.dateDecision && ` • Décision le ${new Date(d.dateDecision).toLocaleDateString('fr-CA')}`}
              </p>
              <p className="!mb-1"><em>Motif :</em> {d.motif}</p>
              {d.commentaireDecision && (
                <p className="!mb-1 text-amber-700 dark:text-primaire-400">
                  <em>Décision admin :</em> {d.commentaireDecision}
                </p>
              )}
              {d.statut === 'approuvee' && (
                <p className="text-emerald-700 dark:text-emerald-400">
                  ✓ Compte prêt crédité de {d.montant.toFixed(2)} $
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
