-- Habitus: amigos (@usuário, busca, pedidos de amizade e ranking da semana).
-- Rode DEPOIS de admin.sql (push.sql é opcional): cole tudo no SQL Editor do Supabase e clique em Run.
-- Pode rodar de novo sem problema.
-- As funções abaixo são o único caminho para uma conta ler dados de outra. Nenhuma devolve e-mail.

create extension if not exists unaccent with schema extensions;

-- Perfis ganham @ e "Aparecer na busca" --------------------------------------
-- profiles continua sem leitura pública: a política de admin.sql (só o próprio perfil ou admin) não muda.

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists searchable boolean not null default true;
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- Foto do perfil ----------------------------------------------------------------
-- O arquivo fica no bucket público "avatars", em <id da conta>/<nome aleatório>.jpg: o link só é conhecido por quem
-- recebe o perfil pelas funções abaixo. Cada conta só grava, lista e apaga a própria pasta.

alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars own folder read" on storage.objects;
create policy "avatars own folder read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatars own folder insert" on storage.objects;
create policy "avatars own folder insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatars own folder delete" on storage.objects;
create policy "avatars own folder delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Estatísticas públicas -------------------------------------------------------
-- Uma linha por conta, gravada pelo próprio app a cada sincronização.
-- shortcut: o XP vem do aparelho e pode ser inflado pela API; vale só no ranking entre amigos. O ranking global recalcula no servidor (ranking.sql) e ignora week_xp.

create table if not exists public.public_stats (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  xp int not null default 0,
  level int not null default 1,
  streak int not null default 0,
  badges text[] not null default '{}',
  week_start date,
  week_xp int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.public_stats enable row level security;

-- O upsert do app (insert ... on conflict do update) exige poder ler a linha existente: só a própria.
drop policy if exists "read own stats" on public.public_stats;
create policy "read own stats" on public.public_stats
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "insert own stats" on public.public_stats;
create policy "insert own stats" on public.public_stats
  for insert to authenticated with check ((select auth.uid()) = user_id and (select public.has_access()));

drop policy if exists "update own stats" on public.public_stats;
create policy "update own stats" on public.public_stats
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and (select public.has_access()));

-- Amizades, bloqueios e registro de pedidos --------------------------------------
-- Sem insert/update/delete direto: só as funções abaixo mudam estas tabelas.

create table if not exists public.friendships (
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

-- Um só pedido ou amizade por par, em qualquer sentido.
create unique index if not exists friendships_pair_key
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee on public.friendships (addressee);

alter table public.friendships enable row level security;

drop policy if exists "read own friendships" on public.friendships;
create policy "read own friendships" on public.friendships
  for select to authenticated using ((select auth.uid()) in (requester, addressee));

create table if not exists public.blocks (
  blocker uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

alter table public.blocks enable row level security;

drop policy if exists "read own blocks" on public.blocks;
create policy "read own blocks" on public.blocks
  for select to authenticated using ((select auth.uid()) = blocker);

-- Cada pedido enviado: limite diário, espera depois de recusa e um push por par a cada 7 dias.
-- Sem nenhuma política: só as funções leem.
create table if not exists public.friend_request_log (
  id bigint generated always as identity primary key,
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now(),
  declined_at timestamptz,
  pushed_at timestamptz
);

create index if not exists friend_request_log_requester on public.friend_request_log (requester, sent_at);

alter table public.friend_request_log enable row level security;

-- Funções internas (sem grant para o app) -------------------------------------

-- Mesma regra de src/domain/username.ts: devolve o motivo da recusa, ou null se o @ vale.
create or replace function public.username_problem(u text, admin boolean)
returns text language sql immutable security definer set search_path = ''
as $$
  select case
    when u is null or char_length(u) < 3 or char_length(u) > 20 then 'O @ precisa ter de 3 a 20 caracteres.'
    when u !~ '^[a-z0-9._]+$' or u ~ '^\.|\.$|\.\.' then
      'Use só letras minúsculas sem acento, números, ponto e sublinhado, sem ponto no começo, no fim ou repetido.'
    when not admin and (n like '%habitus%' or n in (
      'admin', 'administrador', 'suporte', 'support', 'moderador', 'staff',
      'equipe', 'oficial', 'official', 'root', 'sistema', 'fundador'
    )) then 'Esse @ é reservado. Escolha outro.'
  end
  from (select replace(replace(translate(lower(u), '013457', 'oieast'), '.', ''), '_', '') as n) normalized;
$$;

-- Minúsculas e sem acento. O dicionário vai explícito porque search_path é vazio.
create or replace function public.fold(t text)
returns text language sql stable security definer set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')));
$$;

-- A regra de has_access() aplicada a outra conta.
create or replace function public.user_has_access(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = target and (role = 'admin' or unlimited or access_until > now() or public.app_is_free())
  );
$$;

-- Invisível: escondida, admin vista por quem não é admin, ou conta que não existe.
create or replace function public.invisible_to(target uuid, viewer uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select not t.searchable
      or (t.role = 'admin' and not exists (select 1 from public.profiles v where v.id = viewer and v.role = 'admin'))
    from public.profiles t where t.id = target
  ), true);
$$;

create or replace function public.blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;

-- 'none', 'outgoing' (eu pedi), 'incoming' (pediram para mim) ou 'friends'.
create or replace function public.relation_of(viewer uuid, target uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select case when f.status = 'accepted' then 'friends' when f.requester = viewer then 'outgoing' else 'incoming' end
    from public.friendships f
    where (f.requester = viewer and f.addressee = target) or (f.requester = target and f.addressee = viewer)
  ), 'none');
