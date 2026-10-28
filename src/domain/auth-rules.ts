/** Version of the Termos de uso and Política de privacidade the user accepts at sign-up. */
export const TERMS_VERSION = "2026-10-28";

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

export const OFFLINE = "Sem conexão. Verifique sua internet e tente de novo.";

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail com o código que enviamos.",
  user_already_exists: "Já existe uma conta com este e-mail. Tente entrar.",
  email_exists: "Já existe uma conta com este e-mail. Tente entrar.",
  otp_expired: "Código inválido ou expirado. Peça um novo.",
  weak_password: "Senha fraca. Use pelo menos 8 caracteres, com letras e números.",
  same_password: "A nova senha precisa ser diferente da atual.",
  email_address_invalid: "Este e-mail não parece válido.",
  over_email_send_rate_limit: "Muitos e-mails enviados. Espere alguns minutos e tente de novo.",
  over_request_rate_limit: "Muitas tentativas. Espere um pouco e tente de novo.",
  user_not_found: "Não encontramos uma conta com este e-mail.",
};

/** A Portuguese message for any error the auth service throws; never the raw English text. */
export function authErrorMessage(error: { code?: string; name?: string; message?: string } | null | undefined): string {
  if (error?.name === "AuthRetryableFetchError" || /fetch|network/i.test(error?.message ?? "")) return OFFLINE;
  return (error?.code && AUTH_ERRORS[error.code]) || "Algo deu errado. Tente de novo em instantes.";
}
