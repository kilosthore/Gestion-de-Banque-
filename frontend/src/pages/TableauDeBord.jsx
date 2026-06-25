import { useEffect, useState } from 'react';
import { api } from '../api/client';
import SummaryHeader from '../components/dashboard/SummaryHeader';
import AccountCards from '../components/dashboard/AccountCards';
import QuickActions from '../components/dashboard/QuickActions';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import SpendingChart from '../components/dashboard/SpendingChart';
import SavingsGoals from '../components/dashboard/SavingsGoals';

/** US-04 + US-16 + US-26 — Tableau de bord moderne agrégé en un seul appel API */
export default function TableauDeBord() {
  const [summary, setSummary] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    api.get('/dashboard/summary')
      .then(setSummary)
      .catch((e) => setErreur(e.message));
  }, []);

  if (erreur) {
    return <div className="alerte alerte-erreur">Impossible de charger le tableau de bord : {erreur}</div>;
  }
  if (!summary) {
    return (
      <div className="carte" style={{ textAlign: 'center', padding: 40 }}>
        <p className="sous-titre">⏳ Chargement de votre tableau de bord…</p>
      </div>
    );
  }

  return (
    <div>
      <SummaryHeader
        user={summary.user}
        totalBalance={summary.totalBalance}
        currency={summary.currency}
        trend={summary.trend30j}
      />

      <div className="grille grille-2">
        <div>
          <AccountCards accounts={summary.accounts} />
          <RecentTransactions transactions={summary.recentTransactions} />
        </div>
        <div>
          <QuickActions />
          <SpendingChart data={summary.spendingByMonth} />
          <SavingsGoals goals={summary.topGoals} />
        </div>
      </div>
    </div>
  );
}
