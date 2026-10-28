// Habitus: aviso de pagamento do PagBank (notification_urls do pedido) e "Consultar no PagBank" do Admin.
// Roda no Supabase (Deno), publicada com --no-verify-jwt: o PagBank chama sem login.
// O corpo serve só para achar o pagamento (reference_id ou id do pedido). Quem decide se foi pago é o pedido
// reconsultado no PagBank com o token do ambiente da própria linha; o corpo nunca libera nada.
// Sempre responde 200, para o PagBank não ficar repetindo; o motivo de ignorar vai para o log.
import { createClient } from "npm:@supabase/supabase-js@2";
import { getOrder, isPaidOrder } from "../_shared/pagbank.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
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
    if (!pid && orderId) pid = (await db.rpc("payment_id_for_order", { order_id: orderId })).data ?? null;
    if (!pid) return ignore("sem pagamento no corpo");

    const { data: row } = await db.rpc("payment_for_webhook", { pid });
    if (!row) return ignore(`pagamento ${pid} não existe`);
    if (row.status === "paid") return reply({ paid: true });
    if (!row.pagbank_order_id) return ignore(`pagamento ${pid} sem pedido no PagBank`);

    // Pedido, ambiente e valor vêm da linha: um sandbox pago nunca é consultado com o token de produção, e vice-versa.
    const order = await getOrder(row.env, row.pagbank_order_id);
    if (!isPaidOrder(order, { orderId: row.pagbank_order_id, referenceId: row.id, cents: row.amount_cents })) {
      return ignore(`pedido de ${pid} ainda não pago`);
    }
    const { error } = await db.rpc("grant_payment", { pid });
    if (error) return ignore(`grant_payment falhou para ${pid}`);
    console.log("pagbank-webhook liberado:", pid);
    return reply({ paid: true });
  } catch (e) {
    return ignore(e instanceof Error ? e.message : "erro");
  }
});
