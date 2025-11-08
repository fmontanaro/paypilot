import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DebtCardProps {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number;
  dueDate: string;
  onClick?: () => void;
}

export default function DebtCard({
  id,
  name,
  totalAmount,
  remainingAmount,
  interestRate,
  dueDate,
  onClick
}: DebtCardProps) {
  const progress = ((totalAmount - remainingAmount) / totalAmount) * 100;

  return (
    <Card
      className="bg-primary border-0 hover-elevate active-elevate-2 cursor-pointer rounded-2xl"
      onClick={onClick}
      data-testid={`card-debt-${id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-heading font-bold text-primary-foreground" data-testid={`text-debt-name-${id}`}>
            {name}
          </CardTitle>
          <span className="text-xs font-semibold text-primary-foreground bg-primary-foreground/20 px-3 py-1 rounded-full whitespace-nowrap">
            {interestRate}% a.m.
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-heading font-extrabold text-primary-foreground" data-testid={`text-amount-${id}`}>
            {formatCurrency(remainingAmount)}
          </span>
          <span className="text-sm text-primary-foreground/70 font-medium">
            de {formatCurrency(totalAmount)}
          </span>
        </div>

        <div className="space-y-2">
          <div className="w-full bg-primary-foreground/20 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary-foreground h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
              data-testid={`progress-${id}`}
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-primary-foreground/80 font-medium">
            <Calendar className="w-3 h-3" />
            <span data-testid={`text-duedate-${id}`}>Vence em {dueDate}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
