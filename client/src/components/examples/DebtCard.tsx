import DebtCard from '../DebtCard';

export default function DebtCardExample() {
  return (
    <div className="p-4 max-w-md">
      <DebtCard
        id="1"
        name="Cartão de Crédito Nubank"
        totalAmount={5000}
        remainingAmount={3200}
        interestRate={12.5}
        dueDate="15/12/2025"
        onClick={() => console.log('Debt clicked')}
      />
    </div>
  );
}
