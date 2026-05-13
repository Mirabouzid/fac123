import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiService } from "@/lib/api";
import {
  MapPin,
  DollarSign,
  Briefcase,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { CVUploadForm } from "@/components/candidate/cv-upload-form";

export function JobOffers() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();

    // Auto-refresh every 30 seconds to show newly validated jobs
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError("");
      // Construction des filtres à partir du searchTerm (simple pour l'instant)
      const data = await apiService.getJobs({
        position: searchTerm,
      });
      setJobs(data.jobs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Déclenchement de la recherche après un court délai (debounce) ou au changement du searchTerm
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleApplicationSuccess = (jobId: string) => {
    setAppliedJobs([...appliedJobs, jobId]);
    setSelectedJobId(null);
  };

  // Le filtrage est maintenant géré par le serveur
  const filteredJobs = jobs;

  if (loading) {
    return (
      <div className="text-center py-8 text-blue-900">
        Chargement des offres...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-900 mb-2">
          Offres d'emploi disponibles
        </h1>
        <p className="text-blue-600">
          Parcourez et postulez aux offres médicales et dentaires
        </p>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-sm font-medium text-blue-900">
              Rechercher
            </label>
            <Input
              placeholder="Rechercher par titre ou mot-clé..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-blue-200"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchJobs}
              disabled={loading}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredJobs.map((job) => (
          <Card
            key={job._id}
            className="border-blue-100 hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl text-blue-900">
                    {job.title}
                  </CardTitle>
                  <CardDescription className="text-blue-600">
                    {job.employer?.name || "Employeur inconnu"}
                  </CardDescription>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {job.contractType || job.type || "Temps plein"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">{job.description}</p>

              <div className="grid md:grid-cols-2 gap-4">
                {job.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-600">
                      {job.location}
                    </span>
                  </div>
                )}
                {job.salary?.min && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-600">
                      {job.salary.min}€ - {job.salary.max || job.salary.min}€
                    </span>
                  </div>
                )}
              </div>

              {job.requirements && job.requirements.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">
                    Prérequis :
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {job.requirements.map((req: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-600">
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Dialog
                open={selectedJobId === job._id}
                onOpenChange={(open) => setSelectedJobId(open ? job._id : null)}
              >
                <DialogTrigger asChild>
                  <Button
                    disabled={appliedJobs.includes(job._id)}
                    className={
                      appliedJobs.includes(job._id)
                        ? "bg-gray-400"
                        : "bg-blue-600 hover:bg-blue-700"
                    }
                  >
                    {appliedJobs.includes(job._id)
                      ? "Candidature envoyée"
                      : "Postuler"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Postuler à l'offre : {job.title}</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <CVUploadForm
                      jobId={job._id}
                      onSuccess={() => handleApplicationSuccess(job._id)}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <Card className="border-blue-100">
          <CardContent className="py-8 text-center">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Aucune offre trouvée pour votre recherche
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
