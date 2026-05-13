import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { StatusBadge } from "@/components/status-badge";
import { apiService } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { ArrowLeft, Loader2 } from "lucide-react";

const contractTypes = ["CDI", "CDD", "Liberal", "Interim", "Stage"];

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formValues, setFormValues] = useState({
    title: "",
    cabinet: "",
    location: "",
    address: "",
    contactEmail: "",
    contractType: "CDI",
    salaryMin: "",
    salaryMax: "",
    description: "",
    urgency: false,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    setLoading(true);
    try {
      const data = await apiService.getJob(id!);
      const jobData = data.job;
      setJob(jobData);
      setFormValues({
        title: jobData.title || "",
        cabinet: jobData.cabinet || "",
        location: jobData.location || "",
        address: jobData.address || "",
        contactEmail: jobData.contactEmail || "",
        contractType: jobData.contractType || "CDI",
        salaryMin: jobData.salary?.min?.toString() || "",
        salaryMax: jobData.salary?.max?.toString() || "",
        description: jobData.description || "",
        urgency: Boolean(jobData.urgency),
      });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de charger l'annonce.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormValues((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        title: formValues.title,
        cabinet: formValues.cabinet,
        location: formValues.location,
        address: formValues.address,
        contactEmail: formValues.contactEmail,
        contractType: formValues.contractType,
        description: formValues.description,
        urgency: formValues.urgency,
        salary: {
          min: formValues.salaryMin ? Number(formValues.salaryMin) : undefined,
          max: formValues.salaryMax ? Number(formValues.salaryMax) : undefined,
        },
      };

      const data = await apiService.updateJob(id, updates);
      setJob(data.job);
      setEditMode(false);
      toast({
        title: "Annonce mise à jour",
        description: "Votre annonce a bien été modifiée.",
      });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de mettre à jour l'annonce.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    let deleteToast: { dismiss: () => void } | null = null;

    const confirmDelete = async () => {
      deleteToast?.dismiss();
      setDeleting(true);
      try {
        await apiService.deleteJob(id);
        toast({
          title: "Annonce supprimée",
          description: "L'annonce a bien été retirée.",
        });
        navigate("/employer");
      } catch (err: any) {
        toast({
          title: "Erreur",
          description: err.message || "Impossible de supprimer l'annonce.",
          variant: "destructive",
        });
      } finally {
        setDeleting(false);
      }
    };

    deleteToast = toast({
      title: "Confirmer la suppression",
      description: "Cliquez sur Supprimer pour confirmer.",
      variant: "destructive",
      action: (
        <ToastAction asChild>
          <button
            type="button"
            className="font-semibold"
            onClick={confirmDelete}
          >
            Supprimer
          </button>
        </ToastAction>
      ),
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Annonce introuvable.</p>
          <Button onClick={() => navigate("/employer")}>Retour</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/employer")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
          <h1 className="text-2xl font-semibold mt-4">Détails de l'annonce</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualisez, modifiez ou supprimez votre offre.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={editMode ? "outline" : "secondary"}
            size="sm"
            onClick={() => setEditMode((current) => !current)}
          >
            {editMode ? "Annuler" : "Modifier"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>{job.title}</CardTitle>
              <CardDescription>{job.cabinet}</CardDescription>
            </div>
            <StatusBadge status={job.isValidated ? "active" : "validating"} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold text-muted-foreground">
                Contrat
              </p>
              <p className="mt-1">{job.contractType}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold text-muted-foreground">
                Localisation
              </p>
              <p className="mt-1">{job.location}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold text-muted-foreground">
                Email de contact
              </p>
              <p className="mt-1">{job.contactEmail}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold text-muted-foreground">
                Adresse
              </p>
              <p className="mt-1">{job.address}</p>
            </div>
          </div>

          {job.jobDescriptionFile && (
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold text-muted-foreground">
                Fiche de poste
              </p>
              <p className="mt-2 text-sm">{job.jobDescriptionFile}</p>
            </div>
          )}

          {!editMode ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-background p-4">
                <h2 className="text-sm font-semibold">Description</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {job.description}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <h2 className="text-sm font-semibold">Salaire</h2>
                <p className="mt-2 text-sm">
                  {job.salary?.min ? `${job.salary.min} EUR/an` : "—"}
                  {job.salary?.max ? ` — ${job.salary.max} EUR/an` : ""}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <h2 className="text-sm font-semibold">Urgence</h2>
                <p className="mt-2 text-sm">{job.urgency ? "Oui" : "Non"}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Poste recherché</Label>
                  <Input
                    id="title"
                    value={formValues.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cabinet">Nom du cabinet</Label>
                  <Input
                    id="cabinet"
                    value={formValues.cabinet}
                    onChange={(e) => handleChange("cabinet", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Ville</Label>
                  <Input
                    id="location"
                    value={formValues.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Email de contact</Label>
                  <Input
                    id="contactEmail"
                    value={formValues.contactEmail}
                    onChange={(e) =>
                      handleChange("contactEmail", e.target.value)
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formValues.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="contractType">Type de contrat</Label>
                  <Select
                    value={formValues.contractType}
                    onValueChange={(value) =>
                      handleChange("contractType", value)
                    }
                  >
                    <SelectTrigger id="contractType">
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="salaryMin">Salaire min</Label>
                  <Input
                    id="salaryMin"
                    type="number"
                    value={formValues.salaryMin}
                    onChange={(e) => handleChange("salaryMin", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="salaryMax">Salaire max</Label>
                  <Input
                    id="salaryMax"
                    type="number"
                    value={formValues.salaryMax}
                    onChange={(e) => handleChange("salaryMax", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formValues.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={6}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="urgency"
                  checked={formValues.urgency}
                  onCheckedChange={(value) =>
                    handleChange("urgency", Boolean(value))
                  }
                />
                <Label htmlFor="urgency">Marquer comme urgent</Label>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
