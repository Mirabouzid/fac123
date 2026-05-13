import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import {
  Lock,
  Eye,
  CreditCard,
  User,
  GripVertical,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { apiService } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { StripePaymentForm } from "./stripe-payment-form";

// Initialisation de Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

type PipelineStage =
  | "validating"
  | "active"
  | "sourcing"
  | "interview"
  | "closed";

interface Candidate {
  id: string;
  name: string;
  initials: string;
  position: string;
  score: number;
  email: string;
  phone: string;
  stage: PipelineStage;
  appliedAt: string;
  unlocked: boolean;
  jobId: string;
  cvFile?: string;
  rgpdExpiresAt?: string;
}

const stages: { key: PipelineStage; label: string; color: string }[] = [
  { key: "validating", label: "Nouveaux", color: "bg-amber-500" },
  { key: "active", label: "En revue", color: "bg-emerald-500" },
  { key: "sourcing", label: "Pré-sélectionnés", color: "bg-cyan-500" },
  { key: "interview", label: "Entretiens", color: "bg-indigo-500" },
  { key: "closed", label: "Refusés/Embauchés", color: "bg-gray-500" },
];

export function RecruitmentPipeline() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [clientSecret, setClientSecret] = useState<string | "">("");
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchApplications();
  }, []);

  // Handle payment success/cancel from Stripe redirect
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");

    if (paymentStatus === "success") {
      toast({
        title: "✅ Paiement réussi!",
        description:
          "Le profil a été débloqué avec succès. Les données du candidat sont maintenant visibles.",
      });
      // Refresh candidates list to show unlocked status
      setTimeout(() => {
        fetchApplications();
      }, 1500);
      // Clear query params
      setSearchParams({});
    } else if (paymentStatus === "cancel") {
      toast({
        title: "❌ Paiement annulé",
        description:
          "Vous avez annulé le paiement. Veuillez réessayer si vous souhaitez débloquer ce profil.",
        variant: "destructive",
      });
      // Clear query params
      setSearchParams({});
    }
  }, [searchParams, toast, setSearchParams]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await apiService.getApplications();

      // Map API data to UI Candidate format
      const mapped: Candidate[] = (data.applications || []).map((app: any) => ({
        id: app._id,
        name: `${app.firstName} ${app.lastName}`,
        initials: `${app.firstName[0]}${app.lastName[0]}`.toUpperCase(),
        position: app.job?.title || app.specialty,
        score: app.aiScore || 0,
        email: app.email,
        phone: app.phone,
        stage: app.employerStage || "validating",
        appliedAt: app.createdAt,
        unlocked:
          app.unlockedBy?.includes(user?._id) || app.isUnlocked || false,
        jobId: app.job?._id,
        cvFile: app.cvFile,
        rgpdExpiresAt: app.rgpdExpiresAt,
      }));
      setCandidates(mapped);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les candidatures.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCandidatesByStage = (stage: PipelineStage) =>
    candidates.filter((c) => c.stage === stage);

  const handleUnlock = async (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowPaymentModal(true);
    setClientSecret("");

    try {
      setIsInitializingPayment(true);
      const response = await apiService.createPaymentIntent(candidate.id);
      if (response?.clientSecret) {
        setClientSecret(response.clientSecret);
      } else {
        throw new Error("Impossible d'initialiser le paiement");
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de contacter Stripe",
        variant: "destructive",
      });
      setShowPaymentModal(false);
    } finally {
      setIsInitializingPayment(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setClientSecret("");
    setSelectedCandidate(null);
    fetchApplications();
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setClientSecret("");
    setSelectedCandidate(null);
  };

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    e.dataTransfer.setData("candidateId", candidateId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = async (e: React.DragEvent, newStage: PipelineStage) => {
    e.preventDefault();
    const candidateId = e.dataTransfer.getData("candidateId");
    if (!candidateId) return;

    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate || candidate.stage === newStage) return;

    // Optimistic UI update
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, stage: newStage } : c)),
    );

    try {
      await apiService.updateApplicationPipelineStage(candidateId, newStage);
      toast({
        title: "Statut mis à jour",
        description: `Le candidat a été déplacé vers "${stages.find((s) => s.key === newStage)?.label}".`,
      });
    } catch (error: any) {
      // Rollback visuel en cas d'échec API
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId ? { ...c, stage: candidate.stage } : c,
        ),
      );
      toast({
        title: "Erreur",
        description:
          "Impossible de mettre à jour le statut. Rollback effectué.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pipeline de recrutement</CardTitle>
              <CardDescription>
                Gérez vos candidats par étape - Glissez-déposez pour changer le
                statut
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                {candidates.length} candidat{candidates.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stages.map((stage) => (
          <div
            key={stage.key}
            className="space-y-3 bg-gray-50/50 p-2 rounded-xl"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white shadow-sm border border-gray-100">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full shadow-sm",
                  stage.color,
                )}
              />
              <span className="font-semibold text-sm text-gray-700">
                {stage.label}
              </span>
              <span className="ml-auto text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {getCandidatesByStage(stage.key).length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3 min-h-[400px]">
              {getCandidatesByStage(stage.key).map((candidate) => (
                <Card
                  key={candidate.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, candidate.id)}
                  className="cursor-move hover:shadow-md transition-all duration-200 border-gray-200 hover:border-blue-300"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <GripVertical className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-700">
                              {candidate.initials}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">
                              {candidate.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate font-medium">
                              {candidate.position}
                            </p>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <MoreHorizontal className="h-4 w-4 text-gray-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            Voir le profil complet
                          </DropdownMenuItem>
                          <DropdownMenuItem>Télécharger le CV</DropdownMenuItem>
                          <DropdownMenuItem>Archiver</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Masked contact info */}
                    <div className="space-y-2 mb-4 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        <span
                          className={cn(
                            "font-medium",
                            !candidate.unlocked &&
                              "blur-[3px] select-none opacity-70",
                          )}
                        >
                          {candidate.email}
                        </span>
                        {!candidate.unlocked && (
                          <Lock className="h-3 w-3 ml-auto text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        <span
                          className={cn(
                            "font-medium",
                            !candidate.unlocked &&
                              "blur-[3px] select-none opacity-70",
                          )}
                        >
                          {candidate.phone}
                        </span>
                        {!candidate.unlocked && (
                          <Lock className="h-3 w-3 ml-auto text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-medium">
                          Appliqué le :{" "}
                          {new Date(candidate.appliedAt).toLocaleDateString(
                            "fr-FR",
                          )}
                        </span>
                      </div>
                      {candidate.rgpdExpiresAt && (
                        <div className="flex items-center gap-2 text-destructive/80 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="font-medium">
                            Conservation RGPD :{" "}
                            {new Date(
                              candidate.rgpdExpiresAt,
                            ).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Unlock button */}
                    {!candidate.unlocked ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 shadow-sm"
                        onClick={() => handleUnlock(candidate)}
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Débloquer le profil (Stripe)
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 py-1.5 rounded-md border border-emerald-100">
                        <Eye className="h-3.5 w-3.5" />
                        Profil accessible
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {getCandidatesByStage(stage.key).length === 0 && (
                <div className="h-24 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                  <span className="text-xs text-gray-400 font-medium">
                    Glissez un candidat ici
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-md shadow-xl border-0 my-auto max-h-[95vh] flex flex-col">
            <CardHeader className="bg-gray-50 border-b border-gray-100 rounded-t-xl shrink-0">
              <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Débloquer le profil
              </CardTitle>
              <CardDescription>
                Accédez instantanément aux coordonnées complètes de{" "}
                {selectedCandidate.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5 overflow-y-auto custom-scrollbar">
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shadow-inner">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">
                      {selectedCandidate.name}
                    </p>
                    <p className="text-sm font-medium text-blue-600">
                      {selectedCandidate.position}
                    </p>
                  </div>
                </div>
              </div>

              {isInitializingPayment ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                  <p className="text-sm text-gray-500 font-medium">
                    Initialisation du paiement sécurisé...
                  </p>
                </div>
              ) : clientSecret ? (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: "stripe",
                        variables: {
                          colorPrimary: "#2563eb",
                        },
                      },
                    }}
                  >
                    <StripePaymentForm
                      amount={49}
                      onSuccess={handlePaymentSuccess}
                      onCancel={handlePaymentCancel}
                    />
                  </Elements>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                  <AlertTriangle className="h-10 w-10 text-amber-500" />
                  <p className="text-sm text-gray-600 font-medium">
                    Une erreur est survenue lors de la préparation du paiement.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => handleUnlock(selectedCandidate)}
                  >
                    Réessayer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* RGPD reminder */}
      <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
        <CardContent className="p-4 flex gap-3">
          <div className="mt-0.5">
            <Lock className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            <strong className="text-blue-900">
              Protocole de confidentialité RGPD :
            </strong>{" "}
            Les coordonnées des candidats sont anonymisées par défaut pour
            protéger leurs données personnelles. Le déblocage d'un profil vous
            engage à utiliser ces informations exclusivement dans le cadre du
            recrutement pour le poste concerné, conformément à la réglementation
            en vigueur.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
