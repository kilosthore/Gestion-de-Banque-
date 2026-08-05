import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../api/client';
import { IconeFlottante } from '../components/ui/icone-action';
export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  const charger = () => api.get('/notifications').then((d) => setNotifications(d.notifications));
  useEffect(() => { charger(); }, []);

  const toutLire = async () => { await api.put('/notifications/tout-lu'); charger(); };
  const lire = async (id) => { await api.put(`/notifications/${id}/lue`); charger(); };

  return (
    <div>
      <div className="entete-page">
        <div>
          <h1 className="flex items-center gap-2.5">
            Notifications
            <IconeFlottante icon={Bell} className="text-primaire-600 dark:text-primaire-400" />
          </h1>
          <p className="sous-titre">Alertes de solde faible et messages importants</p>
        </div>
        {notifications.some((n) => !n.lue) && (
          <button className="btn btn-secondaire" onClick={toutLire}>Tout marquer lu ✔</button>
        )}
      </div>

      {notifications.length === 0 && <div className="carte"><p className="sous-titre !mb-0">Aucune notification.</p></div>}
      <div className="grille">
        {notifications.map((n) => (
          <div key={n._id} className={`carte ${!n.lue ? 'border-l-4 !border-l-primaire-500' : 'opacity-70'}`}>
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="font-semibold">{n.message}</p>
                <small className="text-slate-600 dark:text-primaire-400">{new Date(n.date).toLocaleString('fr-CA')}</small>
              </div>
              {!n.lue && <button className="btn btn-secondaire !px-3 !py-1.5 shrink-0" onClick={() => lire(n._id)}>Lu ✔</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
