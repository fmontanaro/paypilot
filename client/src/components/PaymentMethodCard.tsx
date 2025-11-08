import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PaymentMethodCardProps {
  id: string;
  name: string;
  creditLimit: number;
  availableCredit: number;
  closingDay: number;
  dueDay: number;
  onClick?: () => void;
}

export default function PaymentMethodCard({
  id,
  name,
  creditLimit,
  availableCredit,
  closingDay,
  dueDay,
  onClick
}: PaymentMethodCardProps) {
  const usedPercentage = ((creditLimit - availableCredit) / creditLimit) * 100;
  const isHighUsage = usedPercentage > 70;

  return (
    <Card
      className={`border-l-[6px] ${isHighUsage ? 'border-l-destructive bg-gradient-to-br from-destructive/15 to-destructive/5' : 'border-l-accent bg-gradient-to-br from-accent/15 to-accent/5'} hover-elevate active-elevate-2 cursor-pointer rounded-2xl shadow-md`}
      onClick={onClick}
      data-testid={`card-payment-${id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-heading font-bold flex items-center gap-2" data-testid={`text-payment-name-${id}`}>
            <CreditCard className="w-5 h-5 text-primary" />
            {name}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground font-medium">Disponível</span>
            <span className="text-2xl font-heading font-extrabold text-accent" data-testid={`text-available-${id}`}>
              {formatCurrency(availableCredit)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground text-right font-medium">
            Limite: {formatCurrency(creditLimit)}
          </div>
        </div>

        <div className="space-y-2">
          <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isHighUsage ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${usedPercentage}%` }}
              data-testid={`progress-usage-${id}`}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Fecha dia {closingDay}</span>
            </div>
            <span data-testid={`text-dueday-${id}`}>Vence dia {dueDay}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
