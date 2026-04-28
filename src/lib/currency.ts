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
