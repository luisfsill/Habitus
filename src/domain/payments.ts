import { photoLink } from "./access";
import { isRow, num, str } from "./friends";
import { addDays, dayKey } from "./time";

export type PaymentStatus = "pending" | "paid" | "expired" | "failed" | "canceled";
export type PaymentMethod = "manual" | "automatic";
export type PaymentMode = "manual" | "automatic";
export type PagbankEnv = "sandbox" | "production";
export interface PaymentConfig { mode: PaymentMode; env: PagbankEnv }
export type Checkout =
  | { mode: "manual" }
  | { mode: "fallback" }
  | { mode: "needs_cpf" }
  | { mode: "automatic"; paymentId: string; qrText: string; expiresAt: string };
export interface AdminPayment {
  id: string; userId: string; name: string; username: string | null; email: string; avatarUrl: string | null;
  planName: string; amountCents: number; days: number; method: PaymentMethod; status: PaymentStatus; env: PagbankEnv;
  orderCode: string | null; pagbankOrderId: string | null; createdAt: string; paidAt: string | null; grantedUntil: string | null;
}
export interface RevenuePoint { bucket: string; cents: number; count: number }
export interface Bar { label: string; cents: number; ratio: number }

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Confirmado",
  expired: "Expirado",
  failed: "Falhou",
  canceled: "Cancelado",
};

const STATUSES = Object.keys(STATUS_LABEL);
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const optStr = (v: unknown): string | null => (typeof v === "string" ? v : null);

export function parseConfig(raw: unknown): PaymentConfig {
  const r = isRow(raw) ? raw : {};
  return { mode: r.mode === "automatic" ? "automatic" : "manual", env: r.env === "production" ? "production" : "sandbox" };
}

export function parseCheckout(raw: unknown): Checkout {
  if (!isRow(raw)) return { mode: "fallback" };
  if (raw.mode === "manual" || raw.mode === "needs_cpf") return { mode: raw.mode };
  if (raw.mode === "automatic" && str(raw.paymentId) && str(raw.qrText) && str(raw.expiresAt)) {
    return { mode: "automatic", paymentId: raw.paymentId, qrText: raw.qrText, expiresAt: raw.expiresAt };
  }
  return { mode: "fallback" };
}

function parseAdminPaymentOptionals(r: Record<string, unknown>) {
  return {
    name: typeof r.name === "string" ? r.name : "", username: optStr(r.username), email: typeof r.email === "string" ? r.email : "",
    avatarUrl: photoLink(r.avatar_url), env: r.env === "production" ? ("production" as const) : ("sandbox" as const),
    orderCode: optStr(r.order_code), pagbankOrderId: optStr(r.pagbank_order_id), paidAt: optStr(r.paid_at), grantedUntil: optStr(r.granted_until),
  };
}

export function parseAdminPayment(raw: unknown): AdminPayment | null {
  if (!isRow(raw)) return null;
  const { id, user_id, plan_name, amount_cents, days, method, status, created_at } = raw;
  if (!str(id) || !str(user_id) || !str(plan_name) || !num(amount_cents) || !num(days) || !str(created_at)) return null;
  if (method !== "manual" && method !== "automatic") return null;
  if (typeof status !== "string" || !STATUSES.includes(status)) return null;
  return { id, userId: user_id, planName: plan_name, amountCents: amount_cents, days, method, status: status as PaymentStatus, createdAt: created_at, ...parseAdminPaymentOptionals(raw) };
}

export function parseRevenue(raw: unknown): RevenuePoint[] {
  if (!Array.isArray(raw)) return [];
  const out: RevenuePoint[] = [];
  for (const r of raw) {
    if (isRow(r) && str(r.bucket) && num(r.cents) && num(r.count)) out.push({ bucket: r.bucket, cents: r.cents, count: r.count });
  }
  return out;
}

/** 30 day bars or 12 month bars ending at `today`, oldest first, gaps filled with 0. */
export function revenueBars(points: readonly RevenuePoint[], period: "days" | "months", today: Date): Bar[] {
  const slots = period === "days"
    ? Array.from({ length: 30 }, (_, i) => {
        const d = addDays(today, i - 29);
        return { key: dayKey(d), label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}` };
      })
    : Array.from({ length: 12 }, (_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth() + i - 11, 1);
        return { key: dayKey(d).slice(0, 7), label: MONTHS[d.getMonth()] };
      });
  const bars = slots.map((s) => ({ label: s.label, cents: points.filter((p) => p.bucket === s.key).reduce((a, p) => a + p.cents, 0) }));
  const max = Math.max(...bars.map((b) => b.cents));
  return bars.map((b) => ({ ...b, ratio: max > 0 ? b.cents / max : 0 }));
}

const BRASILIA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** An ISO instant as "28/10 às 14:32", in Brasília time. */
export function formatPaymentTime(iso: string): string {
  const part = Object.fromEntries(BRASILIA.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${part.day}/${part.month} às ${part.hour}:${part.minute}`;
}

export function paymentSummary(points: readonly RevenuePoint[]): { cents: number; count: number; averageCents: number } {
  const cents = points.reduce((a, p) => a + p.cents, 0);
  const count = points.reduce((a, p) => a + p.count, 0);
  return { cents, count, averageCents: count > 0 ? Math.round(cents / count) : 0 };
}
