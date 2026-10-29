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

/** One account that redeemed a code (`invite_redemptions`). */
export interface Redemption {
  /** null when the account was deleted. */
  userId: string | null;
  usedAt: string;
  /** Name and e-mail of that account, filled in by the admin list. */
  user?: { name: string; email: string };
}

export interface Invite {
  code: string;
  /** null = unlimited. */
  days: number | null;
  /** How many accounts can redeem it. */
  maxUses: number;
  createdAt: string;
  /** Until when the code can be redeemed. */
  expiresAt: string;
  redemptions: Redemption[];
}

export type InviteStatus = "pending" | "used" | "expired";

/** "12" → 12; empty, zero or anything but digits → null. For the admin's licenses and custom days fields. */
export function positiveInt(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const n = Number(text.trim());
  return n > 0 ? n : null;
}

/** One line of the admin history: the code still open (or expired unused), or one account that redeemed it. */
export type InviteEntry = { invite: Invite; redemption?: Redemption };

/** Each redemption gets its own line, so a shared code repeats once per person; newest first. */
export function inviteEntries(invite: Invite, now: Date): InviteEntry[] {
  const status = inviteStatus(invite, now);
  const open = status === "pending" || (status === "expired" && invite.redemptions.length === 0);
  const used = [...invite.redemptions].sort((a, b) => b.usedAt.localeCompare(a.usedAt)).map((redemption) => ({ invite, redemption }));
  return open ? [{ invite }, ...used] : used;
}

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
export function inviteMessage(invite: Pick<Invite, "code" | "days" | "expiresAt" | "maxUses">, origin = SITE_URL): string {
  const gift = invite.days === null ? "acesso *ilimitado* e gratuito" : `*${licenseLabel(invite.days)}* de licença gratuita`;
  return [
    "✨ *Você ganhou um presente no Habitus!* ✨",
    "",
    `🎁 Seu código de presente dá ${gift} para usar o app.`,
    "",
    "💧 *Gota a gota, um hábito se forma.* Não com uma virada de chave, mas com pequenos gestos repetidos todos os dias, na hora certa.",
    "",
    "🌿 O problema é que a gente esquece: a rotina engole o dia e a boa intenção fica para amanhã. O Habitus espalha 6 dicas de bem-estar pelo seu dia e te avisa de cada uma no momento certo, até virar hábito. Quais são? 🤫 Só quem entra descobre.",
    "",
    "*Como resgatar:*",
    `1️⃣ Abra ${origin}, instale o app e crie sua conta.`,
    "2️⃣ No app, toque na sua foto no canto de cima e depois em *Gift Code*.",
    `3️⃣ Digite o código *${invite.code}* e toque em *Resgatar código*.`,
    "",
    `⏳ O código vale até ${brDate(invite.expiresAt)}${invite.maxUses === 1 ? ", para uma única conta" : ""}.`,
    "",
    "Te espero lá! 💧",
  ].join("\n");
}

/** Under the prize, after a code is redeemed. */
export function giftMessage(days: number | null): string {
  return days === null ? "Seu acesso agora é ilimitado." : `+${licenseLabel(days)} somados ao seu plano.`;
}

/** "used" once every license is taken. */
export function inviteStatus(invite: Invite, now: Date): InviteStatus {
  if (invite.redemptions.length >= invite.maxUses) return "used";
  return Date.parse(invite.expiresAt) > now.getTime() ? "pending" : "expired";
}

/** An `invites` row from Supabase (with its `invite_redemptions`), or null when it is not one. */
export function parseInvite(row: unknown): Invite | null {
  if (typeof row !== "object" || row === null) return null;
  const { code, days, max_uses, created_at, expires_at, invite_redemptions } = row as Record<string, unknown>;
  if (typeof code !== "string" || typeof created_at !== "string" || typeof expires_at !== "string") return null;
  if (days !== null && (typeof days !== "number" || days < 1)) return null;
  const redemptions = (Array.isArray(invite_redemptions) ? (invite_redemptions as Record<string, unknown>[]) : [])
    .filter((r) => typeof r.used_at === "string")
    .map((r) => ({ userId: typeof r.user_id === "string" ? r.user_id : null, usedAt: r.used_at as string }));
  return { code, days, maxUses: typeof max_uses === "number" && max_uses > 0 ? max_uses : 1, createdAt: created_at, expiresAt: expires_at, redemptions };
}
