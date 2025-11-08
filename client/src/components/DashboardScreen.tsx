import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingDown, CreditCard, Sparkles, Wallet, Calendar, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import logoUrl from "@assets/4801ec1b-4f41-47c7-8453-60ba6517c851_1762570567956.png";

export default function DashboardScreen() {
  const totalDebt = 34000;
  const totalPaid = 11000;
  const totalOriginalDebt = 45000;
  const availableCredit = 14700;
  const cashInAccount = 2500;
  const totalAvailable = availableCredit + cashInAccount;
  const monthsToPayOff = 8;
  const progressPercentage = (totalPaid / totalOriginalDebt) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="PayPilot" className="w-10 h-10" data-testid="img-header-logo" />
            <h1 className="text-xl font-heading font-extrabold text-foreground" data-testid="text-app-title">
              PayPilot
            </h1>
          </div>
          <Button size="icon" variant="ghost" className="rounded-full" data-testid="button-menu">
            <span className="sr-only">Menu</span>
            <div className="w-6 h-0.5 bg-foreground mb-1.5"></div>
            <div className="w-6 h-0.5 bg-foreground mb-1.5"></div>
            <div className="w-6 h-0.5 bg-foreground"></div>
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <Card className="border-l-[6px] border-l-destructive bg-gradient-to-br from-destructive/15 to-destructive/5 rounded-2xl shadow-lg hover-elevate active-elevate-2 cursor-pointer" onClick={() => console.log('View debts clicked')} data-testid="card-total-debt">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Total de Dívidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-4xl font-heading font-extrabold text-foreground" data-testid="text-total-debt">
                {formatCurrency(totalDebt)}
              </span>
            </div>
            <div className="text-sm text-muted-foreground font-medium">
              3 dívidas ativas • Toque para ver detalhes
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-[6px] border-l-accent bg-gradient-to-br from-accent/15 to-accent/5 rounded-2xl shadow-lg hover-elevate active-elevate-2 cursor-pointer" onClick={() => console.log('View available clicked')} data-testid="card-available">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Limite Disponível
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-4xl font-heading font-extrabold text-foreground" data-testid="text-total-available">
                {formatCurrency(totalAvailable)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground font-medium">Cartões</div>
                <div className="font-heading font-bold text-base">{formatCurrency(availableCredit)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground font-medium">Em Conta</div>
                <div className="font-heading font-bold text-base">{formatCurrency(cashInAccount)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-[6px] border-l-primary bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground font-medium">Já pago</span>
                <span className="text-2xl font-heading font-extrabold text-primary" data-testid="text-total-paid">
                  {formatCurrency(totalPaid)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                  data-testid="progress-general"
                />
              </div>
              <div className="text-xs text-muted-foreground font-medium text-right">
                {progressPercentage.toFixed(0)}% de {formatCurrency(totalOriginalDebt)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-[6px] border-l-primary bg-gradient-to-br from-primary/10 to-accent/5 rounded-2xl shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Previsão de Quitação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-heading font-extrabold text-foreground" data-testid="text-months-left">
                {monthsToPayOff}
              </span>
              <span className="text-lg font-semibold text-muted-foreground">meses</span>
            </div>
            <div className="text-sm text-muted-foreground font-medium mt-2">
              Pagando conforme planejado
            </div>
          </CardContent>
        </Card>

        <div className="pb-20 pt-2">
          <Button
            size="lg"
            className="w-full h-16 rounded-2xl text-lg font-bold shadow-xl"
            data-testid="button-generate-strategy"
            onClick={() => console.log('Generate strategy clicked')}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Gerar Estratégia com IA
          </Button>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-around">
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 gap-1"
            data-testid="button-nav-home"
          >
            <TrendingDown className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold text-primary">Início</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 gap-1"
            data-testid="button-nav-cards"
          >
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cartões</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 gap-1"
            data-testid="button-nav-strategy"
          >
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Estratégia</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
