import { Popover } from "@ark-ui/react/popover"
import { Portal } from "@ark-ui/react/portal"
import { User, LogOut, Mail, Calendar, ShieldCheck } from "lucide-react"

const initiales = (u: any) =>
  `${(u.prenom || ' ')[0] || ''}${(u.nom || ' ')[0] || ''}`.trim().toUpperCase() || 'U'

/** Popover profil utilisateur (avatar + infos + actions) — thème jaune-orange */
export function PopoverProfil({ user, onVoirProfil, onDeconnexion }: any) {
  if (!user) return null
  return (
    <Popover.Root modal>
      <Popover.Trigger
        data-testid="popover-profil-trigger"
        className="relative inline-flex items-center justify-center rounded-full border-2 border-primaire-200 dark:border-sombre-bordure bg-white dark:bg-sombre-surface p-0.5 hover:border-primaire-500 focus:outline-none focus:ring-2 focus:ring-primaire-500 focus:ring-offset-2 transition-colors"
      >
        <span className="h-8 w-8 rounded-full bg-degrade text-white flex items-center justify-center text-xs font-extrabold">
          {initiales(user)}
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-sombre-surface bg-green-400" />
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            data-testid="popover-profil-contenu"
            className="z-50 w-72 rounded-2xl border border-primaire-200 dark:border-sombre-bordure bg-white dark:bg-sombre-surface shadow-ambre-lg data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
          >
            <Popover.Arrow className="[--arrow-size:12px] [--arrow-background:rgb(var(--hue-card))]">
              <Popover.ArrowTip className="border-t border-l border-primaire-200 dark:border-sombre-bordure" />
            </Popover.Arrow>

            <div className="border-b border-primaire-200 dark:border-sombre-bordure p-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="h-10 w-10 rounded-full bg-degrade text-white flex items-center justify-center text-sm font-extrabold">
                    {initiales(user)}
                  </span>
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-sombre-surface bg-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-primaire-700 dark:text-primaire-100 !mb-0">
                    {user.prenom} {user.nom}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-primaire-400 capitalize">
                    {user.role === 'admin' ? 'Administrateur' : 'Client'}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">En ligne</p>
                </div>
              </div>
            </div>

            <div className="border-b border-primaire-200 dark:border-sombre-bordure p-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-primaire-400">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.dateCreation && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-primaire-400">
                    <Calendar className="h-4 w-4" />
                    <span>Membre depuis le {new Date(user.dateCreation).toLocaleDateString('fr-CA')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-primaire-400">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Double authentification active</span>
                </div>
              </div>
            </div>

            <div className="p-2">
              <div className="space-y-1">
                <button
                  data-testid="popover-action-profil"
                  onClick={onVoirProfil}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 dark:text-primaire-400 hover:bg-primaire-100 dark:hover:bg-sombre-surface2 focus:outline-none focus:ring-2 focus:ring-primaire-500 transition-colors"
                >
                  <User className="h-4 w-4" />
                  Voir mon profil
                </button>
                <hr className="my-1 border-primaire-200 dark:border-sombre-bordure" />
                <button
                  data-testid="popover-action-deconnexion"
                  onClick={onDeconnexion}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
