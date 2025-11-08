import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles, TrendingDown, Calendar } from "lucide-react";
import StrategyStep from "./StrategyStep";
import { useState } from "react";
import logoUrl from "@assets/4801ec1b-4f41-47c7-8453-60ba6517c851_1762570567956.png";

export default function StrategyScreen() {
  const [steps] = useState([
    {
      stepNumber: 1,
      title: "Pagar fatura do Nubank",
      description: "Use o limite disponível do Itaú para pagar R$ 3.200 da fatura do Nubank e evitar juros altos de 12.5%",
      amount: 3200,
      status: "completed" as const
    },
    {
      stepNumber: 2,
      title: "Antecipar parcela do empréstimo",
      description: "Com o saldo liberado do Nubank, pague uma parcela extra do empréstimo pessoal para reduzir o total de juros",
      amount: 1500,
      status: "current" as const
    },
    {
      stepNumber: 3,
      title: "Reorganizar financiamento",
      description: "Aguarde o fechamento da fatura do Itaú e use o limite para dar uma entrada maior no financiamento",
      amount: 2800,
      status: "pending" as const
    },
  ]);

  const totalSaved = 1250;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            data-testid="button-back"
            onClick={() => console.log('Back clicked')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-heading font-extrabold text-foreground" data-testid="text-page-title">
            Estratégia de Pagamento
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-3">
          <img src={logoUrl} alt="PayPilot" className="w-24 h-24 mx-auto" data-testid="img-mascot" />
          <h2 className="text-2xl font-heading font-extrabold text-foreground">
            Sua Estratégia Personalizada
          </h2>
          <p className="text-muted-foreground">
            Criei um plano otimizado para você economizar com juros!
          </p>
        </div>

        <Card className="border-l-4 border-l-accent bg-gradient-to-br from-accent/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Economia Estimada
              </span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                3 meses
              </span>
            </div>
            <div className="text-4xl font-heading font-extrabold text-accent" data-testid="text-total-saved">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(totalSaved)}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h3 className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Passos Recomendados
          </h3>

          <div className="space-y-1">
            {steps.map((step) => (
              <StrategyStep key={step.stepNumber} {...step} />
            ))}
          </div>
        </div>

        <div className="pb-6 space-y-3">
          <Button
            size="lg"
            className="w-full h-14 rounded-xl text-lg font-bold"
            data-testid="button-start-strategy"
            onClick={() => console.log('Start strategy clicked')}
          >
            Começar a Executar
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full h-14 rounded-xl text-lg font-bold border-2"
            data-testid="button-regenerate"
            onClick={() => console.log('Regenerate clicked')}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Gerar Nova Estratégia
          </Button>
        </div>
      </main>
    </div>
  );
}
