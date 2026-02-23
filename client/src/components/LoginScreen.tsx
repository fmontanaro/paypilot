import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { SiGoogle } from "react-icons/si";
import logoUrl from "@assets/4801ec1b-4f41-47c7-8453-60ba6517c851_1762570567956.png";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleEmailLogin = async () => {
    if (!email) {
      toast({
        title: "Erro",
        description: "Por favor, preencha seu email",
        variant: "destructive",
      });
      return;
    }
    if (!password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha sua senha",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isSignUp ? "/api/auth/email-signup" : "/api/auth/email-login";
      const body = isSignUp ? { email, password, name } : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao fazer login");
      }

      toast({
        title: "Sucesso!",
        description: "Login realizado com sucesso",
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível fazer login. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplitLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={logoUrl} 
            alt="PayPilot" 
            className="w-40 h-40 mx-auto mb-5 rounded-3xl shadow-xl object-cover"
            data-testid="img-logo"
          />
          <h1 className="text-3xl font-heading font-extrabold text-foreground mb-2" data-testid="text-welcome">
            {isSignUp ? "Crie sua conta" : "Bem-vindo de volta!"}
          </h1>
          <p className="text-base text-muted-foreground font-medium" data-testid="text-subtitle">
            {isSignUp 
              ? "Vamos organizar suas finanças juntos!" 
              : "Vamos colocar suas finanças nos trilhos!"}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-semibold">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-2xl border-2 px-4 text-base"
                  data-testid="input-name"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-2xl border-2 px-4 text-base"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha (mín. 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                className="h-12 rounded-2xl border-2 px-4 text-base"
                data-testid="input-password"
              />
            </div>
          </div>

          <Button
            onClick={handleEmailLogin}
            disabled={isLoading}
            className="w-full h-12 rounded-2xl text-base font-bold shadow-lg"
            size="lg"
            data-testid="button-login"
          >
            {isLoading ? "Entrando..." : (isSignUp ? "Criar conta" : "Entrar")}
          </Button>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-toggle-signup"
          >
            {isSignUp 
              ? "Já tem conta? Faça login" 
              : "Não tem conta? Cadastre-se"}
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                ou continue com
              </span>
            </div>
          </div>

          <Button
            onClick={handleReplitLogin}
            variant="outline"
            className="w-full h-12 rounded-2xl text-base font-semibold gap-3"
            size="lg"
            data-testid="button-google-login"
          >
            <SiGoogle className="w-5 h-5" />
            Continuar com Google / Replit
          </Button>
        </div>
      </div>
    </div>
  );
}
