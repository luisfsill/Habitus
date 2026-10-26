// Habitus: envia os lembretes vencidos da fila (push_queue) por Web Push.
// Roda no Supabase (Deno), chamada de minuto em minuto pelo pg_cron (supabase/push.sql).
// Publique com "Verify JWT" desligado: ela só envia o que já venceu, então chamar de fora não adianta nada.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

/** A reminder more than this late is dropped instead of arriving out of place. */
const STALE_MS = 15 * 60 * 1000;

interface Row {
  user_id: string;
  id: string;
  send_at: string;
  title: string;
  body: string;
  url: string;
}

interface Subscription {
  endpoint: string;
  user_id: string;
  p256dh: string;
  auth: string;
}

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async () => {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) return reply({ error: "VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY não configuradas." }, 500);
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:contato@habitus.app", publicKey, privateKey);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const now = new Date();
  const { data: due, error } = await db.from("push_queue").select("*").lte("send_at", now.toISOString()).limit(500);
  if (error) return reply({ error: error.message }, 500);
  const rows = (due ?? []) as Row[];
  if (rows.length === 0) return reply({ sent: 0 });

  // Take them off the queue first, so the next minute's run never sends them twice.
  const users = [...new Set(rows.map((r) => r.user_id))];
  await db.from("push_queue").delete().lte("send_at", now.toISOString()).in("user_id", users);

  const { data: subs } = await db.from("push_subscriptions").select("*").in("user_id", users);
  const byUser = new Map<string, Subscription[]>();
  for (const sub of (subs ?? []) as Subscription[]) byUser.set(sub.user_id, [...(byUser.get(sub.user_id) ?? []), sub]);

  let sent = 0;
  const gone = new Set<string>();
  for (const row of rows) {
    if (now.getTime() - new Date(row.send_at).getTime() > STALE_MS) continue;
    const payload = JSON.stringify({ title: row.title, body: row.body, url: row.url, tag: row.id });
    for (const sub of byUser.get(row.user_id) ?? []) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 900, urgency: "high" });
        sent++;
      } catch (e) {
        // 404/410: the browser dropped this subscription (app removed, permission revoked).
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.add(sub.endpoint);
      }
    }
  }
  if (gone.size > 0) await db.from("push_subscriptions").delete().in("endpoint", [...gone]);
  return reply({ sent, dropped: gone.size });
});
