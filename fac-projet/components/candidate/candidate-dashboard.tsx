import { useState, useEffect } from "react";
import { apiService } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import {
  Loader2,
  FileText,
  Briefcase,
  Clock,
  CheckCircle2,
} from "lucide-react";

// Mocks removed

export function CandidateDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [statsData, appsData] = await Promise.all([
        apiService.getCandidateStats(),
        apiService.getApplications(),
      ]);
      setStats(statsData.stats);
      setRecentApplications(appsData.applications || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine current step index for tracking
  const getStepIndex = (status: string) => {
    if (status === "received") return 0;
    if (status === "validating") return 1;
    if (status === "qualified") return 2;
    if (status === "archived") return 3;
    return 0;
  };

  const currentStep =
    recentApplications.length > 0
      ? getStepIndex(recentApplications[0].status)
      : -1;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-blue-900">Tableau de bord</h1>
        <p className="text-blue-600 mt-1">
          Gerez votre profil et suivez vos candidatures
        </p>
      </div>

      {/* Stats Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg text-blue-600 bg-blue-50">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">
                  {stats?.total > 0 ? 1 : 0}
                </p>
                <p className="text-sm text-blue-600">CV Actif</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg text-blue-500 bg-blue-50">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">
                  {stats?.total || 0}
                </p>
                <p className="text-sm text-blue-600">Candidatures</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg text-amber-500 bg-amber-50">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">
                  {stats?.pending || 0}
                </p>
                <p className="text-sm text-blue-600">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg text-emerald-500 bg-emerald-50">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">
                  {stats?.interviews || 0}
                </p>
                <p className="text-sm text-blue-600">Entretiens</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Application tracking */}
      <Card className="border-blue-100">
        <CardHeader>
          <CardTitle className="text-blue-900">Suivi de candidature</CardTitle>
          <CardDescription className="text-blue-600">
            Progression de vos candidatures en cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6 px-4">
            {["Reçu", "En validation", "Qualifié", "Archivé"].map((step, i) => (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      i <= currentStep
                        ? "bg-blue-600 text-white"
                        : "bg-blue-100 text-blue-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="text-xs mt-1 text-blue-600">{step}</span>
                </div>
                {i < 3 && (
                  <div
                    className={`h-0.5 w-12 lg:w-24 mx-2 ${i < currentStep ? "bg-blue-600" : "bg-blue-100"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent applications */}
      <Card className="border-blue-100">
        <CardHeader>
          <CardTitle className="text-blue-900">
            Mes candidatures recentes
          </CardTitle>
          <CardDescription className="text-blue-600">
            Vos dernieres candidatures et leur statut
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : recentApplications.length === 0 ? (
              <p className="text-center text-blue-600 py-8">
                Vous n'avez pas encore de candidatures.
              </p>
            ) : (
              recentApplications.map((app) => (
                <div
                  key={app._id}
                  className="flex items-center justify-between p-4 rounded-lg border border-blue-100 bg-white hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">
                      {app.job?.title || app.specialty}
                    </h4>
                    <p className="text-sm text-blue-600">
                      {app.job?.cabinet || "Profil Qualifié"} -{" "}
                      {app.job?.location || app.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-blue-500 hidden sm:block">
                      {new Date(app.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                    <StatusBadge status={app.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* RGPD Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-sm text-blue-900">
                Protection de vos donnees (RGPD)
              </h4>
              <p className="text-xs text-blue-600 mt-1">
                Votre CV et vos informations personnelles sont conserves pour
                une duree maximale de 24 mois. Vous pouvez a tout moment
                demander leur suppression ou modification.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
