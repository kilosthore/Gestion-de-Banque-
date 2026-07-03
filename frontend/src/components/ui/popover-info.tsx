import { Popover } from "@ark-ui/react/popover"
import { Portal } from "@ark-ui/react/portal"
import { Info } from "lucide-react"

/** Petit popover d'information (icône ⓘ) — thème jaune-orange */
export function PopoverInfo({ titre, description }: { titre: string; description: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        data-testid="popover-info-trigger"
        className="inline-flex items-center justify-center rounded-lg border border-primaire-200 dark:border-sombre-bordure bg-white dark:bg-sombre-surface p-2 text-amber-700 dark:text-primaire-400 hover:bg-primaire-100 dark:hover:bg-sombre-surface2 focus:outline-none focus:ring-2 focus:ring-primaire-500 focus:ring-offset-2 transition-colors"
      >
        <Info className="h-4 w-4" />
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            data-testid="popover-info-contenu"
            className="z-50 w-64 rounded-2xl border border-primaire-200 dark:border-sombre-bordure bg-white dark:bg-sombre-surface p-3 shadow-ambre-lg data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
          >
            <Popover.Arrow className="[--arrow-size:12px] [--arrow-background:rgb(var(--hue-card))]">
              <Popover.ArrowTip className="border-t border-l border-primaire-200 dark:border-sombre-bordure" />
            </Popover.Arrow>
            <Popover.Title className="mb-2 text-sm font-bold text-amber-950 dark:text-primaire-100">
              {titre}
            </Popover.Title>
            <Popover.Description className="text-sm text-amber-700 dark:text-primaire-400">
              {description}
            </Popover.Description>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
