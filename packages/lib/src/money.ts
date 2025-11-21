/**
 * Money utilities - all amounts in paise (smallest currency unit)
 * 1 rupee = 100 paise
 */

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatMoney(paise: number): string {
  return `₹${paiseToRupees(paise).toFixed(2)}`;
}

export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}

export function multiply(paise: number, factor: number): number {
  return Math.round(paise * factor);
}

export function divide(paise: number, divisor: number): number {
  return Math.round(paise / divisor);
}

export function round(paise: number): number {
  return Math.round(paise);
}



