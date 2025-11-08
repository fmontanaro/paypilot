import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, TrendingDown } from "lucide-react";
import DebtCard from "./DebtCard";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

export default function DebtsListScreen() {
  const [debts] = useState([
    { id: "1", name: "Cartão de Crédito Nubank", totalAmount: 5000, remainingAmount: 3200, interestRate: 12.5, dueDate: "15/12/2025" },
    { id: "2", name: "Empréstimo Pessoal", totalAmount: 15000, remainingAmount: 12300, interestRate: 8.9, dueDate: "20/12/2025" },
    { id: "3", name: "Financiamento", totalAmount: 25000, remainingAmount: 18500, interestRate: 5.5, dueDate: "10/12/2025" },
  ]);

  const totalDebt = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);

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
            Minhas Dívidas
          </h1>
          <Button
            size="icon"
            className="rounded-full w-10 h-10"
            data-testid="button-add-debt"
            onClick={() => console.log('Add debt clicked')}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Card className="border-l-[6px] border-l-destructive bg-gradient-to-br from-destructive/15 to-destructive/5 rounded-2xl shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Total de Dívidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-4xl font-heading font-extrabold text-foreground" data-testid="text-total-debt">
                {formatCurrency(totalDebt)}
              </span>
              <span className="text-sm text-muted-foreground font-medium">
                {debts.length} {debts.length === 1 ? 'dívida' : 'dívidas'}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-heading font-bold text-foreground" data-testid="text-debts-list-title">
            Lista de Dívidas
          </h2>

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
      </main>
    </div>
  );
}