$$;

-- O que uma conta pode ver de outra (PublicUser). Nunca inclui e-mail, plano ou validade.
create or replace function public.public_user(viewer uuid, target uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'username', p.username, 'level', coalesce(s.level, 1),
    'is_admin', p.role = 'admin', 'relation', public.relation_of(viewer, p.id), 'avatar_url', p.avatar_url
  )
  from public.profiles p left join public.public_stats s on s.user_id = p.id
  where p.id = target;
$$;

create or replace function public.require_access()
returns void language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.has_access() then
    raise exception 'Renove seu plano para usar Amigos.' using errcode = '42501';
  end if;
end;
$$;

-- Aviso de amizade (ou de conversa, por chat.sql) na fila de Web Push. O mesmo id substitui o aviso anterior.
-- plpgsql só resolve push_queue ao executar: sem push.sql (Web Push opcional), não avisa e não falha.
-- A versão antiga, sem url, sai antes: com as duas, uma chamada de 3 argumentos ficaria ambígua.
drop function if exists public.queue_social_push(uuid, text, text);
create or replace function public.queue_social_push(target uuid, kind text, message text, url text default '/profile')
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if to_regclass('public.push_queue') is null then
    return;
  end if;
  insert into public.push_queue (user_id, id, send_at, title, body, url)
  select target, 'social:' || kind || ':' || p.id, now(), 'Habitus',
    replace(message, '{nome}', coalesce(nullif(trim(p.name), ''), '@' || p.username, 'Alguém')), queue_social_push.url
  from public.profiles p where p.id = auth.uid()
  on conflict (user_id, id) do update
    set send_at = excluded.send_at, title = excluded.title, body = excluded.body, url = excluded.url;
  -- Envia agora em vez de esperar o minuto do agendamento (push.sql de antes não tem kick_push).
  if to_regprocedure('public.kick_push()') is not null then
    perform public.kick_push();
  end if;
end;
$$;

-- Funções do app ----------------------------------------------------------------

