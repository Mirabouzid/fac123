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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Building2,
  Shield,
  ArrowRight,
  Stethoscope,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type UserRole = "candidate" | "employer" | "admin";

interface LoginPageProps {
  onLogin?: (role: UserRole) => void;
}

const roles = [
  {
    id: "candidate" as UserRole,
    title: "Candidat",
    description: "Je cherche un poste dans le secteur medical ou dentaire",
    icon: Users,
    color: "bg-blue-500",
    hoverColor: "hover:border-blue-500",
  },
  {
    id: "employer" as UserRole,
    title: "Cabinet / Employeur",
    description: "Je recrute des professionnels de sante",
    icon: Building2,
    color: "bg-blue-600",
    hoverColor: "hover:border-blue-600",
  },
  {
    id: "admin" as UserRole,
    title: "Administrateur",
    description: "Acces a la supervision de la plateforme",
    icon: Shield,
    color: "bg-blue-700",
    hoverColor: "hover:border-blue-700",
  },
];

export function LoginPage({ onLogin }: LoginPageProps) {
  const { login, signup } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rgpdConsent, setRgpdConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!rgpdConsent) {
          setError("Le consentement RGPD est obligatoire");
          setLoading(false);
          return;
        }
        await signup(email, password, name, selectedRole, { rgpdConsent });
      }
      onLogin?.(selectedRole);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-blue-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-blue-900">
                Efficience Recrute
              </h1>
              <p className="text-xs text-blue-600">
                Recrutement Medical & Dentaire
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl">
          {!selectedRole ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-blue-900 mb-2">
                  Bienvenue
                </h2>
                <p className="text-blue-600">
                  Selectionnez votre profil pour acceder a votre espace
                </p>
              </div>

              {/* Role Selection */}
              <div className="grid md:grid-cols-3 gap-6">
                {roles.map((role) => (
                  <Card
                    key={role.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 border-2 border-transparent",
                      role.hoverColor,
                      "hover:shadow-lg hover:-translate-y-1",
                    )}
                    onClick={() => setSelectedRole(role.id)}
                  >
                    <CardHeader className="text-center pb-2">
                      <div
                        className={cn(
                          "h-16 w-16 rounded-2xl mx-auto flex items-center justify-center mb-4",
                          role.color,
                        )}
                      >
                        <role.icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-blue-900">
                        {role.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <CardDescription className="text-blue-600">
                        {role.description}
                      </CardDescription>
                      <Button
                        variant="ghost"
                        className="mt-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        Continuer <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            /* Auth Form */
            <Card className="max-w-md mx-auto border-blue-100 shadow-xl">
              <CardHeader className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedRole(null)}
                  className="absolute left-4 top-4 text-blue-600 hover:text-blue-700"
                >
                  ← Retour
                </Button>
                <div
                  className={cn(
                    "h-16 w-16 rounded-2xl mx-auto flex items-center justify-center mb-4",
                    roles.find((r) => r.id === selectedRole)?.color,
                  )}
                >
                  {selectedRole === "candidate" && (
                    <Users className="h-8 w-8 text-white" />
                  )}
                  {selectedRole === "employer" && (
                    <Building2 className="h-8 w-8 text-white" />
                  )}
                  {selectedRole === "admin" && (
                    <Shield className="h-8 w-8 text-white" />
                  )}
                </div>
                <CardTitle className="text-blue-900">
                  {isLogin ? "Connexion" : "Inscription"}{" "}
                  {roles.find((r) => r.id === selectedRole)?.title}
                </CardTitle>
                <CardDescription className="text-blue-600">
                  {isLogin ? "Entrez vos identifiants" : "Créez votre compte"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert className="mb-4 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-blue-900">
                        Nom complet
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Votre nom"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-blue-900">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-blue-900">
                      Mot de passe
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  {!isLogin && (
                    <div className="flex items-start space-x-2 pt-2 pb-2">
                      <Checkbox
                        id="rgpd"
                        checked={rgpdConsent}
                        onCheckedChange={(checked) => setRgpdConsent(checked === true)}
                        className="mt-1"
                      />
                      <Label
                        htmlFor="rgpd"
                        className="text-xs font-normal text-blue-800 leading-snug cursor-pointer"
                      >
                        J'accepte la politique de confidentialité et le traitement de mes données dans le cadre de mon inscription (RGPD).
                      </Label>
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={loading}
                  >
                    {loading
                      ? "Chargement..."
                      : isLogin
                        ? "Se connecter"
                        : "S'inscrire"}
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <Button
                    variant="link"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {isLogin
                      ? "Pas de compte ? S'inscrire"
                      : "Déjà un compte ? Se connecter"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
