import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, CheckCircle2, AlertCircle, FileText, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiService } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"

const specialties = [
  "Chirurgien-Dentiste",
  "Orthodontiste",
  "Assistant(e) Dentaire",
  "Medecin Generaliste",
  "Medecin Specialiste",
  "Infirmier(e)",
  "Secretaire Medical(e)",
]

const experiences = [
  "Debutant (0-2 ans)",
  "Junior (2-5 ans)",
  "Confirme (5-10 ans)",
  "Senior (10+ ans)",
]

interface CVUploadFormProps {
  jobId?: string;
  onSuccess?: () => void;
}

export function CVUploadForm({ jobId, onSuccess }: CVUploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [rgpdAccepted, setRgpdAccepted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialty: "",
    experience: "",
    city: "",
    availability: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleSelectChange = (id: string, value: string) => {
    setFormData({ ...formData, [id]: value })
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rgpdAccepted || !file) return

    setLoading(true)
    setError("")

    try {
      const payload = new FormData()
      if (jobId) payload.append("jobId", jobId)
      payload.append("firstName", formData.firstName)
      payload.append("lastName", formData.lastName)
      payload.append("email", formData.email)
      payload.append("phone", formData.phone)
      payload.append("specialty", formData.specialty)
      payload.append("experience", formData.experience)
      payload.append("city", formData.city)
      payload.append("availability", formData.availability)
      payload.append("rgpdConsent", "true")
      payload.append("cv", file) // backend multer expects "cv" field

      await apiService.submitApplication(payload)
      setSubmitted(true)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'envoi de la candidature")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Candidature déposée avec succès</h3>
          <p className="text-gray-500 mb-4">
            Un email de confirmation vous a été envoyé. Votre CV sera examiné par notre équipe sous 48h.
          </p>
          <Button onClick={() => setSubmitted(false)} variant="outline">
            Déposer un autre CV
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Déposer mon CV</CardTitle>
          <CardDescription>
            Complétez le formulaire ci-dessous pour soumettre votre candidature
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* Personal info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input id="firstName" placeholder="Jean" required value={formData.firstName} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input id="lastName" placeholder="Dupont" required value={formData.lastName} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="jean.dupont@email.com" required value={formData.email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone *</Label>
              <Input id="phone" type="tel" placeholder="06 12 34 56 78" required value={formData.phone} onChange={handleChange} />
            </div>
          </div>

          {/* Professional info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialty">Spécialité *</Label>
              <Select required value={formData.specialty} onValueChange={(v) => handleSelectChange("specialty", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez..." />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Expérience *</Label>
              <Select required value={formData.experience} onValueChange={(v) => handleSelectChange("experience", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez..." />
                </SelectTrigger>
                <SelectContent>
                  {experiences.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville souhaitée *</Label>
              <Input id="city" placeholder="Paris, Lyon, Marseille..." required value={formData.city} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="availability">Disponibilité</Label>
              <Select value={formData.availability} onValueChange={(v) => handleSelectChange("availability", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immédiate</SelectItem>
                  <SelectItem value="1month">Sous 1 mois</SelectItem>
                  <SelectItem value="3months">Sous 3 mois</SelectItem>
                  <SelectItem value="6months">Sous 6 mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CV Upload */}
          <div className="space-y-2">
            <Label>CV (PDF, DOC, DOCX) *</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400",
                file && "border-green-500 bg-green-50"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    className="text-red-500"
                  >
                    Supprimer
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="font-medium mb-1">Glissez-déposez votre CV ici</p>
                  <p className="text-sm text-gray-400 mb-3">ou</p>
                  <label htmlFor="cv-upload">
                    <Button type="button" variant="outline" asChild>
                      <span>Parcourir les fichiers</span>
                    </Button>
                    <input
                      id="cv-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RGPD Consent */}
      <Card className="border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-sm mb-2">Consentement RGPD (obligatoire)</h4>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="rgpd"
                  checked={rgpdAccepted}
                  onCheckedChange={(checked) => setRgpdAccepted(checked === true)}
                  required
                />
                <label htmlFor="rgpd" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                  J'accepte que mes données personnelles soient conservées pour une durée maximale de 24 mois
                  conformément au RGPD. Je comprends que je peux à tout moment demander la modification ou
                  la suppression de mes données en contactant le service.
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation notice */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Validation humaine requise</h4>
              <p className="text-xs text-gray-500 mt-1">
                Chaque candidature est examinée par notre équipe avant d'être transmise aux employeurs.
                Aucune décision automatisée n'est prise concernant votre profil.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={!rgpdAccepted || !file || loading}>
        {loading ? "Envoi en cours..." : "Déposer mon CV"}
      </Button>
    </form>
  )
}
