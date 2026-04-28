/**
 * Map a currency code to its display symbol. Used in salary tables,
 * compensation reports, and anywhere amounts are rendered with a
 * currency prefix.
 */
const SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  ILS: '₪',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  JPY: '¥',
  INR: '₹',
  BRL: 'R$',
};

export function currencySymbol(code?: string | null): string {
  if (!code) return '$';
  return SYMBOLS[code.toUpperCase()] || code;
}

export function formatCurrency(amount: number, code?: string | null): string {
  if (amount === 0) return '—';
  return `${currencySymbol(code)}${amount.toLocaleString()}`;
}

/**
 * Approximate exchange rates to USD (pivot currency).
 * Good enough for budget estimates; not for payroll or accounting.
 */
const RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  ILS: 0.28,
  CAD: 0.73,
  AUD: 0.65,
  CHF: 1.12,
  JPY: 0.0067,
  INR: 0.012,
  BRL: 0.19,
};

/**
 * Convert an amount from one currency to another using approximate rates.
 * Returns the converted amount rounded to the nearest integer.
 */
export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to || amount === 0) return amount;
  const fromRate = RATES_TO_USD[from.toUpperCase()] ?? 1;
  const toRate = RATES_TO_USD[to.toUpperCase()] ?? 1;
  return Math.round((amount * fromRate) / toRate);
}
