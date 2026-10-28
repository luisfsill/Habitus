-- Habitus: pagamentos (Pix manual e automático pelo PagBank), CPF de quem paga e área Pagamentos do Admin.
-- Rode DEPOIS de admin.sql e social.sql: cole tudo no SQL Editor do Supabase e clique em Run.
-- Pode rodar de novo sem problema.
--
-- Funções só para o servidor (execute só para service_role; as Edge Functions chamam com a chave secreta):
--   grant_payment(pid uuid) returns boolean
--     marca pago e soma os dias à conta; idempotente; true só quando liberou agora.
--   create_auto_payment(uid uuid, plan text, order_code text) returns uuid
--     cria um pagamento automatic/pending com preço e dias do plano ativo e o pagbank_env atual;
--     antes, marca expired os automáticos pending vencidos da conta.
--   attach_pagbank_order(pid uuid, order_id text, qr text, expires timestamptz) returns void
--     grava o id do pedido do PagBank (ORDE_...), o "copia e cola" e o vencimento do QR, só se ainda não tem pedido.
--   fail_payment(pid uuid) returns void
--     um pending vira failed (erro ao criar a cobrança).
--   payment_for_webhook(pid uuid) returns jsonb
--     {id, user_id, env, pagbank_order_id, amount_cents, status}, ou null.
--   payment_id_for_order(order_id text) returns uuid
--     o pagamento de um pedido do PagBank, ou null.
--   open_auto_payment(uid uuid, plan text) returns jsonb
--     {id, qr_text, expires_at} do automático pending mais novo do plano, no ambiente atual,
--     com QR que ainda vale por mais de 2 min; ou null. Reaproveitar não precisa chamar o PagBank.
--   recent_auto_payments(uid uuid) returns int
--     quantas cobranças automáticas a conta criou na última hora (limite de 5 fica na função).
--   tax_id_of(uid uuid) returns text
--     os 11 dígitos do CPF da conta, ou null.

-- Configuração global ---------------------------------------------------------

create table if not exists public.app_config (
  key text primary key,
  value text not null
);

alter table public.app_config enable row level security;

drop policy if exists "read config" on public.app_config;
create policy "read config" on public.app_config for select to authenticated using (true);
-- Sem políticas de escrita: só admin_set_config muda.

insert into public.app_config (key, value) values ('payment_mode', 'manual'), ('pagbank_env', 'sandbox')
on conflict (key) do nothing;

-- Pagamentos --------------------------------------------------------------------
-- amount_cents e days são copiados do plano na compra: mudar o preço depois não afeta cobranças abertas.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null references public.plans (id),
  amount_cents int not null check (amount_cents >= 0),
  days int not null check (days > 0),
  method text not null check (method in ('manual', 'automatic')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'failed', 'canceled')),
  env text not null check (env in ('sandbox', 'production')),
  order_code text unique,
  pagbank_order_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  granted_until timestamptz
);

-- QR do Pix automático, para reaproveitar um pending sem chamar o PagBank. Nunca sai em admin_payments.
alter table public.payments add column if not exists qr_text text;
alter table public.payments add column if not exists expires_at timestamptz;

create index if not exists payments_created_at_idx on public.payments (created_at desc);
create index if not exists payments_user_id_idx on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;

drop policy if exists "read own payments" on public.payments;
create policy "read own payments" on public.payments for select to authenticated using ((select auth.uid()) = user_id);
-- Sem políticas de escrita: só as funções abaixo criam e mudam pagamentos.

-- Automático vencido: pelo expires_at do QR ou, sem ele, 30 min depois de criado.
create or replace function public.payment_overdue(p public.payments)
returns boolean language sql stable set search_path = ''
as $$
  select p.method = 'automatic' and p.status = 'pending'
    and coalesce(p.expires_at, p.created_at + interval '30 minutes') < now();
$$;

-- CPF de quem paga ---------------------------------------------------------------
-- Só pix-checkout lê (pelo service_role) para mandar ao PagBank. Nenhuma função de amigos, ranking ou admin devolve.

