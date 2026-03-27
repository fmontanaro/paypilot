import { Button } from "@/components/ui/button";
import {
  TrendingDown, Sparkles, List, Trophy, AlertCircle,
  AlertTriangle, Award, ThumbsUp, LogOut, DollarSign,
  BarChart2, ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import logoUrl from "@assets/1000074692_1762573929735.png";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { Debt, Income, Investment } from "@shared/schema";

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { data: debts = [], isLoading: debtsLoading } = useQuery<Debt[]>({ queryKey: ["/api/debts"] });
  const { data: incomes = [], isLoading: incomesLoading } = useQuery<Income[]>({ queryKey: ["/api/incomes"] });
  const { data: investments = [], isLoading: investmentsLoading } = useQuery<Investment[]>({ queryKey: ["/api/investments"] });

  const totalDebt = debts.reduce((sum, d) => sum + (parseFloat(d.totalAmount) - parseFloat(d.paidAmount)), 0);
  const totalPaid = debts.reduce((sum, d) => sum + parseFloat(d.paidAmount), 0);
  const totalOriginalDebt = totalDebt + totalPaid;
  const progressPercentage = totalOriginalDebt > 0 ? (totalPaid / totalOriginalDebt) * 100 : 0;
  const totalIncome = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
  const totalInvested = investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
  const netBalance = totalIncome - totalDebt;

  const today = new Date();
  const upcomingDate = new Date(today);
  upcomingDate.setDate(today.getDate() + 7);

  const hasOverdue = debts.some(d => !d.isPaid && new Date(d.dueDate) < today);
  const hasUpcoming = debts.some(d => {
    const dd = new Date(d.dueDate);
    return !d.isPaid && dd >= today && dd <= upcomingDate;
  });
  const isAhead = debts.length > 0 && debts.every(d => d.isPaid || new Date(d.dueDate) > upcomingDate);

  const isLoading = debtsLoading || incomesLoading || investmentsLoading;

  const status = (() => {
    if (totalDebt <= 0) return { icon: Trophy, title: "Parabéns!", message: "Você está livre de dívidas!", color: "bg-yellow-500" };
    if (hasOverdue) return { icon: AlertCircle, title: "Atenção!", message: "Há pagamentos atrasados.", color: "bg-red-500" };
    if (hasUpcoming) return { icon: AlertTriangle, title: "Fique atento!", message: "Vencimentos chegando esta semana.", color: "bg-orange-500" };
    if (isAhead) return { icon: Award, title: "Incrível!", message: "Você está adiantado nos pagamentos!", color: "bg-green-500" };
    return { icon: ThumbsUp, title: "Tudo em dia!", message: "Continue assim, você vai bem!", color: "bg-green-600" };
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-accent px-5 py-4 flex-shrink-0">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="PayPilot" className="w-12 h-12 rounded-xl" data-testid="img-header-logo" />
            <div>
              <h1 className="text-xl font-heading font-extrabold text-white leading-tight" data-testid="text-app-title">
                PayPilot
              </h1>
              <p className="text-xs text-white/80 font-medium">Olá, {user?.firstName || "usuário"}!</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-white/80 hover-elevate"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-3">

          {/* Status Card */}
          <div className={`${status.color} rounded-2xl p-4 flex items-center gap-4`} data-testid="card-status">
            <div className="bg-white/20 rounded-xl p-2.5 flex-shrink-0">
              <status.icon className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-heading font-extrabold text-white leading-tight">{status.title}</p>
              <p className="text-sm text-white/90 leading-snug">{status.message}</p>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Resumo Financeiro</p>
            </div>

            {/* Dívidas */}
            <Link href="/debts">
              <div className="flex items-center gap-4 px-4 py-3 hover-elevate active-elevate-2 cursor-pointer" data-testid="card-total-debt">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total em Dívidas</p>
                  <p className="text-xl font-heading font-extrabold text-red-500 leading-tight" data-testid="text-total-debt">
                    {formatCurrency(totalDebt)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </Link>

            <div className="h-px bg-gray-100 dark:bg-gray-800 mx-4" />

            {/* Receitas */}
            <Link href="/incomes">
              <div className="flex items-center gap-4 px-4 py-3 hover-elevate active-elevate-2 cursor-pointer" data-testid="card-total-income">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Receita Mensal</p>
                  <p className="text-xl font-heading font-extrabold text-green-600 leading-tight" data-testid="text-total-income">
                    {formatCurrency(totalIncome)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">{incomes.length} {incomes.length === 1 ? "fonte" : "fontes"}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </Link>

            <div className="h-px bg-gray-100 dark:bg-gray-800 mx-4" />

            {/* Investimentos */}
            <Link href="/investments">
              <div className="flex items-center gap-4 px-4 py-3 hover-elevate active-elevate-2 cursor-pointer" data-testid="card-total-invested">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <BarChart2 className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Investido</p>
                  <p className="text-xl font-heading font-extrabold text-blue-500 leading-tight" data-testid="text-total-invested">
                    {formatCurrency(totalInvested)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </Link>

            {/* Net Balance Footer */}
            <div className={`px-4 py-3 ${netBalance >= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saldo Disponível</p>
                <p className={`text-base font-heading font-extrabold ${netBalance >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {formatCurrency(Math.abs(netBalance))}
                  <span className="text-xs font-normal ml-1 text-muted-foreground">
                    {netBalance >= 0 ? "positivo" : "negativo"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-accent rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-heading font-bold text-white">Progresso Geral</p>
                <p className="text-xs text-white/70">Dívidas quitadas</p>
              </div>
              <span className="text-3xl font-heading font-extrabold text-white" data-testid="text-progress-percentage">
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2.5 mb-2">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
                data-testid="progress-general"
              />
            </div>
            <p className="text-xs text-white/80">
              {formatCurrency(totalPaid)} pagos de {formatCurrency(totalOriginalDebt)}
            </p>
          </div>

          {/* Strategy Button */}
          <Link href="/strategy">
            <Button
              className="w-full h-14 rounded-2xl text-base font-bold bg-purple-600 text-white"
              data-testid="button-generate-strategy"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Gerar Estratégia com IA
            </Button>
          </Link>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-lg mx-auto px-2 py-2 flex items-center justify-around">
          <Link href="/dashboard">
            <Button variant="ghost" className="flex-col h-auto py-2 gap-0.5 px-3" data-testid="button-nav-home">
              <TrendingDown className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold text-primary">Início</span>
            </Button>
          </Link>
          <Link href="/debts">
            <Button variant="ghost" className="flex-col h-auto py-2 gap-0.5 px-3" data-testid="button-nav-debts">
              <List className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Dívidas</span>
            </Button>
          </Link>
          <Link href="/incomes">
            <Button variant="ghost" className="flex-col h-auto py-2 gap-0.5 px-3" data-testid="button-nav-incomes">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Receitas</span>
            </Button>
          </Link>
          <Link href="/investments">
            <Button variant="ghost" className="flex-col h-auto py-2 gap-0.5 px-3" data-testid="button-nav-investments">
              <BarChart2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Investimentos</span>
            </Button>
          </Link>
          <Link href="/strategy">
            <Button variant="ghost" className="flex-col h-auto py-2 gap-0.5 px-3" data-testid="button-nav-strategy">
              <Sparkles className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Estratégia</span>
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
