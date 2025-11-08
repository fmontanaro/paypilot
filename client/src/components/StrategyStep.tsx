import { Card, CardContent } from "@/components/ui/card";
import { Check, Circle } from "lucide-react";

interface StrategyStepProps {
  stepNumber: number;
  title: string;
  description: string;
  amount?: number;
  status: "completed" | "current" | "pending";
}

export default function StrategyStep({
  stepNumber,
  title,
  description,
  amount,
  status
}: StrategyStepProps) {
  const getStepColor = () => {
    switch (status) {
      case "completed":
        return "bg-accent text-accent-foreground";
      case "current":
        return "bg-primary text-primary-foreground";
      case "pending":
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="flex gap-4" data-testid={`step-${stepNumber}`}>
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold ${getStepColor()}`}>
          {status === "completed" ? (
            <Check className="w-5 h-5" />
          ) : (
            <span>{stepNumber}</span>
          )}
        </div>
        <div className="flex-1 w-0.5 bg-border mt-2" />
      </div>

      <Card className="flex-1 mb-4 hover-elevate rounded-2xl shadow-md">
        <CardContent className="p-5 space-y-2">
          <h3 className="font-heading font-bold text-base" data-testid={`step-title-${stepNumber}`}>
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`step-description-${stepNumber}`}>
            {description}
          </p>
          {amount && (
            <div className="text-lg font-heading font-bold text-primary" data-testid={`step-amount-${stepNumber}`}>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(amount)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