create table if not exists public.billing_info (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tax_id text not null check (tax_id ~ '^[0-9]{11}$'),
  updated_at timestamptz not null default now()
);

alter table public.billing_info enable row level security;

drop policy if exists "read own billing" on public.billing_info;
create policy "read own billing" on public.billing_info for select to authenticated using ((select auth.uid()) = user_id);

-- Funções internas ------------------------------------------------------------------

-- Mesma regra de isValidCpf (src/domain/cpf.ts): 11 dígitos, não todos iguais, dois verificadores.
create or replace function public.cpf_ok(d text)
returns boolean language plpgsql immutable set search_path = ''
as $$
begin
  if d !~ '^[0-9]{11}$' or d = repeat(left(d, 1), 11) then
    return false;
  end if;
  return (select (sum(substr(d, i, 1)::int * (11 - i)) * 10) % 11 % 10 from generate_series(1, 9) i) = substr(d, 10, 1)::int
    and (select (sum(substr(d, i, 1)::int * (12 - i)) * 10) % 11 % 10 from generate_series(1, 10) i) = substr(d, 11, 1)::int;
end;
$$;

-- "HAB" e 6 letras ou dígitos sem 0/O/1/I, como orderCode() em src/domain/pix.ts. Não é segredo.
create or replace function public.new_order_code()
returns text language sql volatile set search_path = ''
as $$
  select 'HAB' || string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 6);
$$;

-- Liberação -------------------------------------------------------------------------
-- Mesma regra de extendAccess (src/domain/access.ts): soma a partir da validade se ela ainda corre, senão de agora.
-- O "for update" faz um segundo aviso esperar o primeiro e então ver o pagamento já pago.

