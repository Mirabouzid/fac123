import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Shield, 
  Search, 
  Download, 
  User, 
  FileText, 
  CreditCard, 
  Trash2, 
  Eye, 
  CheckCircle2,
  XCircle,
  Clock,
  Filter
} from "lucide-react"
import { cn } from "@/lib/utils"

type ActionType = "validation" | "payment" | "access" | "deletion" | "modification" | "rejection"

interface AuditEntry {
  id: number
  timestamp: string
  user: string
  userRole: "admin" | "employer" | "candidate" | "system"
  action: ActionType
  target: string
  details: string
  ip: string
}

const auditLog: AuditEntry[] = [
  {
    id: 1,
    timestamp: "2024-01-15 14:32:15",
    user: "Admin Sophie M.",
    userRole: "admin",
    action: "validation",
    target: "Offre #1234",
    details: "Validation de l'offre Chirurgien-Dentiste - Cabinet Saint-Michel",
    ip: "192.168.1.***"
  },
  {
    id: 2,
    timestamp: "2024-01-15 14:15:42",
    user: "Cabinet Dentaire Paris",
    userRole: "employer",
    action: "payment",
    target: "Candidat #5678",
    details: "Deblocage profil Dr. Martin D. - 49 EUR via Stripe",
    ip: "85.123.***"
  },
  {
    id: 3,
    timestamp: "2024-01-15 13:45:00",
    user: "Admin Sophie M.",
    userRole: "admin",
    action: "access",
    target: "CV #9012",
    details: "Consultation du CV de A. Laurent pour verification",
    ip: "192.168.1.***"
  },
  {
    id: 4,
    timestamp: "2024-01-15 12:30:18",
    user: "Systeme",
    userRole: "system",
    action: "deletion",
    target: "Candidat #3456",
    details: "Anonymisation automatique - Conservation > 24 mois (RGPD)",
    ip: "127.0.0.1"
  },
  {
    id: 5,
    timestamp: "2024-01-15 11:20:33",
    user: "Admin Jean P.",
    userRole: "admin",
    action: "rejection",
    target: "Offre #7890",
    details: "Rejet de l'offre - Informations incompletes",
    ip: "192.168.1.***"
  },
  {
    id: 6,
    timestamp: "2024-01-15 10:05:12",
    user: "Centre Excellence Lyon",
    userRole: "employer",
    action: "modification",
    target: "Offre #2345",
    details: "Modification du salaire propose (35k -> 38k EUR)",
    ip: "91.234.***"
  },
  {
    id: 7,
    timestamp: "2024-01-15 09:45:00",
    user: "Dr. Petit S.",
    userRole: "candidate",
    action: "deletion",
    target: "Profil #4567",
    details: "Demande de suppression de donnees (droit a l'oubli)",
    ip: "78.190.***"
  },
  {
    id: 8,
    timestamp: "2024-01-14 17:30:00",
    user: "Admin Sophie M.",
    userRole: "admin",
    action: "validation",
    target: "Candidat #8901",
    details: "Qualification du profil C. Moreau - Secretaire Medical(e)",
    ip: "192.168.1.***"
  },
]

const actionConfig: Record<ActionType, { icon: React.ElementType; color: string; label: string }> = {
  validation: { icon: CheckCircle2, color: "text-success bg-success/10", label: "Validation" },
  payment: { icon: CreditCard, color: "text-primary bg-primary/10", label: "Paiement" },
  access: { icon: Eye, color: "text-blue-500 bg-blue-500/10", label: "Acces" },
  deletion: { icon: Trash2, color: "text-destructive bg-destructive/10", label: "Suppression" },
  modification: { icon: FileText, color: "text-amber-500 bg-amber-500/10", label: "Modification" },
  rejection: { icon: XCircle, color: "text-destructive bg-destructive/10", label: "Rejet" },
}

const roleColors: Record<string, string> = {
  admin: "bg-indigo-100 text-indigo-700",
  employer: "bg-emerald-100 text-emerald-700",
  candidate: "bg-blue-100 text-blue-700",
  system: "bg-gray-100 text-gray-700",
}

export function AuditLog() {
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  const filteredLog = auditLog.filter((entry) => {
    const matchesSearch = 
      entry.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.target.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAction = actionFilter === "all" || entry.action === actionFilter
    const matchesRole = roleFilter === "all" || entry.userRole === roleFilter
    return matchesSearch && matchesAction && matchesRole
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Journal d&apos;audit
              </CardTitle>
              <CardDescription>
                Tracabilite complete de toutes les actions - Conformite RGPD
              </CardDescription>
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type d'action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                <SelectItem value="validation">Validation</SelectItem>
                <SelectItem value="payment">Paiement</SelectItem>
                <SelectItem value="access">Acces</SelectItem>
                <SelectItem value="deletion">Suppression</SelectItem>
                <SelectItem value="modification">Modification</SelectItem>
                <SelectItem value="rejection">Rejet</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="employer">Employeur</SelectItem>
                <SelectItem value="candidate">Candidat</SelectItem>
                <SelectItem value="system">Systeme</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Log entries */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredLog.map((entry) => {
              const config = actionConfig[entry.action]
              const Icon = config.icon
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className={cn("p-2 rounded-lg", config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{entry.user}</span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        roleColors[entry.userRole]
                      )}>
                        {entry.userRole === "admin" ? "Admin" :
                         entry.userRole === "employer" ? "Employeur" :
                         entry.userRole === "candidate" ? "Candidat" : "Systeme"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {config.label}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{entry.details}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {entry.timestamp}
                      </span>
                      <span>Cible: {entry.target}</span>
                      <span>IP: {entry.ip}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pagination info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>{filteredLog.length} entree{filteredLog.length > 1 ? "s" : ""} affichee{filteredLog.length > 1 ? "s" : ""}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            Precedent
          </Button>
          <Button variant="outline" size="sm">
            Suivant
          </Button>
        </div>
      </div>

      {/* RGPD compliance notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Conformite RGPD</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Ce journal conserve une trace de toutes les operations effectuees sur les donnees personnelles.
                Les logs sont conserves 3 ans conformement aux obligations legales. Les adresses IP sont partiellement masquees.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
