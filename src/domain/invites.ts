/** Where the published web app lives; invite links point here. */
export const SITE_URL = "https://habitushub.vercel.app";

/** Codes are 10 characters (see admin_create_invite). */
export const INVITE_CODE_LENGTH = 10;

/** License lengths the admin can give; null is unlimited. */
export const INVITE_OPTIONS: readonly { days: number | null; label: string }[] = [
  { days: 30, label: "30 dias" },
  { days: 180, label: "6 meses" },
  { days: 365, label: "1 ano" },
  { days: null, label: "Ilimitado" },
];

export interface Invite {
  code: string;
  /** null = unlimited. */
  days: number | null;
  createdAt: string;
  /** Until when the code can be used to sign up. */
  expiresAt: string;
  usedAt: string | null;
  /** The account created with it (`used_by`); null when unused or the account was deleted. */
  usedBy: string | null;
  /** Name and e-mail of that account, filled in by the admin list. */
  user?: { name: string; email: string };
}

export type InviteStatus = "pending" | "used" | "expired";

/** " abcd-1234 " → "ABCD1234": what people type or paste becomes the stored code. */
export function normalizeInviteCode(text: string): string {
  return text.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, INVITE_CODE_LENGTH);
}

/** 30 → "30 dias", 180 → "6 meses", 365 → "1 ano", null → "acesso ilimitado". */
export function licenseLabel(days: number | null): string {
  if (days === null) return "acesso ilimitado";
  if (days % 365 === 0) return days === 365 ? "1 ano" : `${days / 365} anos`;
  if (days % 30 === 0 && days > 30) return `${days / 30} meses`;
  return days === 1 ? "1 dia" : `${days} dias`;
}

function brDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/** The ready-to-paste message (WhatsApp, e-mail): the site link, then the code to redeem in the app once the account exists. */
export function inviteMessage(invite: Pick<Invite, "code" | "days" | "expiresAt">, origin = SITE_URL): string {
  const gift = invite.days === null ? "acesso *ilimitado* e gratuito" : `*${licenseLabel(invite.days)}* de licença gratuita`;
  return [
    "✨ *Você ganhou um presente no Habitus!* ✨",
    "",
    `🎁 Seu código de presente dá ${gift} para usar o app.`,
    "",
    "🌿 O Habitus é o seu app de lembretes virtual: ele te avisa na hora certa do que importa no seu dia.",
    "",
    "*Como resgatar:*",
    `1️⃣ Abra ${origin}, instale o app e crie sua conta.`,
    "2️⃣ No app, toque na sua foto no canto de cima e depois em *Gift Code*.",
    `3️⃣ Digite o código *${invite.code}* e toque em *Resgatar código*.`,
    "",
    `⏳ O código vale até ${brDate(invite.expiresAt)}, para uma única conta.`,
    "",
    "Te espero lá! 💧",
  ].join("\n");
}

/** Under the prize, after a code is redeemed. */
export function giftMessage(days: number | null): string {
  return days === null ? "Seu acesso agora é ilimitado." : `+${licenseLabel(days)} somados ao seu plano.`;
}

export function inviteStatus(invite: Invite, now: Date): InviteStatus {
  if (invite.usedAt !== null) return "used";
  return Date.parse(invite.expiresAt) > now.getTime() ? "pending" : "expired";
}

/** An `invites` row from Supabase, or null when it is not one. */
export function parseInvite(row: unknown): Invite | null {
  if (typeof row !== "object" || row === null) return null;
  const { code, days, created_at, expires_at, used_at, used_by } = row as Record<string, unknown>;
  if (typeof code !== "string" || typeof created_at !== "string" || typeof expires_at !== "string") return null;
  if (days !== null && (typeof days !== "number" || days < 1)) return null;
  return { code, days, createdAt: created_at, expiresAt: expires_at, usedAt: typeof used_at === "string" ? used_at : null,
    usedBy: typeof used_by === "string" ? used_by : null,
  };
}