create or replace function public.grant_payment(pid uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  p public.payments;
  new_until timestamptz;
begin
  select * into p from public.payments where id = pid for update;
  if not found or p.status = 'paid' then
    return false;
  end if;
  update public.profiles
  set access_until = greatest(coalesce(access_until, now()), now()) + p.days * interval '24 hours', plan = 'paid'
  where id = p.user_id
  returning access_until into new_until;
  update public.payments set status = 'paid', paid_at = now(), granted_until = new_until where id = pid;
  return true;
end;
$$;

-- Funções do servidor (Edge Functions) ---------------------------------------------------

create or replace function public.create_auto_payment(uid uuid, plan text, order_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  pl public.plans;
  new_id uuid;
begin
  select * into pl from public.plans where id = plan and active;
  if not found then
    raise exception 'Plano indisponível.' using errcode = '22023';
  end if;
  update public.payments pay set status = 'expired' where pay.user_id = uid and public.payment_overdue(pay);
  insert into public.payments (user_id, plan_id, amount_cents, days, method, status, env, order_code)
  values (
    uid, pl.id, pl.price_cents, pl.days, 'automatic', 'pending',
    coalesce((select value from public.app_config where key = 'pagbank_env'), 'sandbox'),
    create_auto_payment.order_code
  )
  returning id into new_id;
  return new_id;
end;
$$;

drop function if exists public.attach_pagbank_order(uuid, text);
create or replace function public.attach_pagbank_order(pid uuid, order_id text, qr text, expires timestamptz)
returns void language sql security definer set search_path = ''
as $$
  update public.payments set pagbank_order_id = order_id, qr_text = qr, expires_at = expires
  where id = pid and pagbank_order_id is null;
$$;

create or replace function public.fail_payment(pid uuid)
returns void language sql security definer set search_path = ''
as $$
  update public.payments set status = 'failed' where id = pid and status = 'pending';
$$;

create or replace function public.payment_for_webhook(pid uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', id, 'user_id', user_id, 'env', env, 'pagbank_order_id', pagbank_order_id,
    'amount_cents', amount_cents, 'status', status
  )
  from public.payments where id = pid;
$$;

create or replace function public.payment_id_for_order(order_id text)
returns uuid language sql stable security definer set search_path = ''
as $$
  select id from public.payments where pagbank_order_id = order_id;
$$;

create or replace function public.open_auto_payment(uid uuid, plan text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('id', id, 'qr_text', qr_text, 'expires_at', expires_at)
  from public.payments
  where user_id = uid and plan_id = plan and method = 'automatic' and status = 'pending'
    and qr_text is not null and expires_at > now() + interval '2 minutes'
    and env = (select value from public.app_config where key = 'pagbank_env')
  order by created_at desc
  limit 1;
$$;

create or replace function public.recent_auto_payments(uid uuid)
returns int language sql stable security definer set search_path = ''
as $$
  select count(*)::int from public.payments
  where user_id = uid and method = 'automatic' and created_at > now() - interval '1 hour';
$$;

create or replace function public.tax_id_of(uid uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select tax_id from public.billing_info where user_id = uid;
$$;

-- Funções da conta ---------------------------------------------------------------------

create or replace function public.set_my_tax_id(cpf text)
returns void language plpgsql security definer set search_path = ''
as $$
declare d text := regexp_replace(coalesce(cpf, ''), '[^0-9]', '', 'g');
begin
  if auth.uid() is null or not public.cpf_ok(d) then
    raise exception 'CPF inválido.' using errcode = '22023';
  end if;
  insert into public.billing_info (user_id, tax_id) values (auth.uid(), d)
  on conflict (user_id) do update set tax_id = excluded.tax_id, updated_at = now();
end;
$$;

create or replace function public.my_tax_id()
returns text language sql stable security definer set search_path = ''
as $$
  select tax_id from public.billing_info where user_id = auth.uid();
$$;

-- Modo manual: grava o pedido no histórico e devolve o código HAB... que vai no Pix estático.
-- O Pix estático cai na conta real do dono: env é sempre production (pagbank_env vale só para o automático).
create or replace function public.start_manual_payment(plan text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  pl public.plans;
  code text;
begin
  if me is null then
    raise exception 'Entre na sua conta.' using errcode = '42501';
  end if;
  -- Evita encher o histórico do Admin com toques repetidos.
  if (select count(*) from public.payments where user_id = me and method = 'manual' and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Muitas tentativas. Tente de novo mais tarde.' using errcode = '42501';
  end if;
  select * into pl from public.plans where id = plan and active;
  if not found then
    raise exception 'Plano indisponível.' using errcode = '22023';
  end if;
  for attempt in 1..5 loop
    code := public.new_order_code();
    begin
      insert into public.payments (user_id, plan_id, amount_cents, days, method, status, env, order_code)
      values (
        me, pl.id, pl.price_cents, pl.days, 'manual', 'pending', 'production', code
      );
      return code;
    exception when unique_violation then
      null; -- código repetido: sorteia outro
    end;
  end loop;
  raise exception 'Não deu para gerar o código do pedido.';
end;
$$;

-- Status do próprio pagamento; um automático pending vencido vira expired antes de responder.
create or replace function public.my_payment_status(pid uuid)
returns text language plpgsql security definer set search_path = ''
as $$
begin
  update public.payments pay set status = 'expired'
  where pay.id = pid and pay.user_id = auth.uid() and public.payment_overdue(pay);
  return (select status from public.payments where id = pid and user_id = auth.uid());
end;
$$;

-- Funções do Admin (todas recusam quem não é administrador) --------------------------------

create or replace function public.admin_set_config(k text, v text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  if not ((k = 'payment_mode' and v in ('manual', 'automatic')) or (k = 'pagbank_env' and v in ('sandbox', 'production'))) then
    raise exception 'Configuração inválida.' using errcode = '22023';
  end if;
  insert into public.app_config (key, value) values (k, v) on conflict (key) do update set value = excluded.value;
end;
$$;

create or replace function public.admin_confirm_payment(pid uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  return public.grant_payment(pid);
end;
$$;

create or replace function public.admin_cancel_payment(pid uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  update public.payments set status = 'canceled' where id = pid and status = 'pending';
end;
$$;

-- Histórico de um ambiente (sandbox ou production), do mais novo ao mais antigo; "before" pagina pelo
-- created_at da última linha recebida. Nunca devolve o CPF.
drop function if exists public.admin_payments(text, timestamptz, int);
create or replace function public.admin_payments(st text, before timestamptz, max int, environment text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  if st is null or st not in ('all', 'paid', 'pending', 'closed') then
    raise exception 'Filtro inválido.' using errcode = '22023';
  end if;
  if environment is null or environment not in ('sandbox', 'production') then
    raise exception 'Ambiente inválido.' using errcode = '22023';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', x.id, 'user_id', x.user_id, 'name', pr.name, 'username', pr.username, 'email', pr.email,
      'avatar_url', pr.avatar_url, 'plan_name', coalesce(pl.name, x.plan_id), 'amount_cents', x.amount_cents,
      'days', x.days, 'method', x.method, 'status', x.status, 'env', x.env, 'order_code', x.order_code,
      'pagbank_order_id', x.pagbank_order_id, 'created_at', x.created_at, 'paid_at', x.paid_at,
      'granted_until', x.granted_until
    ) order by x.created_at desc)
    from (
      select * from public.payments pay
      where pay.env = environment
        and (admin_payments.before is null or pay.created_at < admin_payments.before)
        and (st = 'all' or pay.status = st or (st = 'closed' and pay.status in ('expired', 'failed', 'canceled')))
      order by pay.created_at desc
      limit least(greatest(coalesce(admin_payments.max, 50), 1), 100)
    ) x
    left join public.profiles pr on pr.id = x.user_id
    left join public.plans pl on pl.id = x.plan_id
  ), '[]'::jsonb);
end;
$$;

-- Faturamento: só pagos do ambiente pedido, por dia (30 dias, "AAAA-MM-DD") ou por mês (12 meses, "AAAA-MM"), no fuso de São Paulo.
drop function if exists public.admin_revenue(text);
create or replace function public.admin_revenue(period text, environment text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  local_now timestamp := now() at time zone 'America/Sao_Paulo';
  since timestamptz;
  fmt text;
begin
  perform public.require_admin();
  if period = 'days' then
    since := (date_trunc('day', local_now) - interval '29 days') at time zone 'America/Sao_Paulo';
    fmt := 'YYYY-MM-DD';
  elsif period = 'months' then
    since := (date_trunc('month', local_now) - interval '11 months') at time zone 'America/Sao_Paulo';
    fmt := 'YYYY-MM';
  else
    raise exception 'Período inválido.' using errcode = '22023';
  end if;
  if environment is null or environment not in ('sandbox', 'production') then
    raise exception 'Ambiente inválido.' using errcode = '22023';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('bucket', bucket, 'cents', cents, 'count', n) order by bucket)
    from (
      select to_char(paid_at at time zone 'America/Sao_Paulo', fmt) as bucket, sum(amount_cents)::int as cents, count(*)::int as n
      from public.payments
      where status = 'paid' and env = environment and paid_at >= since
      group by 1
    ) t
  ), '[]'::jsonb);
end;
$$;

-- Permissões ---------------------------------------------------------------------------
-- O Supabase dá execute em funções novas para anon, authenticated e service_role: cada grupo ajusta o seu.

do $$
declare f text;
begin
  foreach f in array array['cpf_ok(text)', 'new_order_code()', 'payment_overdue(public.payments)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated, service_role', f);
  end loop;
  -- grant_payment fica só no servidor: o app libera dias apenas por admin_confirm_payment.
  foreach f in array array[
    'grant_payment(uuid)', 'create_auto_payment(uuid, text, text)', 'attach_pagbank_order(uuid, text, text, timestamptz)',
    'fail_payment(uuid)', 'payment_for_webhook(uuid)', 'payment_id_for_order(text)', 'open_auto_payment(uuid, text)',
    'recent_auto_payments(uuid)', 'tax_id_of(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
  foreach f in array array[
    'set_my_tax_id(text)', 'my_tax_id()', 'start_manual_payment(text)', 'my_payment_status(uuid)',
    'admin_set_config(text, text)', 'admin_confirm_payment(uuid)', 'admin_cancel_payment(uuid)',
    'admin_payments(text, timestamptz, int, text)', 'admin_revenue(text, text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
