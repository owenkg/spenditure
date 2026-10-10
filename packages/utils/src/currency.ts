export function formatCurrency(amount: number, currency = 'UGX'): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-UG').format(amount);
}

export function parseCurrencyString(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
}
