export type Role = "user" | "admin";
export type PlanKind = "trial" | "paid";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** "trial" until an admin (or a payment) grants access. */
  plan: PlanKind;
  /** ISO date the access ends; null with `unlimited` or before any grant. */
  accessUntil: string | null;
  unlimited: boolean;
  createdAt: string;
  /** The @ chosen for friends; null until set, undefined when the server has no such column yet (not deployed). */
  username: string | null | undefined;
  /** Whether strangers can find this account by search. */
  searchable: boolean;
  /** Public link to the profile photo; null shows the person icon. */
  avatarUrl: string | null;
}

export interface Plan {
  id: string;
  name: string;
  days: number;
  priceCents: number;
  /** Shown as "Mais vantajoso". */
  highlight: boolean;
  active: boolean;
  sort: number;
}

export type AccessStatus = "admin" | "unlimited" | "expired" | "trial" | "active";

export const OWNER_WHATSAPP = "5537999216351";
const DAY_MS = 86_400_000;

export function hasAccess(p: Profile, now: Date): boolean {
  return p.role === "admin" || p.unlimited || (p.accessUntil !== null && Date.parse(p.accessUntil) > now.getTime());
}

export function accessStatus(p: Profile, now: Date): AccessStatus {
  if (p.role === "admin") return "admin";
  if (p.unlimited) return "unlimited";
  if (!hasAccess(p, now)) return "expired";
  return p.plan === "trial" ? "trial" : "active";
}

/** Whole days left, rounded up; 0 once expired. */
export function daysLeft(p: Profile, now: Date): number {
  if (p.accessUntil === null) return 0;
  return Math.max(0, Math.ceil((Date.parse(p.accessUntil) - now.getTime()) / DAY_MS));
}

/** Adds `days` to a validity still running; an expired or empty one starts from `now`. */
export function extendAccess(current: string | null, days: number, now: Date): string {
  const from = current !== null && Date.parse(current) > now.getTime() ? Date.parse(current) : now.getTime();
  return new Date(from + days * DAY_MS).toISOString();
}

/** "2026-11-30" → the last millisecond of that day in São Paulo (UTC−3, no daylight saving since 2019). */
export function endOfDaySaoPaulo(day: string): string {
  return new Date(Date.parse(`${day}T23:59:59.999-03:00`)).toISOString();
}

/** "31/12/2026" → "2026-12-31", or null when it is not a real calendar day. */
export function parseBrDate(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.getUTCDate() === Number(m[1]) && d.getUTCMonth() + 1 === Number(m[2]) ? iso : null;
}

export function displayName(p: Pick<Profile, "name" | "email">): string {
  return p.name.trim() || p.email.split("@")[0];
}

export function firstName(p: Pick<Profile, "name" | "email">): string {
  return displayName(p).split(/\s+/)[0];
}

export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export function matchesSearch(p: Profile, query: string): boolean {
  const q = normalizeSearch(query);
  return !q || normalizeSearch(p.name).includes(q) || normalizeSearch(p.email).includes(q);
}

export function renewWhatsAppUrl(name: string, email: string, planName: string): string {
  const text = `Olá! Sou ${name} (${email}) e quero renovar meu Habitus no plano ${planName}.`;
  return `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** A profile photo link; anything but https (or missing, before the column exists) means no photo. */
export const photoLink = (v: unknown): string | null => (typeof v === "string" && v.startsWith("https://") ? v : null);

/** A `profiles` row from Supabase, or null when it is not one. */
export function parseProfile(row: unknown): Profile | null {
  if (!isRecord(row)) return null;
  const { id, name, email, role, plan, access_until, unlimited, created_at, username, searchable, avatar_url } = row;
  if (typeof id !== "string" || typeof email !== "string" || typeof created_at !== "string") return null;
  if (role !== "user" && role !== "admin") return null;
  if (plan !== "trial" && plan !== "paid") return null;
  return {
    id,
    name: typeof name === "string" ? name : "",
    email,
    role,
    plan,
    accessUntil: typeof access_until === "string" ? access_until : null,
    unlimited: unlimited === true,
    createdAt: created_at,
    username: typeof username === "string" ? username : username === null ? null : undefined,
    searchable: searchable !== false,
    avatarUrl: photoLink(avatar_url),
  };
}

/** A `plans` row from Supabase, or null when it is not one. */
export function parsePlan(row: unknown): Plan | null {
  if (!isRecord(row)) return null;
  const { id, name, days, price_cents, highlight, active, sort } = row;
  if (typeof id !== "string" || typeof name !== "string") return null;
  if (typeof days !== "number" || days < 1 || typeof price_cents !== "number" || price_cents < 0) return null;
  return { id, name, days, priceCents: price_cents, highlight: highlight === true, active: active !== false, sort: typeof sort === "number" ? sort : 0 };
}

/** A profile saved by this app (camelCase), or null when the cache is damaged. */
export function parseCachedProfile(value: unknown): Profile | null {
  if (!isRecord(value)) return null;
  return parseProfile({
    id: value.id,
    name: value.name,
    email: value.email,
    role: value.role,
    plan: value.plan,
    access_until: value.accessUntil,
    unlimited: value.unlimited,
    created_at: value.createdAt,
    username: value.username,
    searchable: value.searchable,
    avatar_url: value.avatarUrl,
  });
}

/** 990 → "R$ 9,90". */
export function formatPrice(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

/** "9,90" or "R$ 9,90" → 990; null when it is not a price. */
export function parsePrice(text: string): number | null {
  const clean = text.replace(/\s|R\$/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

/** Status as shown in the admin panel. */
export function statusLabel(p: Profile, now: Date): string {
  const left = daysLeft(p, now);
  return {
    admin: "Admin",
    unlimited: "Ilimitado",
    expired: "Vencido",
    trial: `Teste · ${left} ${left === 1 ? "dia" : "dias"}`,
    active: "Ativo",
  }[accessStatus(p, now)];
}
