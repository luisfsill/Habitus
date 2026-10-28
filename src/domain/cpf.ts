export function cpfDigits(text: string): string {
  return text.replace(/\D/g, "");
}

function checkDigit(digits: string, length: number): number {
  let sum = 0;
  for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function isValidCpf(text: string): boolean {
  const d = cpfDigits(text);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  return checkDigit(d, 9) === Number(d[9]) && checkDigit(d, 10) === Number(d[10]);
}

/** "000.000.000-00" as the user types; partial input is fine. */
export function formatCpf(text: string): string {
  const d = cpfDigits(text).slice(0, 11);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(".");
  return d.length > 9 ? `${parts}-${d.slice(9)}` : parts;
}

/** "***.456.789-**" — hides the edges of a full CPF. */
export function maskCpf(digits: string): string {
  const d = cpfDigits(digits);
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}
