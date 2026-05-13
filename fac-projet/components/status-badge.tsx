import { cn } from "@/lib/utils"

type StatusType =
  | "received"
  | "validating"
  | "qualified"
  | "archived"
  | "active"
  | "sourcing"
  | "interview"
  | "closed"
  | "urgent"
  | "pending"

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  received: {
    label: "Recu",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  validating: {
    label: "En validation",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  qualified: {
    label: "Qualifie",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  archived: {
    label: "Archive",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  active: {
    label: "Actif",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  sourcing: {
    label: "Sourcing",
    className: "bg-cyan-100 text-cyan-700 border-cyan-200",
  },
  interview: {
    label: "Entretien",
    className: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  closed: {
    label: "Cloture",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  urgent: {
    label: "Urgent",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  pending: {
    label: "En attente",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
