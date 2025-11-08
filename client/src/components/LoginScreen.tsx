import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import logoUrl from "@assets/4801ec1b-4f41-47c7-8453-60ba6517c851_1762570567956.png";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!email) {
      toast({
        title: "Erro",
        description: "Por favor, preencha seu email",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: isSignUp ? name : undefined }),
      });

      toast({
        title: "Sucesso!",
        description: "Login realizado com sucesso",
      });

      onLoginSuccess();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível fazer login. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast({
      title: "Em breve",
      description: "Login com Google estará disponível em breve!",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <img 
            src={logoUrl} 
            alt="PayPilot" 
            className="w-48 h-48 mx-auto mb-6 rounded-3xl shadow-xl object-cover"
            data-testid="img-logo"
          />
          <h1 className="text-4xl font-heading font-extrabold text-foreground mb-3" data-testid="text-welcome">
            {isSignUp ? "Crie sua conta" : "Bem-vindo de volta!"}
          </h1>
          <p className="text-lg text-muted-foreground font-medium" data-testid="text-subtitle">
            {isSignUp 
              ? "Vamos organizar suas finanças juntos!" 
              : "Vamos colocar suas finanças nos trilhos!"}
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-2xl border-2 px-5 text-base"
                data-testid="input-email"
              />
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">Nome (opcional)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 rounded-2xl border-2 px-5 text-base"
                  data-testid="input-name"
                />
              </div>
            )}
          </div>

          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg"
            size="lg"
            data-testid="button-login"
          >
            {isLoading ? "Entrando..." : (isSignUp ? "Criar conta" : "Entrar")}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-4 text-muted-foreground font-semibold">ou</span>
            </div>
          </div>

          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full h-14 rounded-2xl text-lg font-semibold border-2 shadow-md"
            size="lg"
            data-testid="button-google"
          >
            <FcGoogle className="w-6 h-6 mr-2" />
            Continuar com Google
          </Button>

          <div className="text-center pt-2">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-accent text-base font-bold hover:underline"
              data-testid="button-toggle-signup"
            >
              {isSignUp 
                ? "Já tem uma conta? Entre aqui" 
                : "Não tem conta? Crie agora"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
