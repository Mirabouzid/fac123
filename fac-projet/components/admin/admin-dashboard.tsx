import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { apiService } from "@/lib/api"
import { 
  FileText, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Euro,
  Shield,
  Activity,
  TrendingUp,
  UserPlus
} from "lucide-react"

// Mocks remove from here as we use real API now

export function AdminDashboard() {
  const [adminName, setAdminName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  
  const [pendingOffers, setPendingOffers] = useState<any[]>([])
  const [pendingCandidates, setPendingCandidates] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const { toast } = useToast()

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [statsData, offersData, candidatesData, logsData] = await Promise.all([
        apiService.getAdminStats(),
        apiService.getPendingOffers(),
        apiService.getPendingApplications(),
        apiService.getAuditLog(),
      ])
      setStats(statsData.stats)
      setPendingOffers(offersData.offers || [])
      setPendingCandidates(candidatesData.applications || [])
      setAuditLogs(logsData.logs || [])
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingAdmin(true)
    try {
      await apiService.createAdmin({ name: adminName, email: adminEmail, password: adminPassword })
      toast({ title: "Succès", description: "Compte administrateur créé avec succès." })
      setShowAdminModal(false)
      setAdminName("")
      setAdminEmail("")
      setAdminPassword("")
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" })
    } finally {
      setIsCreatingAdmin(false)
    }
  }

  const handleValidateOffer = async (id: string) => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      await apiService.validateOffer(id)
      toast({ title: "Succès", description: "Offre validée avec succès" })
      fetchAllData() // Rafraîchir les stats et la liste
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectOfferClick = (id: string) => {
    setSelectedOfferId(id)
    setRejectReason("")
    setShowRejectModal(true)
  }

  const submitRejectOffer = async () => {
    if (!selectedOfferId || !rejectReason) return
    setIsProcessing(true)
    try {
      await apiService.rejectOffer(selectedOfferId, rejectReason)
      toast({ title: "Offre refusée", description: "L'employeur sera notifié" })
      fetchAllData() // Rafraîchir les stats et la liste
      setShowRejectModal(false)
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard Administrateur</h1>
        <Dialog open={showAdminModal} onOpenChange={setShowAdminModal}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Créer un Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau compte Administrateur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAdmin} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="admin-name">Nom complet</Label>
                <Input id="admin-name" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input id="admin-email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Mot de passe</Label>
                <Input id="admin-password" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={isCreatingAdmin}>
                {isCreatingAdmin ? "Création..." : "Créer l'administrateur"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-warning">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pendingOffers || 0}</p>
                <p className="text-sm text-muted-foreground">Offres en attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pendingCandidates || 0}</p>
                <p className="text-sm text-muted-foreground">Candidats à valider</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-success">
                <Euro className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.paymentsToday || 0} €</p>
                <p className="text-sm text-muted-foreground">Paiements du jour</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.rgpdAlerts || 0}</p>
                <p className="text-sm text-muted-foreground">Alertes RGPD</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending offers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Offres à valider
                </CardTitle>
                <CardDescription>File d&apos;attente de validation</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={fetchAllData}>
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
               <p className="text-sm text-muted-foreground text-center py-4">Chargement...</p>
            ) : pendingOffers.length === 0 ? (
               <p className="text-sm text-muted-foreground text-center py-4">Aucune offre en attente de validation.</p>
            ) : (
              <div className="space-y-3">
                {pendingOffers.map((offer) => (
                  <div
                    key={offer._id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div>
                      <p className="font-medium text-sm">{offer.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {offer.employer?.company || offer.cabinet || "Employeur inconnu"} - {offer.location}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Soumis le {new Date(offer.createdAt).toLocaleDateString("fr-FR")} à {new Date(offer.createdAt).toLocaleTimeString("fr-FR", { hour: '2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRejectOfferClick(offer._id)} disabled={isProcessing}>
                        Refuser
                      </Button>
                      <Button size="sm" onClick={() => handleValidateOffer(offer._id)} disabled={isProcessing}>
                        Valider
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending candidates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Candidats à valider
                </CardTitle>
                <CardDescription>Vérification des profils</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={fetchAllData}>
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Chargement...</p>
            ) : pendingCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune candidature à valider.</p>
            ) : (
              <div className="space-y-3">
                {pendingCandidates.map((candidate) => (
                  <div
                    key={candidate._id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {candidate.firstName[0]}{candidate.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{candidate.firstName} {candidate.lastName}</p>
                        <p className="text-xs text-muted-foreground">{candidate.specialty}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* AI Score badge - internal only */}
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{candidate.aiScore || "N/A"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground text-right w-24 leading-tight">Score IA<br/>Indicatif – Non décisionnel</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => apiService.archiveCandidate(candidate._id).then(fetchAllData)}>
                          Archiver
                        </Button>
                        <Button size="sm" onClick={() => apiService.qualifyCandidate(candidate._id).then(fetchAllData)}>Qualifier</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI disclaimer */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-muted">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  <strong>Score IA :</strong> Conformément à l'Article 22 du RGPD, ce score est purement indicatif. 
                  La validation finale est toujours effectuée par un humain.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser l'offre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Motif du refus</Label>
              <Textarea 
                placeholder="Ex: Salaire manquant, description incomplète..." 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>Annuler</Button>
              <Button variant="destructive" onClick={submitRejectOffer} disabled={!rejectReason || isProcessing}>Confirmer le refus</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit activity activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activité récente (Audit Log)
          </CardTitle>
          <CardDescription>Journal des dernières actions administratives</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auditLogs.slice(0, 5).map((log, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                   <Clock className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.targetLabel} - Effectué par {log.actorEmail}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleDateString("fr-FR")} {new Date(log.createdAt).toLocaleTimeString("fr-FR", { hour: '2-digit', minute:'2-digit' })}
                </span>
              </div>
            ))}
            {auditLogs.length === 0 && <p className="text-center text-sm text-muted-foreground">Aucune activité enregistrée.</p>}
          </div>
        </CardContent>
      </Card>

      {/* RGPD Alerts Alerts */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Alertes RGPD
          </CardTitle>
          <CardDescription>Profils dépassant les 24 mois de conservation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div>
                <p className="font-medium text-sm">{stats?.rgpdAlerts || 0} profils candidats à traiter</p>
                <p className="text-xs text-muted-foreground">
                  Action requise pour la conformité Article 5.1.e du RGPD
                </p>
              </div>
              <Button size="sm" variant="destructive" onClick={() => apiService.anonymizeExpired().then(fetchAllData)}>
                Tout Anonymiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
