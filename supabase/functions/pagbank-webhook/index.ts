// Habitus: aviso de pagamento do PagBank (notification_urls do pedido) e "Consultar no PagBank" do Admin.
// Roda no Supabase (Deno), publicada com --no-verify-jwt: o PagBank chama sem login.
// O corpo serve só para achar o pagamento (reference_id ou id do pedido). Quem decide se foi pago é o pedido
// reconsultado no PagBank com o token do ambiente da própria linha; o corpo nunca libera nada.
// Responde 200 quando ignora o aviso (corpo ruim, sem pagamento, pedido não pago), para o PagBank não repetir;
// o motivo vai para o log. Com o pagamento achado, falha ao consultar o PagBank ou ao liberar responde 500,
// para o PagBank tentar de novo (grant_payment não paga duas vezes).
import { createClient } from "npm:@supabase/supabase-js@2";
import { getOrder, isPaidOrder } from "../_shared/pagbank.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function retry(reason: string): Response {
  console.error("pagbank-webhook tentar de novo:", reason);
  return reply({ paid: false }, 500);
}

function ignore(reason: string): Response {
  console.log("pagbank-webhook ignorado:", reason);
  return reply({ paid: false });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => null);
    const referenceId = typeof body?.reference_id === "string" ? body.reference_id : "";
    const orderId = typeof body?.id === "string" ? body.id : "";

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    let pid = UUID.test(referenceId) ? referenceId : null;
    if (!pid && orderId) {
      const found = await db.rpc("payment_id_for_order", { order_id: orderId });
      if (found.error) return retry(`busca do pedido ${orderId}: ${found.error.message}`);
      pid = found.data ?? null;
    }
    if (!pid) return ignore("sem pagamento no corpo");

    const { data: row, error: rowError } = await db.rpc("payment_for_webhook", { pid });
    if (rowError) return retry(`leitura de ${pid}: ${rowError.message}`);
    if (!row) return ignore(`pagamento ${pid} não existe`);
    if (row.status === "paid") return reply({ paid: true });
    if (!row.pagbank_order_id) return ignore(`pagamento ${pid} sem pedido no PagBank`);

    // Pedido, ambiente e valor vêm da linha: um sandbox pago nunca é consultado com o token de produção, e vice-versa.
    let order: unknown;
    try {
      order = await getOrder(row.env, row.pagbank_order_id);
    } catch (e) {
      return retry(`consulta de ${pid}: ${e instanceof Error ? e.message : "erro"}`);
    }
    if (!isPaidOrder(order, { orderId: row.pagbank_order_id, referenceId: row.id, cents: row.amount_cents })) {
      return ignore(`pedido de ${pid} ainda não pago`);
    }
    const { error } = await db.rpc("grant_payment", { pid });
    if (error) return retry(`grant_payment falhou para ${pid}`);
    console.log("pagbank-webhook liberado:", pid);
    return reply({ paid: true });
  } catch (e) {
    return ignore(e instanceof Error ? e.message : "erro");
  }
});
