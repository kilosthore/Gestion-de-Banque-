import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

const variantes: Record<string, string> = {
  succes: "bg-green-500 text-white hover:bg-green-600",
  danger: "bg-red-500 text-white hover:bg-red-600",
  neutre: "bg-primaire-100 text-slate-600 hover:bg-primaire-200 dark:bg-sombre-surface2 dark:text-primaire-400 dark:hover:bg-sombre-bordure",
}

interface IconeActionProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  variante?: "succes" | "danger" | "neutre"
  className?: string
  testId?: string
}

/** Bouton-icône animé (hover/tap + infobulle) — même modèle que le Dock */
export function IconeAction({ icon: Icon, label, onClick, variante = "neutre", className, testId }: IconeActionProps) {
  return (
    <motion.button
      type="button"
      data-testid={testId}
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-label={label}
      className={cn(
        "relative group p-2.5 rounded-xl shadow-ambre transition-colors",
        variantes[variante],
        className
      )}
    >
      <Icon className="w-5 h-5" />
      <span className={cn(
        "absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs z-10",
        "bg-primaire-700 text-white dark:bg-primaire-100 dark:text-primaire-700",
        "opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
      )}>
        {label}
      </span>
    </motion.button>
  )
}

const flottement = {
  initial: { y: 0 },
  animate: {
    y: [-2, 2, -2],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
  },
}

/** Icône statique avec animation de flottement continue */
export function IconeFlottante({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <motion.span
      initial="initial"
      animate="animate"
      variants={flottement}
      className={cn("inline-flex items-center justify-center", className)}
    >
      <Icon className="w-6 h-6" />
    </motion.span>
  )
}
