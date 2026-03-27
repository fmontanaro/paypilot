import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingDown, Sparkles, TrendingUp, List, Trophy, AlertCircle, AlertTriangle, Award, ThumbsUp, LogOut, DollarSign, BarChart2 } from "lucide-react";
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

  const totalDebt = debts.reduce((sum, debt) => sum + (parseFloat(debt.totalAmount) - parseFloat(debt.paidAmount)), 0);
  const totalPaid = debts.reduce((sum, debt) => sum + parseFloat(debt.paidAmount), 0);
  const totalOriginalDebt = totalDebt + totalPaid;
  const progressPercentage = totalOriginalDebt > 0 ? (totalPaid / totalOriginalDebt) * 100 : 0;
  
  const totalInvested = investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

  const username = user?.firstName || "Usuário";

  const today = new Date();
  const hasOverduePayments = debts.some(debt => {
    const dueDate = new Date(debt.dueDate);
    return !debt.isPaid && dueDate < today;
  });
  
  const upcomingDays = 7;
  const upcomingDate = new Date(today);
  upcomingDate.setDate(today.getDate() + upcomingDays);
  const hasUpcomingPayments = debts.some(debt => {
    const dueDate = new Date(debt.dueDate);
    return !debt.isPaid && dueDate >= today && dueDate <= upcomingDate;
  });
  
  const isAhead = debts.length > 0 && debts.every(debt => {
    const dueDate = new Date(debt.dueDate);
    return debt.isPaid || dueDate > upcomingDate;
  });

  const totalIncome = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);

  const isLoading = debtsLoading || incomesLoading || investmentsLoading;

  const getStatusCard = () => {
    if (totalDebt <= 0) {
      return {
        icon: Trophy,
        title: "Parabéns!",
        message: "Você não tem dívidas ativas!",
        bgColor: "bg-yellow-400"
      };
    }
    if (hasOverduePayments) {
      return {
        icon: AlertCircle,
        title: "Opa, atenção!",
        message: "Você tem pagamentos atrasados. Vamos organizar isso?",
        bgColor: "bg-red-400"
      };
    }
    if (hasUpcomingPayments) {
      return {
        icon: AlertTriangle,
        title: "Fique atento!",
        message: "Tem vencimentos chegando nos próximos dias!",
        bgColor: "bg-orange-400"
      };
    }
    if (isAhead) {
      return {
        icon: Award,
        title: "Incrível!",
        message: "Você está adiantado nos pagamentos!",
        bgColor: "bg-green-400"
      };
    }
    return {
      icon: ThumbsUp,
      title: "Tudo em dia!",
      message: "Continue assim, você está indo muito bem!",
      bgColor: "bg-primary"
    };
  };

  const statusCard = getStatusCard();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

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
          <Button size="icon" variant="ghost" className="rounded-full text-white" onClick={() => logout()} data-testid="button-logout">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Card className={`${statusCard.bgColor} rounded-3xl border-0 overflow-hidden p-6`} data-testid="card-status">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <statusCard.icon className="w-16 h-16 text-white" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-heading font-extrabold text-white mb-2">
                {statusCard.title}
              </h2>
              <p className="text-lg text-white/90 font-medium">
                {statusCard.message}
              </p>
            </div>
          </div>
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

          <Link href="/investments">
            <Card className="rounded-3xl border-4 border-blue-400 bg-white hover-elevate active-elevate-2 cursor-pointer" data-testid="card-total-invested">
              <CardContent className="p-5 space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <BarChart2 className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Total Investido</p>
                  <p className="text-2xl font-heading font-extrabold text-blue-500" data-testid="text-total-invested">
                    {formatCurrency(totalInvested)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Link href="/incomes">
          <Card className="rounded-3xl border-4 border-green-500 bg-white hover-elevate active-elevate-2 cursor-pointer" data-testid="card-total-income">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Receita Mensal</p>
                  <p className="text-2xl font-heading font-extrabold text-green-600" data-testid="text-total-income">
                    {formatCurrency(totalIncome)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{incomes.length} {incomes.length === 1 ? "fonte" : "fontes"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="bg-accent rounded-3xl border-0 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-heading font-bold text-white">Progresso Geral</h3>
            <span className="text-4xl font-heading font-extrabold text-white" data-testid="text-progress-percentage">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="relative w-full bg-white/20 rounded-full h-3 overflow-hidden mb-3">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
              data-testid="progress-general"
            />
          </div>
          <p className="text-base text-white font-medium">
            Você já pagou {formatCurrency(totalPaid)}! Continue assim! 🎉
          </p>
        </Card>

        <div className="pb-20 pt-2">
          <Link href="/strategy">
            <Button
              size="lg"
              className="w-full h-16 rounded-3xl text-lg font-bold shadow-xl bg-purple-500 hover:bg-purple-600 text-white"
              data-testid="button-generate-strategy"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Gerar Estratégia com IA
            </Button>
          </Link>
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
          <Link href="/incomes">
            <Button
              variant="ghost"
              className="flex-col h-auto py-2 gap-1"
              data-testid="button-nav-incomes"
            >
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Receitas</span>
            </Button>
          </Link>
          <Link href="/investments">
            <Button
              variant="ghost"
              className="flex-col h-auto py-2 gap-1"
              data-testid="button-nav-investments"
            >
              <BarChart2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Investimentos</span>
            </Button>
          </Link>
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
