-- Casos de redeem_invite (admin.sql). Rode DEPOIS de admin.sql, no SQL Editor do Supabase. Esperado: notice 'invites ok'.
-- Usa o primeiro usuário com perfil e não deixa linhas: tudo roda num sub-bloco que termina em exceção proposital.
do $$
declare
  uid uuid;
  until timestamptz;
  result jsonb;
begin
  select u.id into uid from auth.users u join public.profiles p on p.id = u.id limit 1;
  if uid is null then
    raise notice 'invites: sem usuário com perfil, casos pulados';
    return;
  end if;
  begin
    -- auth.uid() passa a ser esse usuário, como se a chamada viesse do app.
    perform set_config('request.jwt.claims', jsonb_build_object('sub', uid, 'role', 'authenticated')::text, true);
    update public.profiles set plan = 'trial', unlimited = false, access_until = now() + interval '5 days' where id = uid;
    insert into public.invites (code, days, expires_at) values
      ('TESTEAAAA1', 30, now() + interval '7 days'),
      ('TESTEAAAA2', 30, now() - interval '1 second'),
      ('TESTEAAAA3', null, now() + interval '7 days');

    -- validade que corre: soma; aceita minúsculas e traço; marca quem usou
    result := public.redeem_invite('teste-aaaa1');
    if result <> '{"days": 30}'::jsonb then raise exception 'redeem_invite devolveu %', result; end if;
    select access_until into until from public.profiles where id = uid;
    if until <> now() + interval '5 days' + 30 * interval '24 hours' then raise exception 'resgate deveria somar à validade (%)', until; end if;
    if (select plan from public.profiles where id = uid) <> 'paid' then raise exception 'plan deveria ser paid'; end if;
    if (select used_by from public.invites where code = 'TESTEAAAA1') is distinct from uid then raise exception 'used_by não marcado'; end if;

    -- usado ou vencido não vale
    begin
      perform public.redeem_invite('TESTEAAAA1');
      raise exception 'resgatou código já usado';
    exception when others then
      if sqlerrm <> 'Código inválido, já usado ou vencido.' then raise; end if;
    end;
    begin
      perform public.redeem_invite('TESTEAAAA2');
      raise exception 'resgatou código vencido';
    exception when others then
      if sqlerrm <> 'Código inválido, já usado ou vencido.' then raise; end if;
    end;
    if (select access_until from public.profiles where id = uid) <> until then raise exception 'resgate recusado mudou a validade'; end if;

    -- ilimitado liga unlimited, mesmo com a validade vencida
    update public.profiles set access_until = now() - interval '3 days' where id = uid;
    perform public.redeem_invite('TESTEAAAA3');
    if not (select unlimited from public.profiles where id = uid) then raise exception 'convite ilimitado deveria ligar unlimited'; end if;

    -- anon não resgata
    if has_function_privilege('anon', 'public.redeem_invite(text)', 'execute') then raise exception 'anon não deveria executar redeem_invite'; end if;

    raise exception 'rollback-sentinel';
  exception when others then
    if sqlerrm <> 'rollback-sentinel' then raise; end if;
  end;
  raise notice 'invites ok';
end $$;
