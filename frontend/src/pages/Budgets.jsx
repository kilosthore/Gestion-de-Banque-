import { useEffect, useState } from 'react';
import { PieChart, Plus, Trash2, FileText, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { IconeFlottante } from '../components/ui/icone-action';

/** Libellés d'affichage des catégories (les clés = valeurs du backend) */
const LIBELLES = {
  revenus: 'Revenus', epicerie: 'Épicerie', restaurants: 'Restaurants',
  logement: 'Logement', transport: 'Transport', abonnements: 'Abonnements',
  sante: 'Santé', loisirs: 'Loisirs', virements: 'Virements', autre: 'Autre',
};
const libelle = (c) => LIBELLES[c] || c;
const dollars = (n) => `${Number(n || 0).toFixed(2)} $`;

/** Budgets intelligents : enveloppes mensuelles + rapport par catégorie */
export default function Budgets() {
  const [donnees, setDonnees] = useState({ categories: [], budgets: [], horsBudget: [] });
  const [rapport, setRapport] = useState(null);
  const [mois, setMois] = useState(() => new Date().toISOString().slice(0, 7));
  const [f, setF] = useState({ categorie: 'epicerie', plafond: '' });
  const [message, setMessage] = useState(null);

  const charger = () => {
    api.get('/budgets').then(setDonnees).catch(() => {});
  };
  useEffect(charger, []);
  useEffect(() => {
    api.get(`/budgets/rapport?mois=${mois}`).then(setRapport).catch(() => setRapport(null));
  }, [mois]);

  const definir = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const d = await api.post('/budgets', f);
      setF({ ...f, plafond: '' });
      setMessage({ type: 'succes', texte: d.message });
      charger();
    } catch (err) { setMessage({ type: 'erreur', texte: err.message }); }
  };

  const supprimer = async (categorie) => {
    setMessage(null);
    try {
      const d = await api.del(`/budgets/${categorie}`);
      setMessage({ type: 'succes', texte: d.message });
      charger();
    } catch (err) { setMessage({ type: 'erreur', texte: err.message }); }
  };

  return (
    <div>
      <h1 className="flex items-center gap-2.5">
        Budgets
        <IconeFlottante icon={PieChart} className="text-primaire-600 dark:text-primaire-400" />
      </h1>
      <p className="sous-titre">
        Vos dépenses sont catégorisées automatiquement. Fixez un plafond mensuel par
        catégorie : vous serez averti dès qu'il est dépassé.
      </p>
      {message && <div className={`alerte alerte-${message.type}`}>{message.texte}</div>}

      {/* ─── Enveloppes du mois courant ─── */}
      <div className="grille grille-3">
        {donnees.budgets.map((b) => {
          const ratio = b.plafond > 0 ? Math.min(b.depense / b.plafond, 1) : 0;
          const depasse = b.depense > b.plafond;
          return (
            <div className="carte" key={b.categorie}>
              <div className="entete-page !mb-2">
                <h2 className="!mb-0">{libelle(b.categorie)}</h2>
                <button className="btn btn-secondaire !px-2.5 !py-1.5" title="Supprimer l'enveloppe"
                  aria-label={`Supprimer l'enveloppe ${libelle(b.categorie)}`}
                  onClick={() => supprimer(b.categorie)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className={`font-bold text-lg ${depasse ? 'text-red-600 dark:text-red-300' : ''}`}>
                {dollars(b.depense)} <span className="text-sm font-normal sous-titre !mb-0">/ {dollars(b.plafond)} ce mois-ci</span>
              </p>
              <div className="progression-fond mt-2">
                <div className={`progression-barre ${depasse ? '!bg-none !bg-red-500' : ''}`}
                  style={{ width: `${ratio * 100}%` }} />
              </div>
              {depasse && (
                <p className="flex items-center gap-1.5 text-red-600 dark:text-red-300 text-sm font-semibold mt-2">
                  <AlertTriangle className="w-4 h-4" /> Plafond dépassé de {dollars(b.depense - b.plafond)}
                </p>
              )}
            </div>
          );
        })}

        {/* Nouvelle enveloppe */}
        <form className="carte" onSubmit={definir}>
          <h2 className="flex items-center gap-2"><Plus className="w-4 h-4" /> Nouvelle enveloppe</h2>
          <label htmlFor="budget-categorie">Catégorie</label>
          <select id="budget-categorie" value={f.categorie}
            onChange={(e) => setF({ ...f, categorie: e.target.value })}>
            {donnees.categories.filter((c) => c !== 'revenus').map((c) => (
              <option key={c} value={c}>{libelle(c)}</option>
            ))}
          </select>
          <label htmlFor="budget-plafond">Plafond mensuel ($)</label>
          <input id="budget-plafond" type="number" min="1" step="0.01" required
            value={f.plafond} onChange={(e) => setF({ ...f, plafond: e.target.value })} />
          <button className="btn w-full mt-4">Fixer le plafond</button>
        </form>
      </div>

      {/* ─── Dépenses hors enveloppe ─── */}
      {donnees.horsBudget.length > 0 && (
        <div className="carte mt-4">
          <h2>Dépenses du mois sans enveloppe</h2>
          <div className="flex flex-wrap gap-2">
            {donnees.horsBudget.map((h) => (
              <span key={h.categorie} className="badge">
                {libelle(h.categorie)} · {dollars(h.depense)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Rapport mensuel ─── */}
      <div className="carte mt-4">
        <div className="entete-page">
          <h2 className="flex items-center gap-2 !mb-0"><FileText className="w-5 h-5" /> Rapport mensuel</h2>
          <div>
            <label htmlFor="rapport-mois" className="sr-only">Mois du rapport</label>
            <input id="rapport-mois" type="month" value={mois}
              onChange={(e) => setMois(e.target.value)} className="!w-auto" />
          </div>
        </div>
        {rapport && rapport.lignes.length > 0 ? (
          <>
            <p className="sous-titre">
              Dépenses totales : <strong>{dollars(rapport.totalDepenses)}</strong> ·
              Revenus : <strong>{dollars(rapport.totalRevenus)}</strong>
            </p>
            <table>
              <thead>
                <tr><th>Catégorie</th><th>Dépenses</th><th>Plafond</th><th>Vs mois précédent</th><th>Opérations</th></tr>
              </thead>
              <tbody>
                {rapport.lignes.map((l) => (
                  <tr key={l.categorie}>
                    <td className="font-semibold">{libelle(l.categorie)}</td>
                    <td className={l.depassement ? 'text-red-600 dark:text-red-300 font-bold' : ''}>{dollars(l.depenses)}</td>
                    <td>{l.plafond !== null ? dollars(l.plafond) : '—'}</td>
                    <td>{l.variationDepenses !== null ? `${l.variationDepenses > 0 ? '+' : ''}${l.variationDepenses} %` : '—'}</td>
                    <td>{l.nbOperations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="sous-titre !mb-0">Aucune opération sur ce mois.</p>
        )}
      </div>
    </div>
  );
}
