-- Habitus: planos, perfis e administração.
-- Rode DEPOIS de schema.sql: cole tudo no SQL Editor do Supabase e clique em Run.
-- Pode rodar de novo sem problema.

-- Perfis --------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  plan text not null default 'trial' check (plan in ('trial', 'paid')),
  access_until timestamptz,
  unlimited boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- App liberado: com free_access ligado, toda conta tem acesso, vencida ou não (os planos continuam guardados
-- para quando a cobrança voltar). Uma linha só; rodar de novo não muda o valor escolhido no painel.
create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  free_access boolean not null default true
);
insert into public.app_settings (id) values (true) on conflict (id) do nothing;
alter table public.app_settings enable row level security;
-- Sem políticas: só as funções abaixo leem e mudam.

create or replace function public.app_is_free()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select free_access from public.app_settings), false);
$$;

-- Coluna calculada: o app lê com select("*, free_access") junto do próprio perfil.
create or replace function public.free_access(p public.profiles)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.app_is_free();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.has_access()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (role = 'admin' or unlimited or access_until > now() or public.app_is_free())
  );
$$;

drop policy if exists "read own profile or admin" on public.profiles;
create policy "read own profile or admin" on public.profiles
  for select to authenticated using ((select auth.uid()) = id or (select public.is_admin()));
-- Sem políticas de insert/update/delete: só as funções abaixo mudam perfis.

-- Convites ------------------------------------------------------------------
-- Código que o admin gera para até max_uses contas; cada conta resgata uma vez e ganha a licença.

create table if not exists public.invites (
  code text primary key,
  days int check (days is null or days > 0), -- null = ilimitado
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.invites add column if not exists max_uses int not null default 1 check (max_uses > 0);

-- Um registro por conta que resgatou; user_id fica null se a conta for excluída (a vaga continua gasta).
create table if not exists public.invite_redemptions (
  code text not null references public.invites (code) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  used_at timestamptz not null default now(),
  unique (code, user_id)
);

-- Antes os convites eram de uso único, com quem usou na própria linha: isso passa para invite_redemptions.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'invites' and column_name = 'used_at') then
    insert into public.invite_redemptions (code, user_id, used_at)
    select code, used_by, used_at from public.invites where used_at is not null;
    alter table public.invites drop column used_by, drop column used_at;
  end if;
end;
$$;

alter table public.invites enable row level security;
alter table public.invite_redemptions enable row level security;

drop policy if exists "admin reads invites" on public.invites;
create policy "admin reads invites" on public.invites for select to authenticated using ((select public.is_admin()));
drop policy if exists "admin reads invite redemptions" on public.invite_redemptions;
create policy "admin reads invite redemptions" on public.invite_redemptions for select to authenticated using ((select public.is_admin()));

-- Gasta uma vaga do convite para a conta: {"days": n | null}, ou null se o código não existe, venceu, lotou ou
-- essa conta já o resgatou. O "for update" faz resgates simultâneos esperarem a vez, sem passar do limite.
-- Recebe a conta como parâmetro, então só as funções abaixo chamam; o app não executa.
create or replace function public.claim_invite(invite_code text, uid uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  c text := upper(regexp_replace(coalesce(invite_code, ''), '[^A-Za-z0-9]', '', 'g'));
  invite_days int;
  invite_max int;
begin
  select days, max_uses into invite_days, invite_max from public.invites where code = c and expires_at > now() for update;
  if not found
    or exists (select 1 from public.invite_redemptions where code = c and user_id = uid)
    or (select count(*) from public.invite_redemptions where code = c) >= invite_max then
    return null;
  end if;
  insert into public.invite_redemptions (code, user_id) values (c, uid);
  return jsonb_build_object('days', invite_days);
end;
$$;

revoke execute on function public.claim_invite(text, uuid) from public, anon, authenticated;

-- Conta nova: perfil com 7 dias de teste grátis, ou com a licença do convite válido que veio no cadastro.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  claimed jsonb := public.claim_invite(new.raw_user_meta_data ->> 'invite', new.id);
  invite_days int := (claimed ->> 'days')::int;
  invited boolean := claimed is not null;
begin
  insert into public.profiles (id, name, email, plan, unlimited, access_until)
  values (
    new.id,
    left(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), 80),
    new.email,
    case when invited then 'paid' else 'trial' end,
    invited and invite_days is null,
    case
      when not invited then now() + interval '7 days'
      when invite_days is null then null
      else now() + make_interval(days => invite_days)
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Contas criadas antes desta migração ganham 7 dias a partir de agora.
insert into public.profiles (id, name, email, access_until)
select id, left(trim(coalesce(raw_user_meta_data ->> 'name', '')), 80), email, now() + interval '7 days'
from auth.users
on conflict (id) do nothing;

-- Planos --------------------------------------------------------------------

create table if not exists public.plans (
  id text primary key,
  name text not null,
  days int not null check (days > 0),
  price_cents int not null check (price_cents >= 0),
  highlight boolean not null default false,
  active boolean not null default true,
  sort int not null default 0
);

alter table public.plans enable row level security;

drop policy if exists "read plans" on public.plans;
create policy "read plans" on public.plans for select to authenticated using (true);

insert into public.plans (id, name, days, price_cents, highlight, sort) values
  ('monthly', 'Mensal', 30, 990, false, 1),
  ('quarterly', 'Trimestral', 90, 2490, false, 2),
  ('yearly', 'Anual', 365, 7990, true, 3)
on conflict (id) do nothing;

-- Sincronização só com acesso ativo -------------------------------------------

drop policy if exists "insert own data" on public.user_data;
create policy "insert own data" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id and (select public.has_access()));

