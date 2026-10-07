/** Formato internacional E.164: +58 4XX XXX XXXX → "+584XXXXXXXXX". */
export const E164 = /^\+[1-9]\d{7,14}$/;

/** Limpia espacios, guiones y paréntesis; conserva el "+" inicial. */
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') || trimmed.startsWith('00') ? `+${digits.replace(/^00/, '')}` : `+${digits}`;
}

export function isValidE164(phone: string): boolean {
  return E164.test(phone);
}

/** wa.me exige solo dígitos, sin "+". */
export function waDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}
