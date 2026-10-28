-- Casos de payments.sql. Rode DEPOIS de payments.sql, no SQL Editor do Supabase. Esperado: notice 'payments ok'.
-- Usa o primeiro usuário de auth.users (vira admin só durante o teste) e não deixa linhas:
-- tudo roda num sub-bloco que termina em exceção proposital, que desfaz as gravações. Falha de assert continua visível.
do $$
declare
  uid uuid;
  pid uuid;
  valid_until timestamptz;
  base int;
  total int;
  sandbox_base int;
  ok boolean;
  st text;
  code text;
  item jsonb;
begin
  select u.id into uid from auth.users u join public.profiles p on p.id = u.id limit 1;
  if uid is null then
    raise notice 'payments: sem usuário com perfil, casos pulados';
    return;
  end if;
  begin
    -- auth.uid() passa a ser esse usuário, como se a chamada viesse do app.
    perform set_config('request.jwt.claims', jsonb_build_object('sub', uid, 'role', 'authenticated')::text, true);
    update public.profiles set role = 'admin', unlimited = false, access_until = now() - interval '1 day' where id = uid;
    update public.app_config set value = 'sandbox' where key = 'pagbank_env';
    select coalesce(sum((e ->> 'cents')::int), 0) into base from jsonb_array_elements(public.admin_revenue('days', 'production')) e;
    select coalesce(sum((e ->> 'cents')::int), 0) into sandbox_base from jsonb_array_elements(public.admin_revenue('days', 'sandbox')) e;

    -- validade vencida: conta a partir de agora; o segundo aviso não soma de novo
    insert into public.payments (user_id, plan_id, amount_cents, days, method, env)
    values (uid, 'monthly', 990, 30, 'manual', 'sandbox') returning id into pid;
    ok := public.grant_payment(pid);
    if not ok then raise exception 'grant_payment deveria liberar na primeira vez'; end if;
    select access_until into valid_until from public.profiles where id = uid;
    if valid_until <> now() + 30 * interval '24 hours' then raise exception 'validade vencida deveria contar de agora (%)', valid_until; end if;
    ok := public.grant_payment(pid);
    if ok then raise exception 'grant_payment liberou duas vezes'; end if;
    if (select access_until from public.profiles where id = uid) <> valid_until then raise exception 'segundo grant somou dias'; end if;
    if (select granted_until from public.payments where id = pid) <> valid_until then raise exception 'granted_until errado'; end if;
    if (select plan from public.profiles where id = uid) <> 'paid' then raise exception 'plan deveria ser paid'; end if;

    -- validade que ainda corre: conta a partir dela
    update public.profiles set access_until = now() + interval '10 days' where id = uid;
    insert into public.payments (user_id, plan_id, amount_cents, days, method, env)
    values (uid, 'monthly', 990, 30, 'manual', 'sandbox') returning id into pid;
    perform public.admin_confirm_payment(pid);
    select access_until into valid_until from public.profiles where id = uid;
    if valid_until <> now() + interval '10 days' + 30 * interval '24 hours' then raise exception 'validade que corre deveria somar (%)', valid_until; end if;

    -- CPF
    begin
      perform public.set_my_tax_id('529.982.247-24');
      raise exception 'set_my_tax_id aceitou CPF inválido';
    exception when others then
      if sqlerrm <> 'CPF inválido.' or sqlstate <> '22023' then raise; end if;
    end;
    perform public.set_my_tax_id('529.982.247-25');
    if public.my_tax_id() is distinct from '52998224725' then raise exception 'my_tax_id esperava só os dígitos'; end if;

    -- faturamento separa os ambientes
    insert into public.payments (user_id, plan_id, amount_cents, days, method, env, status, paid_at)
    values (uid, 'monthly', 111, 30, 'manual', 'sandbox', 'paid', now()),
           (uid, 'monthly', 222, 30, 'manual', 'production', 'paid', now());
    select coalesce(sum((e ->> 'cents')::int), 0) into total from jsonb_array_elements(public.admin_revenue('days', 'production')) e;
    if total - base <> 222 then raise exception 'admin_revenue days esperava +222, obteve +%', total - base; end if;
    select coalesce(sum((e ->> 'cents')::int), 0) into total from jsonb_array_elements(public.admin_revenue('days', 'sandbox')) e;
    if total - sandbox_base <> 111 + 990 + 990 then raise exception 'admin_revenue sandbox esperava +2091, obteve +%', total - sandbox_base; end if;
    select coalesce(sum((e ->> 'cents')::int), 0) into total from jsonb_array_elements(public.admin_revenue('months', 'production')) e;
    if total < 222 then raise exception 'admin_revenue months não contou o pagamento de hoje'; end if;

    -- automático pendente expira depois de 30 min; um recente continua pendente
    insert into public.payments (user_id, plan_id, amount_cents, days, method, env, created_at)
    values (uid, 'monthly', 990, 30, 'automatic', 'sandbox', now() - interval '31 minutes') returning id into pid;
    st := public.my_payment_status(pid);
    if st is distinct from 'expired' then raise exception 'my_payment_status esperava expired, obteve %', st; end if;
    insert into public.payments (user_id, plan_id, amount_cents, days, method, env)
    values (uid, 'monthly', 990, 30, 'automatic', 'sandbox') returning id into pid;
    st := public.my_payment_status(pid);
    if st is distinct from 'pending' then raise exception 'pagamento recente esperava pending, obteve %', st; end if;
    -- com QR gravado, vale o expires_at; reaproveita só QR com mais de 2 min de prazo
    perform public.attach_pagbank_order(pid, 'ORDE_TESTE_' || pid, 'qr-teste', now() + interval '30 minutes');
    item := public.open_auto_payment(uid, 'monthly');
    if item ->> 'id' is distinct from pid::text or item ->> 'qr_text' is distinct from 'qr-teste' or item ? 'pagbank_order_id' then
      raise exception 'open_auto_payment devolveu %', item;
    end if;
    update public.payments set expires_at = now() + interval '1 minute' where id = pid;
    if public.open_auto_payment(uid, 'monthly') is not null then raise exception 'open_auto_payment reaproveitou QR quase vencido'; end if;
    update public.payments set expires_at = now() - interval '1 second' where id = pid;
    st := public.my_payment_status(pid);
    if st is distinct from 'expired' then raise exception 'expires_at vencido esperava expired, obteve %', st; end if;

    -- pedido manual: código HAB sem 0/O/1/I e sempre production; o histórico do admin não leva o CPF nem o QR
    code := public.start_manual_payment('monthly');
    if code !~ '^HAB[A-HJ-NP-Z2-9]{6}$' then raise exception 'código do pedido fora do formato: %', code; end if;
    select e into item from jsonb_array_elements(public.admin_payments('pending', null, 100, 'production')) e where e ->> 'order_code' = code;
    if item is null or item ->> 'plan_name' is null or item ->> 'env' <> 'production' or item ? 'tax_id' or item ? 'qr_text' then
      raise exception 'admin_payments devolveu %', item;
    end if;
    if exists (select 1 from jsonb_array_elements(public.admin_payments('all', null, 100, 'sandbox')) e where e ->> 'env' <> 'sandbox') then
      raise exception 'admin_payments sandbox devolveu linha de produção';
    end if;

    -- Só service_role executa estas funções: nem anon nem authenticated.
    if exists (
      select 1 from unnest(array['anon', 'authenticated']) r, unnest(array[
        'public.grant_payment(uuid)',
        'public.tax_id_of(uuid)',
        'public.create_auto_payment(uuid, text, text)',
        'public.attach_pagbank_order(uuid, text, text, timestamptz)'
      ]) f
      where has_function_privilege(r, f, 'execute')
    ) then raise exception 'anon/authenticated não deveriam executar funções internas de pagamento'; end if;

    raise exception 'rollback-sentinel';
  exception when others then
    if sqlerrm <> 'rollback-sentinel' then raise; end if;
  end;
  raise notice 'payments ok';
end $$;
