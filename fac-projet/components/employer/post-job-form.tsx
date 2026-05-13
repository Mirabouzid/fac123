import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Shield,
  Clock,
} from "lucide-react";
import { apiService } from "@/lib/api";
import { cn } from "@/lib/utils";

const positions = [
  "Chirurgien-Dentiste",
  "Orthodontiste",
  "Assistant(e) Dentaire",
  "Medecin Generaliste",
  "Medecin Specialiste",
  "Infirmier(e)",
  "Secretaire Medical(e)",
];

const contractTypes = ["CDI", "CDD", "Liberal", "Interim", "Stage"];

export function PostJobForm() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formValues, setFormValues] = useState({
    cabinet: "",
    city: "",
    address: "",
    contactEmail: "",
    title: "",
    contractType: "CDI",
    salaryMin: "",
    salaryMax: "",
    description: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = new FormData();
      payload.append("cabinet", formValues.cabinet);
      payload.append("location", formValues.city);
      payload.append("address", formValues.address);
      payload.append("contactEmail", formValues.contactEmail);
      payload.append("title", formValues.title);
      payload.append("contractType", formValues.contractType);
      payload.append("salaryMin", formValues.salaryMin);
      payload.append("salaryMax", formValues.salaryMax);
      payload.append("description", formValues.description);
      payload.append("urgency", isUrgent ? "true" : "false");
      payload.append("requirements", JSON.stringify([]));
      if (file) {
        payload.append("jobDescriptionFile", file);
      }

      await apiService.submitJob(payload);
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err.message ||
          "Une erreur est survenue lors de la soumission de l'annonce",
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            Annonce soumise avec succes
          </h3>
          <p className="text-muted-foreground mb-4">
            Votre annonce sera examinee par notre equipe sous 24-48h avant
            publication.
          </p>
          <Button onClick={() => setSubmitted(false)} variant="outline">
            Deposer une autre annonce
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Deposer une annonce</CardTitle>
          <CardDescription>
            Completez le formulaire pour publier votre offre d&apos;emploi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cabinet info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cabinetName">Nom du cabinet *</Label>
              <Input
                id="cabinetName"
                placeholder="Cabinet Dentaire Saint-Michel"
                required
                value={formValues.cabinet}
                onChange={(e) => handleChange("cabinet", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville *</Label>
              <Input
                id="city"
                placeholder="Paris"
                required
                value={formValues.city}
                onChange={(e) => handleChange("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse complete</Label>
              <Input
                id="address"
                placeholder="12 Rue de la Sante, 75006 Paris"
                value={formValues.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email de contact *</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="recrutement@cabinet.fr"
                required
                value={formValues.contactEmail}
                onChange={(e) => handleChange("contactEmail", e.target.value)}
              />
            </div>
          </div>

          {/* Job info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Poste recherche *</Label>
              <Select
                required
                value={formValues.title}
                onValueChange={(value) => handleChange("title", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionnez..." />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract">Type de contrat *</Label>
              <Select
                required
                value={formValues.contractType}
                onValueChange={(value) => handleChange("contractType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionnez..." />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryMin">Salaire minimum (EUR/an)</Label>
              <Input
                id="salaryMin"
                type="number"
                placeholder="40000"
                value={formValues.salaryMin}
                onChange={(e) => handleChange("salaryMin", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryMax">Salaire maximum (EUR/an)</Label>
              <Input
                id="salaryMax"
                type="number"
                placeholder="60000"
                value={formValues.salaryMax}
                onChange={(e) => handleChange("salaryMax", e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description du poste *</Label>
            <Textarea
              id="description"
              placeholder="Decrivez le poste, les missions, le profil recherche..."
              rows={5}
              required
              value={formValues.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          {/* Urgent toggle */}
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
            <Checkbox
              id="urgent"
              checked={isUrgent}
              onCheckedChange={(checked) => setIsUrgent(checked === true)}
            />
            <div className="flex-1">
              <label
                htmlFor="urgent"
                className="font-medium text-sm cursor-pointer flex items-center gap-2"
              >
                <Clock className="h-4 w-4 text-destructive" />
                Marquer comme urgent
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Les offres urgentes sont mises en avant et notifiees aux
                candidats
              </p>
            </div>
          </div>

          {/* Fiche de poste upload */}
          <div className="space-y-2">
            <Label>Fiche de poste (optionnel)</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
                file && "border-success bg-success/5",
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-6 w-6 text-success" />
                  <div className="text-left">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    className="text-destructive"
                  >
                    Supprimer
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium mb-1">
                    Glissez-deposez votre fiche de poste
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    PDF, DOC, DOCX (max 5 MB)
                  </p>
                  <label htmlFor="job-description-upload">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>Parcourir</span>
                    </Button>
                    <input
                      id="job-description-upload"
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

      {/* Validation notice */}
      <Card className="bg-muted/50 border-muted">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">
                Validation humaine requise
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Chaque annonce est verifiee par notre equipe avant publication
                (24-48h). Vous recevrez une notification par email une fois
                l&apos;annonce validee.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RGPD */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Engagement RGPD</h4>
              <p className="text-xs text-muted-foreground mt-1">
                En deposant cette annonce, vous vous engagez a respecter la
                reglementation RGPD concernant le traitement des candidatures
                recues.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Publication en cours..." : "Soumettre l'annonce"}
      </Button>
    </form>
  );
}
