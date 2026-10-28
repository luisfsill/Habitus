// Habitus: cria a cobrança Pix do PagBank para "Assinar <plano>" no modo automático.
// Roda no Supabase (Deno). A chave service_role e os tokens do PagBank vêm do ambiente da função, nunca do app.
// Respostas: { mode: "manual" | "needs_cpf" | "fallback" } ou { mode: "automatic", paymentId, qrText, expiresAt }.
// Nunca devolve a resposta do PagBank nem o CPF.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createPixOrder, saoPauloTime } from "../_shared/pagbank.ts";

const QR_MINUTES = 30;
const MAX_PER_HOUR = 5;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Método não permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Quem chama vem do JWT, nunca do corpo. Conta vencida também pode pagar: basta estar logado.
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await createClient(url, anon, { auth: { persistSession: false } }).auth.getUser(jwt);
  const uid = auth.user?.id;
  if (!jwt || !uid) return reply({ error: "Entre na sua conta." }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Pedido inválido." }, 400);
  }
  const planId = typeof body.planId === "string" ? body.planId : "";
  if (!planId) return reply({ error: "Plano não informado." }, 400);

  const db = createClient(url, service, { auth: { persistSession: false } });
  const { data: mode } = await db.from("app_config").select("value").eq("key", "payment_mode").maybeSingle();
  if (mode?.value !== "automatic") return reply({ mode: "manual" });

  // Sandbox só para admin testar: membro de verdade nunca recebe QR de teste.
  const { data: env } = await db.from("app_config").select("value").eq("key", "pagbank_env").maybeSingle();
  if (env?.value !== "production") {
    const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: isAdmin } = await caller.rpc("is_admin");
    if (isAdmin !== true) return reply({ mode: "manual" });
  }

  // Toques repetidos em "Assinar": o mesmo QR, sem chamar o PagBank.
  const { data: open } = await db.rpc("open_auto_payment", { uid, plan: planId });
  if (open) return reply({ mode: "automatic", paymentId: open.id, qrText: open.qr_text, expiresAt: open.expires_at });

  const { data: taxId } = await db.rpc("tax_id_of", { uid });
  if (!taxId) return reply({ mode: "needs_cpf" });

  const { data: recent } = await db.rpc("recent_auto_payments", { uid });
  if (typeof recent !== "number" || recent >= MAX_PER_HOUR) return reply({ mode: "fallback" });

  const { data: pid, error: createError } = await db.rpc("create_auto_payment", { uid, plan: planId, order_code: null });
  if (createError || !pid) return reply({ error: "Plano indisponível." }, 400);

  try {
    // Valor e ambiente vêm da linha criada (preço do servidor), não do app nem de uma leitura separada.
    const { data: row } = await db.rpc("payment_for_webhook", { pid });
    const { data: plan } = await db.from("plans").select("name").eq("id", planId).single();
    const { data: profile } = await db.from("profiles").select("name, email").eq("id", uid).single();
    if (!row || !plan || !profile) throw new Error("dados do pagamento incompletos");

    // Ao PagBank vai o horário de São Paulo; ao app e ao banco, ISO em UTC.
    const expires = new Date(Date.now() + QR_MINUTES * 60_000);
    const expiresAt = expires.toISOString();
    const { orderId, qrText } = await createPixOrder({
      env: row.env,
      referenceId: pid,
      customer: { name: profile.name || profile.email, email: profile.email, taxId },
      item: { name: `Habitus ${plan.name}`, cents: row.amount_cents },
      expiresAt: saoPauloTime(expires),
      notificationUrl: `${url}/functions/v1/pagbank-webhook`,
    });
    const { error: attachError } = await db.rpc("attach_pagbank_order", { pid, order_id: orderId, qr: qrText, expires: expiresAt });
    if (attachError) throw new Error("não gravou o pedido do PagBank");
    return reply({ mode: "automatic", paymentId: pid, qrText, expiresAt });
  } catch (e) {
    console.error("pix-checkout", pid, e instanceof Error ? e.message : "erro");
    await db.rpc("fail_payment", { pid });
    return reply({ mode: "fallback" });
  }
});
