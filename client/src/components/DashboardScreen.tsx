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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-accent px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="PayPilot" className="w-14 h-14" data-testid="img-header-logo" />
            <div>
              <h1 className="text-2xl font-heading font-extrabold text-white" data-testid="text-app-title">
                PayPilot
              </h1>
              <p className="text-sm text-white/90 font-medium">Seu copiloto financeiro</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="rounded-full text-white hover:bg-white/10" data-testid="button-menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Card className="bg-primary rounded-3xl border-0 overflow-hidden p-6" data-testid="card-welcome">
          <div className="flex items-start gap-3 mb-4">
            <img src={logoUrl} alt="Mascote" className="w-16 h-16" />
          </div>
          <h2 className="text-3xl font-heading font-extrabold text-white mb-2">
            Olá, amigo! 👋
          </h2>
          <p className="text-lg text-white/90 font-medium">
            Vamos organizar suas finanças juntos!
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-3xl border-4 border-red-400 bg-white hover-elevate active-elevate-2 cursor-pointer" onClick={() => console.log('View debts clicked')} data-testid="card-total-debt">
            <CardContent className="p-5 space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Total em Dívidas</p>
                <p className="text-2xl font-heading font-extrabold text-red-500" data-testid="text-total-debt">
                  {formatCurrency(totalDebt)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-4 border-green-400 bg-white hover-elevate active-elevate-2 cursor-pointer" onClick={() => console.log('View available clicked')} data-testid="card-available">
            <CardContent className="p-5 space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Limite Disponível</p>
                <p className="text-2xl font-heading font-extrabold text-green-500" data-testid="text-total-available">
                  {formatCurrency(totalAvailable)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-accent rounded-3xl border-0 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-heading font-bold text-white">Progresso Geral</h3>
            <span className="text-4xl font-heading font-extrabold text-white" data-testid="text-progress-percentage">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="relative w-full bg-green-700/50 rounded-full h-4 overflow-hidden mb-3">
            <div
              className="bg-green-900 h-full rounded-full transition-all duration-500 relative"
              style={{ width: `${progressPercentage}%` }}
              data-testid="progress-general"
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-yellow-400 rounded-full border-2 border-white"></div>
            </div>
          </div>
          <p className="text-base text-white font-medium">
            Você já pagou {formatCurrency(totalPaid)}! Continue assim! 🎉
          </p>
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
