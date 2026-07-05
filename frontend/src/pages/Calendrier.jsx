import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, RotateCw } from 'lucide-react';
import { api } from '../api/client';
import { IconeAction, IconeFlottante } from '../components/ui/icone-action';

const NOMS_MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/** Projette les occurrences d'une transaction récurrente dans le mois affiché */
function occurrencesDuMois(tx, annee, mois) {
  const dates = [];
  const debut = new Date(annee, mois, 1);
  const fin = new Date(annee, mois + 1, 1);
  let d = new Date(tx.prochaineDate);
  let garde = 0;
  while (d < fin && garde < 120) {
    if (d >= debut) dates.push(new Date(d));
    if (tx.recurrence === 'hebdomadaire') {
      d = new Date(d.getTime() + 7 * 86400000);
    } else {
      d = new Date(d);
      d.setMonth(d.getMonth() + 1);
    }
    garde += 1;
  }
  return dates;
}

/** Calendrier des opérations futures (transactions planifiées / récurrentes) */
export default function Calendrier() {
  const maintenant = new Date();
  const [annee, setAnnee] = useState(maintenant.getFullYear());
  const [mois, setMois] = useState(maintenant.getMonth());
  const [planifiees, setPlanifiees] = useState([]);
  const [message, setMessage] = useState(null);

  const charger = () => api.get('/transactions/planifiees').then((d) => setPlanifiees(d.transactions)).catch(() => {});
  useEffect(() => { charger(); }, []);

  const evenements = useMemo(() => {
    const map = {};
    planifiees.forEach((tx) => {
      occurrencesDuMois(tx, annee, mois).forEach((d) => {
        const j = d.getDate();
        (map[j] = map[j] || []).push(tx);
      });
    });
    return map;
  }, [planifiees, annee, mois]);

  const precedent = () => {
    if (mois === 0) { setMois(11); setAnnee(annee - 1); } else setMois(mois - 1);
  };
  const suivant = () => {
    if (mois === 11) { setMois(0); setAnnee(annee + 1); } else setMois(mois + 1);
  };

  const annuler = async (id) => {
    setMessage(null);
    try {
      const d = await api.del(`/transactions/planifiees/${id}`);
      setMessage({ type: 'succes', texte: d.message });
      charger();
    } catch (e) { setMessage({ type: 'erreur', texte: e.message }); }
  };

  const premierJour = new Date(annee, mois, 1).getDay();
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const cases = [...Array(premierJour).fill(null), ...Array.from({ length: nbJours }, (_, i) => i + 1)];
  const estAujourdhui = (j) =>
    j === maintenant.getDate() && mois === maintenant.getMonth() && annee === maintenant.getFullYear();

  const prochaines = [...planifiees].sort((a, b) => new Date(a.prochaineDate) - new Date(b.prochaineDate));

  return (
    <div data-testid="page-calendrier">
      <div className="entete-page">
        <div>
          <h1 className="flex items-center gap-2.5">
            Calendrier
            <IconeFlottante icon={CalendarDays} className="text-primaire-600 dark:text-primaire-400" />
          </h1>
          <p className="sous-titre">Visualisez vos opérations futures et transactions récurrentes</p>
        </div>
        <Link to="/operations" className="btn flex items-center gap-2" data-testid="calendrier-planifier">
          <Plus className="w-4 h-4" /> Planifier une opération
        </Link>
      </div>

      {message && <div className={`alerte alerte-${message.type}`}>{message.texte}</div>}

      <div className="grille" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <div className="carte">
          <div className="flex items-center justify-between mb-3">
            <IconeAction icon={ChevronLeft} label="Mois précédent" variante="neutre"
              testId="calendrier-mois-precedent" onClick={precedent} />
            <h2 className="!mb-0" data-testid="calendrier-titre-mois">{NOMS_MOIS[mois]} {annee}</h2>
            <IconeAction icon={ChevronRight} label="Mois suivant" variante="neutre"
              testId="calendrier-mois-suivant" onClick={suivant} />
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {JOURS.map((j) => (
              <div key={j} className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-primaire-400 py-1">{j}</div>
            ))}
            {cases.map((j, i) => {
              if (j === null) return <div key={`v-${i}`} />;
              const evts = evenements[j] || [];
              const total = evts.reduce((s, t) => s + t.montant, 0);
              return (
                <div key={j} data-testid={`calendrier-jour-${j}`}
                  className={`min-h-[72px] rounded-xl border p-1.5 text-left transition-colors
                    ${estAujourdhui(j)
                      ? 'border-primaire-500 bg-primaire-100 dark:bg-sombre-surface2'
                      : 'border-primaire-200 dark:border-sombre-bordure'}
                    ${evts.length > 0 ? 'hover:border-primaire-500' : ''}`}>
                  <span className={`text-sm font-bold ${estAujourdhui(j) ? 'text-primaire-600 dark:text-primaire-400' : ''}`}>{j}</span>
                  {evts.length > 0 && (
                    <div className="mt-1">
                      <span className="badge badge-debit !text-[10px]">
                        {evts.length} op. · {total.toFixed(0)} $
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="carte">
          <h2 className="flex items-center gap-2"><RotateCw className="w-5 h-5" /> Prochaines échéances</h2>
          {prochaines.length === 0 && (
            <p className="sous-titre">
              Aucune opération planifiée. Utilisez « Planifier une opération » pour créer une transaction récurrente.
            </p>
          )}
          {prochaines.map((t) => (
            <div key={t._id} className="flex justify-between items-center py-2.5 border-t border-primaire-200 dark:border-sombre-bordure">
              <div>
                <b>{t.description}</b>
                <br />
                <small className="text-slate-600 dark:text-primaire-400">
                  {t.recurrence === 'hebdomadaire' ? 'Chaque semaine' : 'Chaque mois'} ·
                  prochaine : {new Date(t.prochaineDate).toLocaleDateString('fr-CA')}
                </small>
                <br />
                <span className="badge badge-debit mt-1">−{t.montant.toFixed(2)} $</span>
              </div>
              <IconeAction icon={Trash2} label="Annuler cette opération" variante="danger"
                testId={`annuler-planifiee-${t._id}`} onClick={() => annuler(t._id)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
