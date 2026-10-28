import { type AdminPayment, type Checkout, type PagbankEnv, parseAdminPayment, parseCheckout, parseConfig, parseRevenue, type PaymentConfig, type PaymentStatus, type RevenuePoint } from "@/domain/payments";

import { serviceError } from "./profile";
import { requireSupabase } from "./supabase";

async function call(name: string, args?: Record<string, unknown>): Promise<unknown> {
  const result = await requireSupabase().rpc(name, args);
  if (result.error) throw serviceError(result.error);
  return result.data as unknown;
}

/** Runs an Edge Function; throws with the function's { error } message when there is one. */
async function invoke(name: string, body: Record<string, unknown>): Promise<unknown> {
  const result = await requireSupabase().functions.invoke<unknown>(name, { body });
  const error = result.error as { message?: string; context?: { json?: () => Promise<{ error?: string }> } } | null;
  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(detail?.error ?? serviceError(error).message);
  }
  return result.data;
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const { data, error } = await requireSupabase().from("app_config").select("key, value");
  if (error) throw serviceError(error);
  const value = (key: string) => (data as { key: string; value: string }[]).find((r) => r.key === key)?.value;
  return parseConfig({ mode: value("payment_mode"), env: value("pagbank_env") });
}

export async function setPaymentConfig(key: "payment_mode" | "pagbank_env", value: string): Promise<void> {
  await call("admin_set_config", { k: key, v: value });
}

/** Never throws: any failure means "use the manual Pix". */
export async function startPixCheckout(planId: string): Promise<Checkout> {
  try {
    return parseCheckout(await invoke("pix-checkout", { planId }));
  } catch {
    return { mode: "fallback" };
  }
}

/** Records the order and returns its code (the one that goes in the static Pix). */
export async function startManualPayment(planId: string): Promise<string> {
  const code = await call("start_manual_payment", { plan: planId });
  if (typeof code !== "string" || !code) throw new Error("Não deu para gerar o código do pedido.");
  return code;
}

export async function paymentStatus(id: string): Promise<PaymentStatus> {
  const status = await call("my_payment_status", { pid: id });
  return status === "paid" || status === "expired" || status === "failed" || status === "canceled" ? status : "pending";
}

export async function myTaxId(): Promise<string | null> {
  const cpf = await call("my_tax_id");
  return typeof cpf === "string" && cpf ? cpf : null;
}

export async function saveTaxId(cpf: string): Promise<void> {
  await call("set_my_tax_id", { cpf });
}

export async function adminPayments(
  status: "all" | "paid" | "pending" | "closed",
  before: string | null,
  max: number,
  env: PagbankEnv,
): Promise<AdminPayment[]> {
  const rows = await call("admin_payments", { st: status, before, max, environment: env });
  return Array.isArray(rows) ? rows.map(parseAdminPayment).filter((p): p is AdminPayment => p !== null) : [];
}

export async function adminRevenue(period: "days" | "months", env: PagbankEnv): Promise<RevenuePoint[]> {
  return parseRevenue(await call("admin_revenue", { period, environment: env }));
}

export async function confirmPayment(id: string): Promise<void> {
  await call("admin_confirm_payment", { pid: id });
}

export async function cancelPayment(id: string): Promise<void> {
  await call("admin_cancel_payment", { pid: id });
}

/** Asks pagbank-webhook to re-check the order with PagBank (reference_id is the payment id). */
export async function recheckPayment(id: string): Promise<void> {
  await invoke("pagbank-webhook", { reference_id: id });
}
