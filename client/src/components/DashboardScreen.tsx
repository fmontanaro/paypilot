import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingDown, CreditCard, Sparkles } from "lucide-react";
import DebtCard from "./DebtCard";
import PaymentMethodCard from "./PaymentMethodCard";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import logoUrl from "@assets/4801ec1b-4f41-47c7-8453-60ba6517c851_1762570567956.png";

export default function DashboardScreen() {
  const [debts] = useState([
    { id: "1", name: "Cartão de Crédito Nubank", totalAmount: 5000, remainingAmount: 3200, interestRate: 12.5, dueDate: "15/12/2025" },
    { id: "2", name: "Empréstimo Pessoal", totalAmount: 15000, remainingAmount: 12300, interestRate: 8.9, dueDate: "20/12/2025" },
    { id: "3", name: "Financiamento", totalAmount: 25000, remainingAmount: 18500, interestRate: 5.5, dueDate: "10/12/2025" },
  ]);

  const [paymentMethods] = useState([
    { id: "1", name: "Nubank Ultravioleta", creditLimit: 15000, availableCredit: 8500, closingDay: 5, dueDay: 15 },
    { id: "2", name: "Itaú Gold", creditLimit: 8000, availableCredit: 6200, closingDay: 10, dueDay: 20 },
  ]);

  const totalDebt = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);

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

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Card className="border-l-[6px] border-l-primary bg-gradient-to-br from-primary/10 to-accent/5 rounded-2xl shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total de Dívidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-4xl font-heading font-extrabold text-foreground" data-testid="text-total-debt">
                {formatCurrency(totalDebt)}
              </span>
              <TrendingDown className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-heading font-extrabold text-foreground" data-testid="text-debts-title">
              Suas Dívidas
            </h2>
            <Button
              size="icon"
              className="rounded-full w-10 h-10"
              data-testid="button-add-debt"
              onClick={() => console.log('Add debt clicked')}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-3">
            {debts.map((debt) => (
              <DebtCard
                key={debt.id}
                {...debt}
                onClick={() => console.log('Debt clicked:', debt.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-heading font-extrabold text-foreground flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              Meios de Pagamento
            </h2>
            <Button
              size="icon"
              className="rounded-full w-10 h-10"
              data-testid="button-add-payment"
              onClick={() => console.log('Add payment method clicked')}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                {...method}
                onClick={() => console.log('Payment method clicked:', method.id)}
              />
            ))}
          </div>
        </div>

        <div className="pb-20">
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
