/** UK NHS number: 10 digits with modulus-11 check digit. */
export function isValidNhsNumber(raw: string): boolean {
  const digits = raw.replace(/\s/g, '');
  if (!/^\d{10}$/.test(digits)) return false;

  const weights = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * weights[i];
  }
  return sum % 11 === 0;
}

export function formatNhsNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function isValidGestationWeeks(weeks: number): boolean {
  return Number.isInteger(weeks) && weeks >= 0 && weeks <= 42;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
