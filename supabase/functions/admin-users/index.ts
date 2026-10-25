// Habitus: ações do painel que exigem a API de administração do Supabase.
// Roda no Supabase (Deno). A chave service_role vem do ambiente da função, nunca do app.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

/** 10 characters without look-alikes (0/O, 1/l/I). */
function provisionalPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Método não permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Who is calling? Use their own token, so RLS answers whether they are an admin.
  const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: isAdmin, error: roleError } = await caller.rpc("is_admin");
  if (roleError || isAdmin !== true) return reply({ error: "Apenas administradores." }, 403);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Pedido inválido." }, 400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const id = typeof body.id === "string" ? body.id : "";

  switch (body.action) {
    case "create": {
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
      if (!name || !email.includes("@")) return reply({ error: "Informe nome e e-mail válidos." }, 400);
      const password = provisionalPassword();
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
      if (error) return reply({ error: error.message.includes("already") ? "Já existe uma conta com este e-mail." : "Não foi possível criar a conta." }, 400);
      return reply({ id: data.user.id, password });
    }
    case "update_email": {
      if (!id || !email.includes("@")) return reply({ error: "Informe um e-mail válido." }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true });
      if (error) return reply({ error: "Não foi possível trocar o e-mail (talvez ele já esteja em uso)." }, 400);
      await admin.from("profiles").update({ email }).eq("id", id);
      return reply({ ok: true });
    }
    case "reset_password": {
      if (!id) return reply({ error: "Conta não informada." }, 400);
      const password = provisionalPassword();
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) return reply({ error: "Não foi possível gerar a senha." }, 400);
      return reply({ password });
    }
    default:
      return reply({ error: "Ação desconhecida." }, 400);
  }
});
