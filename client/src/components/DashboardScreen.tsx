import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingDown, CreditCard, Sparkles, Wallet, Calendar, TrendingUp, List } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { Link } from "wouter";
import logoUrl from "@assets/1000074692_1762573929735.png";

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
      <header className="sticky top-0 z-50 bg-accent border-b border-accent-foreground/10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="PayPilot" className="w-10 h-10" data-testid="img-header-logo" />
            <h1 className="text-xl font-heading font-extrabold text-accent-foreground" data-testid="text-app-title">
              PayPilot
            </h1>
          </div>
          <Button size="icon" variant="ghost" className="rounded-full text-accent-foreground hover:bg-accent-foreground/10" data-testid="button-menu">
            <span className="sr-only">Menu</span>
            <div className="w-6 h-0.5 bg-accent-foreground mb-1.5"></div>
            <div className="w-6 h-0.5 bg-accent-foreground mb-1.5"></div>
            <div className="w-6 h-0.5 bg-accent-foreground"></div>
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <Card className="bg-primary rounded-2xl hover-elevate active-elevate-2 cursor-pointer border-0" onClick={() => console.log('View debts clicked')} data-testid="card-total-debt">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-primary-foreground/80 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Total de Dívidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-4xl font-heading font-extrabold text-primary-foreground" data-testid="text-total-debt">
                {formatCurrency(totalDebt)}
              </span>
            </div>
            <div className="text-sm text-primary-foreground/80 font-medium">
              3 dívidas ativas • Toque para ver detalhes
            </div>
          </CardContent>
        </Card>

        <Card className="bg-accent rounded-2xl hover-elevate active-elevate-2 cursor-pointer border-0" onClick={() => console.log('View available clicked')} data-testid="card-available">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-accent-foreground/80 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Limite Disponível
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-4xl font-heading font-extrabold text-accent-foreground" data-testid="text-total-available">
                {formatCurrency(totalAvailable)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div className="text-accent-foreground/80 font-medium">Cartões</div>
                <div className="font-heading font-bold text-base text-accent-foreground">{formatCurrency(availableCredit)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-accent-foreground/80 font-medium">Em Conta</div>
                <div className="font-heading font-bold text-base text-accent-foreground">{formatCurrency(cashInAccount)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary rounded-2xl border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-primary-foreground/80 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-center">
              <span className="text-5xl font-heading font-extrabold text-primary-foreground" data-testid="text-progress-percentage">
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-primary-foreground/20 rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary-foreground h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
                data-testid="progress-general"
              />
            </div>
            <div className="text-center">
              <div className="text-xs text-primary-foreground/70 font-medium">
                {formatCurrency(totalPaid)} de {formatCurrency(totalOriginalDebt)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-accent rounded-2xl border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-accent-foreground/80 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Previsão de Quitação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-heading font-extrabold text-accent-foreground" data-testid="text-months-left">
                {monthsToPayOff}
              </span>
              <span className="text-lg font-semibold text-accent-foreground/80">meses</span>
            </div>
            <div className="text-sm text-accent-foreground/80 font-medium mt-2">
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
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="flex-col h-auto py-2 gap-1"
              data-testid="button-nav-home"
            >
              <TrendingDown className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold text-primary">Início</span>
            </Button>
          </Link>
          <Link href="/debts">
            <Button
              variant="ghost"
              className="flex-col h-auto py-2 gap-1"
              data-testid="button-nav-debts"
            >
              <List className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Dívidas</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 gap-1"
            data-testid="button-nav-cards"
          >
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cartões</span>
          </Button>
          <Link href="/strategy">
            <Button
              variant="ghost"
              className="flex-col h-auto py-2 gap-1"
              data-testid="button-nav-strategy"
            >
              <Sparkles className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Estratégia</span>
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
