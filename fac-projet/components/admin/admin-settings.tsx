import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { 
  Settings, 
  Bell, 
  Shield, 
  Clock, 
  Trash2, 
  Mail, 
  AlertTriangle,
  Save,
  RefreshCw
} from "lucide-react"

export function AdminSettings() {
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(true)
  const [emailReminders, setEmailReminders] = useState(true)
  const [retentionMonths, setRetentionMonths] = useState("24")

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Parametres administrateur
          </CardTitle>
          <CardDescription>
            Configuration de la plateforme et des automatisations RGPD
          </CardDescription>
        </CardHeader>
      </Card>

      {/* RGPD Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Parametres RGPD
          </CardTitle>
          <CardDescription>
            Gestion de la conservation et suppression des donnees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Retention period */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <Label htmlFor="retention" className="font-medium">
                  Duree de conservation des donnees
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Duree maximale avant anonymisation automatique
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="retention"
                type="number"
                value={retentionMonths}
                onChange={(e) => setRetentionMonths(e.target.value)}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">mois</span>
            </div>
          </div>

          {/* Auto delete */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-start gap-3">
              <Trash2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <Label htmlFor="autoDelete" className="font-medium">
                  Suppression automatique
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Anonymiser automatiquement les profils a expiration
                </p>
              </div>
            </div>
            <Switch
              id="autoDelete"
              checked={autoDeleteEnabled}
              onCheckedChange={setAutoDeleteEnabled}
            />
          </div>

          {/* Manual anonymization */}
          <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium">Anonymisation manuelle</h4>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Lancer manuellement le processus d&apos;anonymisation pour tous les profils eligibles.
                  Cette action est irreversible.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Verifier les profils
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Anonymiser maintenant
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Notifications et relances
          </CardTitle>
          <CardDescription>
            Configuration des emails automatiques
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email reminders */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <Label htmlFor="emailReminders" className="font-medium">
                  Relances automatiques candidats
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Envoyer des rappels aux candidats inactifs
                </p>
              </div>
            </div>
            <Switch
              id="emailReminders"
              checked={emailReminders}
              onCheckedChange={setEmailReminders}
            />
          </div>

          {/* Reminder schedule */}
          <div className="p-4 rounded-lg border">
            <h4 className="font-medium mb-3">Planning des relances</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Premiere relance</span>
                <span className="font-medium">7 jours sans activite</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Deuxieme relance</span>
                <span className="font-medium">14 jours sans activite</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Notification RGPD (pre-suppression)</span>
                <span className="font-medium">30 jours avant expiration</span>
              </div>
            </div>
          </div>

          {/* Employer notifications */}
          <div className="p-4 rounded-lg border">
            <h4 className="font-medium mb-3">Notifications employeurs</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nouvelle candidature</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Offre validee</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rappel offre inactive</span>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Parametres de paiement
          </CardTitle>
          <CardDescription>
            Configuration Stripe et tarification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priceUnlock">Prix deblocage profil (EUR)</Label>
              <Input id="priceUnlock" type="number" defaultValue="49" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceUrgent">Supplement offre urgente (EUR)</Label>
              <Input id="priceUrgent" type="number" defaultValue="25" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Les modifications de tarification seront appliquees aux nouvelles transactions uniquement.
          </p>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Annuler</Button>
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Enregistrer les parametres
        </Button>
      </div>
    </div>
  )
}
