export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && isFinite(value);
}
