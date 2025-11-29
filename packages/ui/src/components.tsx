// Shared UI components
export * from './components/Button';
export * from './components/Card';
export * from './components/StatusPill';
export * from './components/KPIStat';
export * from './components/Alert';
export * from './components/PageHeader';
export * from './components/Tabs';
export * from './components/TextField';
export * from './components/Select';

// Legacy component for backward compatibility
export function MoneyBadge({ amount }: { amount: number }) {
  return (
    <span className="font-semibold text-lg text-accent-500">
      ₹{(amount / 100).toFixed(2)}
    </span>
  );
}



