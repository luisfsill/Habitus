// Habitus: chamadas à API de Pedidos do PagBank, usadas por pix-checkout e pagbank-webhook.
// O token vem só dos segredos da função (PAGBANK_TOKEN_SANDBOX / PAGBANK_TOKEN_PRODUCTION). Nunca logue nem devolva.

export type PagbankEnv = "sandbox" | "production";

type Row = Record<string, unknown>;
const isRow = (v: unknown): v is Row => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Qualquer valor diferente de "production" cai no sandbox: na dúvida, nada de dinheiro real. */
export function baseUrl(env: string): string {
  return env === "production" ? "https://api.pagseguro.com" : "https://sandbox.api.pagseguro.com";
}

export function tokenFor(env: string): string {
  const token = Deno.env.get(env === "production" ? "PAGBANK_TOKEN_PRODUCTION" : "PAGBANK_TOKEN_SANDBOX");
  if (!token) throw new Error(`token do PagBank ausente (${env})`);
  return token;
}

/** Sem body faz GET; com body, POST. */
async function call(env: string, path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${baseUrl(env)}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${tokenFor(env)}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000), // o estouro vira erro: checkout cai no fallback e o webhook pede nova tentativa
  });
  // Só o código vai para o log: a resposta pode trazer dados da pessoa.
  const what = `PagBank respondeu ${res.status} (${body === undefined ? "GET" : "POST"} /orders)`;
  if (!res.ok) throw new Error(`${what}${await reasons(res)}`);
  // O erro de parse do JSON cita trechos do corpo: troca por uma mensagem só com o código.
  return await res.json().catch(() => {
    throw new Error(`${what} sem JSON`);
  });
}

/**
 * Os motivos de um erro do PagBank (error_messages: code, parameter_name, description), sem os valores enviados,
 * para o log dizer qual campo foi recusado. Corta em 300 caracteres.
 */
async function reasons(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  const list = isRow(data) && Array.isArray(data.error_messages) ? data.error_messages : [];
  const text = list
    .filter(isRow)
    .map((m) => [m.code, m.parameter_name, m.description].filter((v) => typeof v === "string").join(" "))
    .join("; ");
  return text ? `: ${text.slice(0, 300)}` : "";
}

/**
 * No sandbox, quem testa costuma ser o próprio dono, e o PagBank recusa comprador com o e-mail do vendedor
 * (40002 "buyer email must not be equals to merchant email"). Lá o e-mail ganha um "+teste" antes do @.
 * Em produção vai o e-mail da conta como está.
 */
export function buyerEmail(email: string, env: string): string {
  if (env === "production") return email;
  const at = email.lastIndexOf("@");
  return at > 0 ? `${email.slice(0, at)}+teste${email.slice(at)}` : email;
}

/** Horário de São Paulo com offset, como nos exemplos do PagBank (2026-10-28T12:30:00-03:00). Sem horário de verão desde 2019. */
export function saoPauloTime(date: Date): string {
  return new Date(date.getTime() - 3 * 3_600_000).toISOString().slice(0, 19) + "-03:00";
}

/** O "copia e cola": formato atual (charges[].qr_code) ou o depreciado (qr_codes[]). */
export function qrTextOf(order: unknown): string | null {
  if (!isRow(order)) return null;
  const codes = [
    ...list(order.charges).flatMap((c) => (isRow(c) ? (Array.isArray(c.qr_code) ? c.qr_code : [c.qr_code]) : [])),
    ...list(order.qr_codes),
    ...list(order.qr_code),
  ];
  for (const q of codes) if (isRow(q) && typeof q.text === "string" && q.text) return q.text;
  return null;
}

export interface PixOrderInput {
  env: string;
  referenceId: string;
  customer: { name: string; email: string; taxId: string };
  item: { name: string; cents: number };
  expiresAt: string;
  notificationUrl: string;
}

/** Cria o pedido Pix (exemplo "Criar Pedido - PIX QR Code", não o depreciado com qr_codes). */
export async function createPixOrder(input: PixOrderInput): Promise<{ orderId: string; qrText: string }> {
  const { env, referenceId, customer, item, expiresAt, notificationUrl } = input;
  const order = await call(env, "/orders", {
    reference_id: referenceId,
    customer: { name: customer.name, email: customer.email, tax_id: customer.taxId },
    items: [{ reference_id: referenceId, name: item.name, quantity: 1, unit_amount: item.cents }],
    charges: [{
      reference_id: referenceId,
      description: item.name,
      amount: { value: item.cents, currency: "BRL" },
      payment_method: { type: "PIX", pix: { expiration_date: expiresAt } },
    }],
    notification_urls: [notificationUrl],
  });
  const orderId = isRow(order) && typeof order.id === "string" ? order.id : "";
  const qrText = qrTextOf(order);
  if (!orderId || !qrText) throw new Error("PagBank não devolveu o pedido com o QR");
  return { orderId, qrText };
}

export function getOrder(env: string, orderId: string): Promise<unknown> {
  return call(env, `/orders/${encodeURIComponent(orderId)}`);
}

/**
 * Pago só quando o pedido reconsultado é o nosso (id e reference_id) e alguma cobrança está PAID com o valor do plano.
 * Vale para os dois formatos: no depreciado (qr_codes), o pagamento também aparece como uma charge PAID.
 */
export function isPaidOrder(order: unknown, expected: { orderId: string; referenceId: string; cents: number }): boolean {
  if (!isRow(order) || order.id !== expected.orderId || order.reference_id !== expected.referenceId) return false;
  return list(order.charges).some((c) => isRow(c) && c.status === "PAID" && isRow(c.amount) && c.amount.value === expected.cents);
}
