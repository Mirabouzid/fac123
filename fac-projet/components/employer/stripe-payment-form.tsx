import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { apiService } from "@/lib/api";

interface StripePaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  amount: number;
}

export function StripePaymentForm({
  onSuccess,
  onCancel,
  amount,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Redirection en cas de succès si nécessaire, mais ici on gère le succès localement si possible
        // Note: Stripe redirige souvent pour les cartes 3DS, donc success_url est requis
        return_url: window.location.href.split("?")[0] + "?payment=success",
      },
      // Désactiver la redirection automatique pour gérer le succès via l'état si le moyen de paiement le permet
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "Une erreur est survenue lors du paiement.");
      setLoading(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        // Appeler le backend pour forcer la vérification (cas où le webhook tarde ou échoue en local)
        await apiService.verifyPayment(paymentIntent.id);
        
        toast({
          title: "✅ Paiement réussi!",
          description: "Le profil a été débloqué avec succès.",
        });
        onSuccess();
      } catch (err: any) {
        setErrorMessage("Le paiement a réussi mais le déblocage a échoué. Veuillez contacter le support.");
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Total à payer</span>
          <span className="text-xl font-bold text-gray-900">{amount} €</span>
        </div>
        <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
          <CreditCard className="h-3 w-3" /> Paiement sécurisé par Stripe
        </p>
      </div>

      <div className="min-h-[200px]">
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-4 w-4" />
          {errorMessage}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
          onClick={onCancel}
          disabled={loading}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Payer {amount} €
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