create or replace function public.set_my_username(new_username text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  u text := lower(trim(new_username));
  problem text := public.username_problem(u, public.is_admin());
begin
  perform public.require_access();
  if problem is not null then
    raise exception '%', problem using errcode = '42501';
  end if;
  update public.profiles set username = u where id = auth.uid();
exception when unique_violation then
  raise exception 'Esse @ já está em uso.' using errcode = '42501';
end;
$$;

create or replace function public.username_available(candidate text)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare u text := lower(trim(candidate));
begin
  perform public.require_access();
  return public.username_problem(u, public.is_admin()) is null
    and not exists (select 1 from public.profiles where lower(username) = u and id <> auth.uid());
end;
$$;

create or replace function public.set_my_searchable(on_search boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_access();
  update public.profiles set searchable = coalesce(on_search, true) where id = auth.uid();
end;
$$;

-- Até 20 contas: @ exato, depois prefixo do @, depois nome contendo o termo.
create or replace function public.search_users(q text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  term text := public.fold(trim(regexp_replace(trim(coalesce(q, '')), '^@', '')));
  pat text;
begin
  perform public.require_access();
  if not coalesce((select searchable from public.profiles where id = me), false) then
    raise exception 'Ative "Aparecer na busca" em Ajustes para buscar pessoas.' using errcode = '42501';
  end if;
  if char_length(term) < 3 then
    return '[]'::jsonb;
  end if;
  -- Curingas viram texto: '%' e '_' digitados não listam ninguém.
  pat := replace(replace(replace(term, '\', '\\'), '%', '\%'), '_', '\_');
  return coalesce((
    select jsonb_agg(public.public_user(me, r.id) order by r.ord, r.username)
    from (
      select p.id, p.username,
        case when p.username = term then 0 when p.username like pat || '%' then 1 else 2 end as ord
      from public.profiles p
      where p.id <> me
        and p.username is not null
        and (p.username like pat || '%' or public.fold(p.name) like '%' || pat || '%')
        and not public.invisible_to(p.id, me)
        and not public.blocked_between(me, p.id)
        and public.user_has_access(p.id)
      order by ord, p.username
      limit 20
    ) r
  ), '[]'::jsonb);
end;
$$;

-- Perfil de outra conta; sequência e conquistas só para amigos.
create or replace function public.get_user_profile(uid uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  rel text := public.relation_of(me, uid);
  result jsonb;
begin
  perform public.require_access();
  if public.blocked_between(me, uid) or (uid <> me and public.invisible_to(uid, me) and rel = 'none')
    or not exists (select 1 from public.profiles where id = uid and username is not null) then
    raise exception 'Perfil não encontrado.' using errcode = '42501';
  end if;
  select public.public_user(me, uid) || jsonb_build_object(
    'streak', case when rel = 'friends' then coalesce(s.streak, 0) end,
    'badges', case when rel = 'friends' then coalesce(to_jsonb(s.badges), '[]'::jsonb) end,
    'can_request', rel = 'none' and uid <> me and not exists (
      select 1 from public.friend_request_log
      where requester = me and addressee = uid and declined_at > now() - interval '30 days'
    )
  )
  into result
  from (select 1) one left join public.public_stats s on s.user_id = uid;
  return result;
end;
$$;

create or replace function public.send_friend_request(uid uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  rel text;
  push boolean;
begin
  perform public.require_access();
  if uid is null or uid = me then
    raise exception 'Você não pode pedir amizade a si mesmo.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = me and username is not null) then
    raise exception 'Escolha seu @ antes de pedir amizade.' using errcode = '42501';
  end if;
  if public.blocked_between(me, uid) or not exists (select 1 from public.profiles where id = uid and username is not null) then
    raise exception 'Perfil não encontrado.' using errcode = '42501';
  end if;
  rel := public.relation_of(me, uid);
  -- Já havia pedido dele para mim: vira amizade, mesmo se ele for invisível para mim.
  if rel = 'incoming' then
    update public.friendships set status = 'accepted' where requester = uid and addressee = me;
    perform public.queue_social_push(uid, 'accepted', '{nome} aceitou seu pedido de amizade');
    return 'accepted';
  end if;
  if rel <> 'none' then
    raise exception 'Vocês já são amigos ou já há um pedido entre vocês.' using errcode = '42501';
  end if;
  if public.invisible_to(uid, me) then
    raise exception 'Perfil não encontrado.' using errcode = '42501';
  end if;
  if (select count(*) from public.friend_request_log where requester = me and sent_at > now() - interval '24 hours') >= 30 then
    raise exception 'Você atingiu o limite de pedidos de hoje.' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.friend_request_log
    where requester = me and addressee = uid and declined_at > now() - interval '30 days'
  ) then
    raise exception 'Tente de novo mais tarde.' using errcode = '42501';
  end if;

  begin
    insert into public.friendships (requester, addressee) values (me, uid);
  exception when unique_violation then
    -- Pedido cruzado ao mesmo tempo: se o dele chegou primeiro, vira amizade.
    if public.relation_of(me, uid) = 'incoming' then
      update public.friendships set status = 'accepted' where requester = uid and addressee = me;
      perform public.queue_social_push(uid, 'accepted', '{nome} aceitou seu pedido de amizade');
      return 'accepted';
    end if;
    raise exception 'Vocês já são amigos ou já há um pedido entre vocês.' using errcode = '42501';
  end;
  push := not exists (
    select 1 from public.friend_request_log
    where requester = me and addressee = uid and pushed_at > now() - interval '7 days'
  );
  insert into public.friend_request_log (requester, addressee, pushed_at)
  values (me, uid, case when push then now() end);
  if push then
    perform public.queue_social_push(uid, 'request', '{nome} quer ser seu amigo no Habitus');
  end if;
  return 'sent';
end;
$$;

create or replace function public.respond_friend_request(uid uuid, accept boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid();
begin
  perform public.require_access();
  if accept then
    update public.friendships set status = 'accepted' where requester = uid and addressee = me and status = 'pending';
    if not found then
      raise exception 'Pedido não encontrado.' using errcode = '42501';
    end if;
    perform public.queue_social_push(uid, 'accepted', '{nome} aceitou seu pedido de amizade');
  else
    -- Recusa em silêncio: quem pediu só vê "Tente de novo mais tarde" por 30 dias.
    delete from public.friendships where requester = uid and addressee = me and status = 'pending';
    if found then
      update public.friend_request_log set declined_at = now()
      where id = (
        select id from public.friend_request_log
        where requester = uid and addressee = me order by sent_at desc, id desc limit 1
      );
    end if;
  end if;
end;
$$;

create or replace function public.cancel_friend_request(uid uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_access();
  delete from public.friendships where requester = auth.uid() and addressee = uid and status = 'pending';
end;
$$;

create or replace function public.remove_friend(uid uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid();
begin
  perform public.require_access();
  delete from public.friendships
  where status = 'accepted' and ((requester = me and addressee = uid) or (requester = uid and addressee = me));
end;
$$;

-- Bloquear apaga a amizade ou o pedido entre os dois. Desbloquear não refaz nada.
create or replace function public.block_user(uid uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid();
begin
  perform public.require_access();
  if uid is null or uid = me then
    raise exception 'Você não pode bloquear a si mesmo.' using errcode = '42501';
  end if;
  insert into public.blocks (blocker, blocked) values (me, uid) on conflict do nothing;
  delete from public.friendships
  where (requester = me and addressee = uid) or (requester = uid and addressee = me);
end;
$$;

create or replace function public.unblock_user(uid uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_access();
  delete from public.blocks where blocker = auth.uid() and blocked = uid;
end;
$$;

-- Troca (ou, com null, tira) a foto do perfil. Aceita um arquivo da própria pasta do bucket "avatars" ou um avatar
-- padrão do app ("preset:<id>", desenhado pelo próprio app).
create or replace function public.set_my_avatar(url text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_access();
  if url is not null and url !~ '^preset:[a-z0-9-]{1,32}$'
    and url !~ ('^https://[^/]+/storage/v1/object/public/avatars/' || auth.uid()::text || '/[A-Za-z0-9_-]+\.jpg$') then
    raise exception 'Foto inválida.' using errcode = '22023';
  end if;
  update public.profiles set avatar_url = url where id = auth.uid();
end;
$$;

-- Amigos (com o XP da semana guardado; o app zera semana antiga) e pedidos pendentes.
create or replace function public.my_friends()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare me uuid := auth.uid();
begin
  perform public.require_access();
  return jsonb_build_object(
    'friends', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'username', p.username, 'level', coalesce(s.level, 1),
        'is_admin', p.role = 'admin', 'active', public.user_has_access(p.id),
        'week_start', s.week_start, 'week_xp', coalesce(s.week_xp, 0), 'avatar_url', p.avatar_url
      ) order by p.name)
      from public.friendships f
      join public.profiles p on p.id = case when f.requester = me then f.addressee else f.requester end
      left join public.public_stats s on s.user_id = p.id
      where f.status = 'accepted' and me in (f.requester, f.addressee)
    ), '[]'::jsonb),
    'incoming', coalesce((
      select jsonb_agg(public.public_user(me, f.requester) order by f.created_at desc)
      from public.friendships f where f.status = 'pending' and f.addressee = me
    ), '[]'::jsonb),
    'outgoing', coalesce((
      select jsonb_agg(public.public_user(me, f.addressee) order by f.created_at desc)
      from public.friendships f where f.status = 'pending' and f.requester = me
    ), '[]'::jsonb)
  );
end;
$$;

-- Permissões -------------------------------------------------------------------
-- O Supabase dá execute em funções novas para anon e authenticated: as internas tiram de todos.

do $$
declare f text;
begin
  foreach f in array array[
    'username_problem(text, boolean)', 'fold(text)', 'user_has_access(uuid)', 'invisible_to(uuid, uuid)',
    'blocked_between(uuid, uuid)', 'relation_of(uuid, uuid)', 'public_user(uuid, uuid)', 'require_access()',
    'queue_social_push(uuid, text, text, text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'set_my_username(text)', 'username_available(text)', 'set_my_searchable(boolean)', 'search_users(text)',
    'get_user_profile(uuid)', 'send_friend_request(uuid)', 'respond_friend_request(uuid, boolean)',
    'cancel_friend_request(uuid)', 'remove_friend(uuid)', 'block_user(uuid)', 'unblock_user(uuid)', 'my_friends()',
    'set_my_avatar(text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
