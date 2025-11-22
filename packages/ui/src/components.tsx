// Shared UI components will be exported here
// For now, this is a placeholder

export function MoneyBadge({ amount }: { amount: number }) {
  return (
    <span className="font-semibold text-lg text-accent-blue">
      ₹{(amount / 100).toFixed(2)}
    </span>
  );
}



