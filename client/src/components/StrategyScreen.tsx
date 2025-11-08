import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import logoUrl from "@assets/4801ec1b-4f41-47c7-8453-60ba6517c851_1762570567956.png";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StrategyResponse {
  strategy: string;
  totalDebt: number;
  totalAvailableLimit: number;
  debtsCount: number;
  cardsCount: number;
}

export default function StrategyScreen() {
  const [generatedStrategy, setGeneratedStrategy] = useState<StrategyResponse | null>(null);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/strategy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }) as StrategyResponse;
    },
    onSuccess: (data) => {
      setGeneratedStrategy(data);
      toast({
        title: "Estratégia gerada!",
        description: "Sua estratégia personalizada está pronta",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível gerar a estratégia. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-accent text-white p-5 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/dashboard">
            <Button size="icon" variant="ghost" className="text-white" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-heading font-extrabold flex-1" data-testid="text-title">
            Estratégia com IA
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-24">
        {!generatedStrategy && !generateMutation.isPending && (
          <div className="text-center py-12 space-y-6">
            <img src={logoUrl} alt="PayPilot" className="w-32 h-32 mx-auto rounded-3xl" data-testid="img-mascot" />
            <div>
              <h2 className="text-2xl font-heading font-extrabold text-foreground mb-3">
                Deixe a IA te ajudar!
              </h2>
              <p className="text-muted-foreground text-lg">
                Vou analisar suas dívidas e cartões para criar uma estratégia personalizada de pagamento.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full h-16 rounded-3xl text-lg font-bold shadow-xl bg-purple-500 hover:bg-purple-600 text-white"
              onClick={() => generateMutation.mutate()}
              data-testid="button-generate"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Gerar Estratégia com IA
            </Button>
          </div>
        )}

        {generateMutation.isPending && (
          <div className="text-center py-12 space-y-4">
            <Loader2 className="w-16 h-16 animate-spin text-purple-500 mx-auto" />
            <div>
              <h3 className="text-xl font-heading font-bold mb-2">Analisando suas finanças...</h3>
              <p className="text-muted-foreground">
                Estou criando a melhor estratégia para você. Isso pode levar alguns segundos.
              </p>
            </div>
          </div>
        )}

        {generatedStrategy && (
          <div className="space-y-6">
            <Card className="rounded-3xl border-4 border-purple-400 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-xl">Sua Estratégia</h3>
                    <p className="text-sm text-muted-foreground">
                      {generatedStrategy.debtsCount} dívida(s) • {generatedStrategy.cardsCount} cartão(ões)
                    </p>
                  </div>
                </div>
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap"
                  data-testid="text-strategy"
                >
                  {generatedStrategy.strategy}
                </div>
              </CardContent>
            </Card>

            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 rounded-3xl text-lg font-bold border-2"
              onClick={() => {
                setGeneratedStrategy(null);
                generateMutation.mutate();
              }}
              disabled={generateMutation.isPending}
              data-testid="button-regenerate"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Gerar Nova Estratégia
            </Button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-around">
          <Link href="/dashboard">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2" data-testid="nav-dashboard">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span className="text-xs">Início</span>
            </Button>
          </Link>
          <Link href="/debts">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2" data-testid="nav-debts">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" x2="12" y1="2" y2="22"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span className="text-xs">Dívidas</span>
            </Button>
          </Link>
          <Link href="/cards">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2" data-testid="nav-cards">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2"/>
                <line x1="2" x2="22" y1="10" y2="10"/>
              </svg>
              <span className="text-xs">Cartões</span>
            </Button>
          </Link>
          <Link href="/strategy">
            <Button variant="ghost" className="flex flex-col items-center gap-1 h-auto py-2 text-purple-500" data-testid="nav-strategy">
              <Sparkles className="w-6 h-6" />
              <span className="text-xs font-bold">Estratégia</span>
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
