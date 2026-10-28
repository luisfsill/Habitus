import { normalizeSearch } from "./access";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const RESERVED_USERNAMES: readonly string[] = [
  "admin", "administrador", "suporte", "support", "moderador", "staff",
  "equipe", "oficial", "official", "root", "sistema", "fundador",
];

const FALLBACK = "usuario";
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t" };

export function normalizeQuery(text: string): string {
  const q = normalizeSearch(text).replace(/^@/, "").trim();
  return q.length < USERNAME_MIN ? "" : q;
}

export function cleanUsername(text: string): string {
  return text.replace(/[@\s]/g, "").toLowerCase();
}

export function isReserved(username: string): boolean {
  const n = username.toLowerCase().replace(/[013457]/g, (c) => LEET[c]).replace(/[._]/g, "");
  return n.includes("habitus") || RESERVED_USERNAMES.includes(n);
}

export function usernameError(username: string, isAdmin: boolean): string | null {
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `O @ precisa ter de ${USERNAME_MIN} a ${USERNAME_MAX} caracteres.`;
  }
  if (!/^[a-z0-9._]+$/.test(username) || /^\.|\.$|\.\./.test(username)) {
    return "Use só letras minúsculas sem acento, números, ponto e sublinhado, sem ponto no começo, no fim ou repetido.";
  }
  if (!isAdmin && isReserved(username)) return "Esse @ é reservado. Escolha outro.";
  return null;
}

export function usernameCandidates(name: string): string[] {
  const words = normalizeSearch(name).split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, "")).filter(Boolean);
  let base = words.length > 1 ? `${words[0]}.${words[words.length - 1]}` : (words[0] ?? "");
  if (base.length < USERNAME_MIN || isReserved(base)) base = FALLBACK;
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
    if (n === 1) return base.slice(0, USERNAME_MAX).replace(/\.$/, "");
    return base.slice(0, USERNAME_MAX - String(n).length).replace(/\.$/, "") + n;
  });
}

export function isSocialPushId(id: string): boolean {
  return id.startsWith("social:");
}
