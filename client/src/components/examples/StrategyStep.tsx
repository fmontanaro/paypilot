import StrategyStep from '../StrategyStep';

export default function StrategyStepExample() {
  return (
    <div className="p-4 max-w-md">
      <StrategyStep
        stepNumber={1}
        title="Pagar fatura do Nubank"
        description="Use o limite disponível do Itaú para pagar R$ 3.200 da fatura do Nubank e evitar juros altos de 12.5%"
        amount={3200}
        status="current"
      />
    </div>
  );
}
