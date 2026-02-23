import { Button } from "@/components/ui/button";
import logoUrl from "@assets/4801ec1b-4f41-47c7-8453-60ba6517c851_1762570567956.png";
import { SiGoogle } from "react-icons/si";

export default function LoginScreen() {
  const handleLogin = () => {
    window.location.href = "/api/login";
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
            Bem-vindo ao PayPilot!
          </h1>
          <p className="text-lg text-muted-foreground font-medium" data-testid="text-subtitle">
            Vamos colocar suas finanças nos trilhos!
          </p>
        </div>

        <div className="space-y-5">
          <Button
            onClick={handleLogin}
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg"
            size="lg"
            data-testid="button-login"
          >
            Entrar
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Login seguro via Replit
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground" data-testid="text-auth-info">
            Suporte a Google, GitHub, Apple e mais
          </p>
        </div>
      </div>
    </div>
  );
}