drop policy if exists "update own data" on public.user_data;
create policy "update own data" on public.user_data
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and (select public.has_access()));

-- Funções do painel (todas recusam quem não é administrador) -------------------

create or replace function public.require_admin()
returns void language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_set_access(uid uuid, until timestamptz, is_unlimited boolean, new_plan text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  update public.profiles set access_until = until, unlimited = is_unlimited, plan = new_plan where id = uid;
end;
$$;

create or replace function public.admin_set_free_access(on_free boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  update public.app_settings set free_access = on_free where id;
end;
$$;

create or replace function public.admin_set_role(uid uuid, new_role text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  if uid = auth.uid() then
    raise exception 'Você não pode mudar o seu próprio cargo.' using errcode = '42501';
  end if;
  update public.profiles set role = new_role where id = uid;
end;
$$;

create or replace function public.admin_update_name(uid uuid, new_name text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  update public.profiles set name = left(trim(new_name), 80) where id = uid;
end;
$$;

create or replace function public.admin_delete_user(uid uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  if uid = auth.uid() then
    raise exception 'Você não pode excluir a sua própria conta pelo painel.' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;

create or replace function public.admin_save_plan(
  plan_id text, plan_name text, plan_days int, plan_price_cents int, plan_highlight boolean, plan_active boolean
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  update public.plans
  set name = plan_name, days = plan_days, price_cents = plan_price_cents, highlight = plan_highlight, active = plan_active
  where id = plan_id;
end;
$$;

-- Convite novo, válido por 7 dias para até invite_uses contas; invite_days null = ilimitado.
drop function if exists public.admin_create_invite(int);
create or replace function public.admin_create_invite(invite_days int, invite_uses int)
returns text language plpgsql security definer set search_path = ''
as $$
declare new_code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
begin
  perform public.require_admin();
  insert into public.invites (code, days, max_uses, expires_at) values (new_code, invite_days, invite_uses, now() + interval '7 days');
  return new_code;
end;
$$;

-- Excluir um convite o invalida na hora; a licença de quem já se cadastrou com ele continua.
create or replace function public.admin_delete_invite(invite_code text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  delete from public.invites where code = invite_code;
end;
$$;

-- A tela de cadastro confere o convite antes de criar a conta: {"days": n | null}, ou null se não vale.
create or replace function public.check_invite(invite_code text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('days', i.days) from public.invites i
  where i.code = upper(regexp_replace(invite_code, '[^A-Za-z0-9]', '', 'g')) and i.expires_at > now()
    and (select count(*) from public.invite_redemptions r where r.code = i.code) < i.max_uses;
$$;

-- Resgate do código já com a conta criada (tela de planos ou Ajustes > Conta): gasta uma vaga do convite em nome de
-- quem resgatou e soma os dias à validade, como um pagamento (de agora se ela já venceu); null = ilimitado.
-- Devolve {"days": n | null}.
create or replace function public.redeem_invite(invite_code text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  claimed jsonb;
  invite_days int;
begin
  if uid is null then
    raise exception 'Entre na sua conta para resgatar o código.' using errcode = '42501';
  end if;
  claimed := public.claim_invite(invite_code, uid);
  if claimed is null then
    if exists (
      select 1 from public.invite_redemptions
      where code = upper(regexp_replace(coalesce(invite_code, ''), '[^A-Za-z0-9]', '', 'g')) and user_id = uid
    ) then
      raise exception 'Você já resgatou este código.' using errcode = '22023';
    end if;
    raise exception 'Código inválido, já usado ou vencido.' using errcode = '22023';
  end if;
  invite_days := (claimed ->> 'days')::int;
  update public.profiles
  set plan = 'paid',
      unlimited = unlimited or invite_days is null,
      access_until = case
        when invite_days is null then access_until
        else greatest(coalesce(access_until, now()), now()) + invite_days * interval '24 hours'
      end
  where id = uid;
  return jsonb_build_object('days', invite_days);
end;
$$;

-- Qualquer conta pode mudar o próprio nome (Ajustes > Conta).
create or replace function public.update_my_name(new_name text)
returns void language sql security definer set search_path = ''
as $$
  update public.profiles set name = left(trim(new_name), 80) where id = auth.uid();
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'is_admin()', 'has_access()', 'require_admin()', 'app_is_free()', 'free_access(public.profiles)', 'admin_set_free_access(boolean)',
    'admin_set_access(uuid, timestamptz, boolean, text)', 'admin_set_role(uuid, text)',
    'admin_update_name(uuid, text)', 'admin_delete_user(uuid)',
    'admin_save_plan(text, text, int, int, boolean, boolean)', 'update_my_name(text)', 'admin_create_invite(int, int)', 'admin_delete_invite(text)',
    'redeem_invite(text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- Quem ainda não tem conta confere o convite na tela de cadastro.
revoke execute on function public.check_invite(text) from public;
grant execute on function public.check_invite(text) to anon, authenticated;

-- Para virar administrador, troque o e-mail e rode só esta linha:
-- update public.profiles set role = 'admin', unlimited = true where email = 'SEU_EMAIL@gmail.com';
