import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import {
  FileText,
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  Eye,
  Loader2,
  Lock,
  CreditCard,
  User,
  Mail,
  Phone,
  Calendar,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiService } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { StripePaymentForm } from "./stripe-payment-form";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Mocks removed

export function EmployerDashboard() {
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [recentCandidates, setRecentCandidates] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAllCandidatesModal, setShowAllCandidatesModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string | "">("");
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);

  useEffect(() => {
    fetchAllData();

    // Auto-refresh every 30 seconds to show validation status changes
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle payment success/cancel from Stripe redirect
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");

    if (paymentStatus === "success") {
      toast({
        title: "✅ Paiement réussi!",
        description: "Le profil a été débloqué avec succès.",
      });
      setTimeout(() => {
        fetchAllData();
      }, 1500);
      setSearchParams({});
    } else if (paymentStatus === "cancel") {
      toast({
        title: "❌ Paiement annulé",
        description: "Vous avez annulé le paiement. Veuillez réessayer.",
        variant: "destructive",
      });
      setSearchParams({});
    }
  }, [searchParams, toast, setSearchParams]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [jobsData, statsData, candidatesData] = await Promise.all([
        apiService.getMyJobs(),
        apiService.getEmployerStats(),
        apiService.getApplications({ global: true }), // Recherche globale des candidats qualifiés
      ]);
      setMyOffers(jobsData.jobs || []);
      setStats(statsData.stats);
      setRecentCandidates(candidatesData.applications || []);
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

  // Helper to determine what to show in the StatusBadge
  const getOfferStatus = (offer: any) => {
    if (!offer.isValidated && offer.status !== "closed") return "validating";
    if (offer.status === "closed") return "closed";
    return offer.pipelineStage || "active";
  };

  const handleUnlock = async (candidate: any) => {
    setSelectedCandidate(candidate);
    setShowPaymentModal(true);
    setClientSecret("");

    try {
      setIsInitializingPayment(true);
      const response = await apiService.createPaymentIntent(candidate._id);
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
    fetchAllData();
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setClientSecret("");
    setSelectedCandidate(null);
  };

  const handleQualify = async (candidateId: string) => {
    try {
      await apiService.updateApplicationPipelineStage(candidateId, "active");
      toast({
        title: "✅ Candidat qualifié",
        description: "Le candidat a été déplacé en revue.",
      });
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de qualifier le candidat.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.activeOffers || 0}</p>
                <p className="text-sm text-muted-foreground">
                  Annonces actives
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-accent">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats?.totalApplications || 0}
                </p>
                <p className="text-sm text-muted-foreground">Candidatures</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-warning">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats?.pendingReview || 0}
                </p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.interviews || 0}</p>
                <p className="text-sm text-muted-foreground">Entretiens</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active offers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mes Annonces</CardTitle>
                <CardDescription>
                  Vos offres d&apos;emploi et leur statut
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => navigate("/employer/post-job")}>
                Nouvelle annonce
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : myOffers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">
                Vous n'avez pas encore publié d'offres.
              </p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {myOffers.map((offer) => (
                  <div
                    key={offer._id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm sm:text-base">
                          {offer.title}
                        </h4>
                        <StatusBadge status={getOfferStatus(offer)} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />0 candidats
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          {new Date(offer.createdAt).toLocaleDateString(
                            "fr-FR",
                          )}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/employer/job/${offer._id}`)}
                    >
                      Voir
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent candidates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Candidats recents</CardTitle>
                <CardDescription>
                  Coordonnees masquees par defaut
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAllCandidatesModal(true)}
              >
                Voir tous
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCandidates.slice(0, 5).map((candidate) => (
                <div
                  key={candidate._id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {candidate.firstName[0]}
                        {candidate.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">
                          {candidate.firstName} {candidate.lastName}
                        </h4>
                        {!candidate.isUnlocked && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            Masqué
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {candidate.specialty}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={candidate.status} />
                    {!candidate.isUnlocked && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-600 hover:bg-blue-50"
                        onClick={() => handleUnlock(candidate)}
                      >
                        <Lock className="h-3.5 w-3.5 mr-1" />
                        Débloquer
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {recentCandidates.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Aucun candidat qualifié disponible pour le moment.
                </p>
              )}
            </div>

            {/* Payment notice */}
            <div className="mt-4 p-4 rounded-lg bg-blue-50/50 border border-blue-100">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Debloquer les coordonnees
                  </p>
                  <p className="text-xs text-gray-600">
                    Acces complet aux profils apres paiement
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowAllCandidatesModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Debloquer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RGPD Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm">
                Protection des donnees (RGPD)
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Les coordonnees des candidats sont masquees par defaut.
                L&apos;acces complet est conditionne au paiement et a la
                validation par notre equipe. Toutes les donnees sont conservees
                24 mois maximum.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Candidates Modal */}
      {showAllCandidatesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] shadow-xl border-0 overflow-y-auto">
            <CardHeader className="sticky top-0 bg-gray-50 border-b border-gray-100 flex items-center justify-between rounded-t-xl">
              <div>
                <CardTitle>Tous les candidats</CardTitle>
                <CardDescription>
                  Gérez vos candidats et débloquez leurs coordonnées
                </CardDescription>
              </div>
              <button
                onClick={() => setShowAllCandidatesModal(false)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {recentCandidates.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun candidat disponible.
                </p>
              ) : (
                recentCandidates.map((candidate) => {
                  const isUnlocked =
                    candidate.unlockedBy?.includes(user?._id) ||
                    candidate.isUnlocked ||
                    false;
                  return (
                    <div
                      key={candidate._id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-blue-700">
                              {candidate.firstName[0]}
                              {candidate.lastName[0]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-gray-900">
                              {candidate.firstName} {candidate.lastName}
                            </h4>
                            <p className="text-xs text-gray-500 font-medium">
                              {candidate.specialty}
                            </p>

                            {/* Contact info */}
                            <div className="mt-2 space-y-1 text-xs">
                              {isUnlocked ? (
                                <>
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Mail className="h-3 w-3" />
                                    <span className="font-medium">
                                      {candidate.email}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="h-3 w-3" />
                                    <span className="font-medium">
                                      {candidate.phone}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Mail className="h-3 w-3" />
                                    <span className="font-medium blur-[2px]">
                                      {candidate.email}
                                    </span>
                                    <Lock className="h-3 w-3 text-amber-500" />
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="h-3 w-3" />
                                    <span className="font-medium blur-[2px]">
                                      {candidate.phone}
                                    </span>
                                    <Lock className="h-3 w-3 text-amber-500" />
                                  </div>
                                </>
                              )}

                              {candidate.rgpdExpiresAt && (
                                <div className="flex items-center gap-2 text-destructive/80 mt-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span className="text-xs font-medium">
                                    RGPD expire:{" "}
                                    {new Date(
                                      candidate.rgpdExpiresAt,
                                    ).toLocaleDateString("fr-FR")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-2 shrink-0">
                          {isUnlocked ? (
                            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-100">
                              <Eye className="h-3.5 w-3.5" />
                              Accessible
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleUnlock(candidate)}
                            >
                              <Lock className="h-3.5 w-3.5" />
                              Débloquer (49€)
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => handleQualify(candidate._id)}
                          >
                            Qualifier
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
                {selectedCandidate.firstName} {selectedCandidate.lastName}
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
                      {selectedCandidate.firstName} {selectedCandidate.lastName}
                    </p>
                    <p className="text-sm font-medium text-blue-600">
                      {selectedCandidate.specialty}
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
    </div>
  );
}
