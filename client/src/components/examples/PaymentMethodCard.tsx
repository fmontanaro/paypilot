import PaymentMethodCard from '../PaymentMethodCard';

export default function PaymentMethodCardExample() {
  return (
    <div className="p-4 max-w-md">
      <PaymentMethodCard
        id="1"
        name="Nubank Ultravioleta"
        creditLimit={15000}
        availableCredit={8500}
        closingDay={5}
        dueDay={15}
        onClick={() => console.log('Payment method clicked')}
      />
    </div>
  );
}
