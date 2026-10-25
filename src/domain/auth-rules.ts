/** Version of the Termos de uso and Política de privacidade the user accepts at sign-up. */
export const TERMS_VERSION = "2026-10-25";

export const MIN_PASSWORD_LENGTH = 8;

export function isValidEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

export function passwordChecks(password: string): { length: boolean; letter: boolean; number: boolean } {
  return {
    length: password.length >= MIN_PASSWORD_LENGTH,
    letter: /\p{L}/u.test(password),
    number: /\d/.test(password),
  };
}

/** 0 (empty) to 4: one point per rule met, plus one for a long password with a capital or symbol. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  const met = Object.values(passwordChecks(password)).filter(Boolean).length;
  const bonus = password.length >= 12 && /[A-Z]|[^\p{L}\d]/u.test(password) ? 1 : 0;
  return Math.min(4, met + bonus) as 0 | 1 | 2 | 3 | 4;
}

/** The 6-digit e-mail code, ignoring spaces and dashes; null if it is not 6 digits. */
export function normalizeCode(text: string): string | null {
  const code = text.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}
