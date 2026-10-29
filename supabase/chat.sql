-- Habitus: conversas 1:1 entre amigos (texto, figurinha e "chamar atenção").
-- Rode DEPOIS de social.sql (push.sql é opcional): cole tudo no SQL Editor do Supabase e clique em Run.
-- Pode rodar de novo sem problema.
-- Ninguém grava direto: tudo entra pelas funções abaixo. A leitura direta de messages passa pelo RLS.

-- Tabelas -----------------------------------------------------------------------

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references auth.users (id) on delete cascade,
  recipient uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('text', 'sticker', 'nudge')),
  body text not null default '' check (char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  check (sender <> recipient)
);

-- Página da conversa (as 50 últimas do par) e a última mensagem de cada conversa.
create index if not exists messages_pair
  on public.messages (least(sender, recipient), greatest(sender, recipient), created_at desc);
-- Limite de 30 por minuto por remetente.
create index if not exists messages_sender on public.messages (sender, created_at);
-- Mensagens que chegam para uma conta (não lidas e última mensagem de cada conversa).
create index if not exists messages_recipient on public.messages (recipient, created_at desc);

alter table public.messages enable row level security;

-- Até quando cada conta leu a conversa com cada outra: dá o "visto" e as não lidas.
create table if not exists public.chat_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  peer_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, peer_id)
);

alter table public.chat_reads enable row level security;

-- Denúncias. Sem nenhuma política: o admin consulta pelo painel do Supabase.
create table if not exists public.message_reports (
  message_id uuid not null references public.messages (id) on delete cascade,
  reporter uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, reporter)
);

alter table public.message_reports enable row level security;

-- Usadas pelas políticas (rodam como authenticated) -----------------------------
-- Só respondem sobre pares que incluem quem chama, para não revelar bloqueios ou amizades de outros.

create or replace function public.chat_unblocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() in (a, b) and not public.blocked_between(a, b);
$$;

-- Canal privado de "digitando…": tópico chat:<menor uuid>:<maior uuid>, em minúsculas, só para os dois amigos.
create or replace function public.chat_topic_allowed(t text)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare
  id_re constant text := '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  a uuid;
  b uuid;
begin
  if t is null or t !~ ('^chat:' || id_re || ':' || id_re || '$') then
    return false;
  end if;
  a := split_part(t, ':', 2)::uuid;
  b := split_part(t, ':', 3)::uuid;
  return a < b and auth.uid() in (a, b) and public.has_access()
    and public.relation_of(a, b) = 'friends' and not public.blocked_between(a, b);
end;
$$;

drop policy if exists "read own chat" on public.messages;
create policy "read own chat" on public.messages
  for select to authenticated
  using ((select auth.uid()) in (sender, recipient) and (select public.has_access()) and public.chat_unblocked(sender, recipient));
-- Sem políticas de insert/update/delete: só send_message grava.

-- Depois de chat_unblocked: o Postgres resolve a função ao criar a política.
drop policy if exists "read own chat reads" on public.chat_reads;
create policy "read own chat reads" on public.chat_reads
  for select to authenticated
  using ((select auth.uid()) in (user_id, peer_id) and public.chat_unblocked(user_id, peer_id));

-- Funções do app ----------------------------------------------------------------

-- Envia texto (até 2000 caracteres), figurinha (id do pacote do app) ou "chamar atenção". Devolve a linha inserida.
create or replace function public.send_message(to_user uuid, msg_kind text, msg_body text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  b text := coalesce(msg_body, '');
  m public.messages;
begin
  perform public.require_access();
  if to_user is null or to_user = me or public.blocked_between(me, to_user) or public.relation_of(me, to_user) <> 'friends' then
    raise exception 'Vocês precisam ser amigos para conversar.' using errcode = '42501';
  end if;
  if msg_kind is null or msg_kind not in ('text', 'sticker', 'nudge') then
    raise exception 'Tipo de mensagem inválido.' using errcode = '42501';
  end if;
  if msg_kind = 'text' and b ~ '^\s*$' then
    raise exception 'Escreva uma mensagem.' using errcode = '42501';
  end if;
  if msg_kind = 'text' and char_length(b) > 2000 then
    raise exception 'A mensagem pode ter até 2000 caracteres.' using errcode = '42501';
  end if;
  if msg_kind = 'sticker' and b !~ '^[a-z0-9-]{1,32}$' then
    raise exception 'Figurinha inválida.' using errcode = '42501';
  end if;
  if msg_kind = 'nudge' then
    b := '';
  end if;

  -- Envios simultâneos do mesmo remetente fazem fila: o segundo toque rápido já vê o primeiro nos limites abaixo.
  perform pg_advisory_xact_lock(hashtextextended('chat:' || me::text, 0));
  if (select count(*) from public.messages where sender = me and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Você mandou muitas mensagens seguidas. Espere um pouco.' using errcode = '42501';
  end if;
  if msg_kind = 'nudge' and exists (
    select 1 from public.messages
    where sender = me and recipient = to_user and kind = 'nudge' and created_at > now() - interval '30 seconds'
  ) then
    raise exception 'Espere um pouco para chamar a atenção de novo.' using errcode = '42501';
  end if;

  insert into public.messages (sender, recipient, kind, body) values (me, to_user, msg_kind, b) returning * into m;
  perform public.queue_social_push(to_user, 'msg', case msg_kind
      when 'text' then '{nome}: ' || left(regexp_replace(b, '\s+', ' ', 'g'), 80)
      when 'sticker' then '{nome} mandou uma figurinha'
      else '{nome} chamou sua atenção!'
    end, '/conversas/' || me::text);
  return to_jsonb(m);
end;
$$;

-- Marca a conversa com peer como lida agora e tira da fila o aviso dela que ainda não saiu.
create or replace function public.mark_read(peer uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid();
begin
  perform public.require_access();
  -- Só conversa que existe: ninguém grava "visto" para quem nunca conversou.
  if exists (
    select 1 from public.messages
    where least(sender, recipient) = least(me, peer) and greatest(sender, recipient) = greatest(me, peer)
  ) then
    insert into public.chat_reads (user_id, peer_id, read_at) values (me, peer, now())
    on conflict (user_id, peer_id) do update set read_at = excluded.read_at;
  end if;
  -- plpgsql só resolve push_queue ao executar: sem push.sql, não faz nada.
  if to_regclass('public.push_queue') is not null then
    delete from public.push_queue where user_id = me and id = 'social:msg:' || peer::text;
  end if;
end;
$$;

-- Uma entrada por amigo aceito (mesmo sem mensagem) e por ex-amigo com histórico; bloqueados ficam de fora.
-- shortcut: varre todas as mensagens da conta para achar ex-amigos; com muito histórico, guardar os pares numa tabela.
create or replace function public.my_conversations()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare me uuid := auth.uid();
begin
  perform public.require_access();
  return coalesce((
    select jsonb_agg(c.item order by c.last_at desc nulls last, c.name)
    from (
      select jsonb_build_object(
        'peer', jsonb_build_object(
          'id', pr.id, 'name', pr.name, 'username', pr.username, 'level', coalesce(s.level, 1), 'avatar_url', pr.avatar_url
        ),
        'friends', peers.friends,
        'last', case when l.id is null then null else to_jsonb(l) end,
        'unread', (
          select count(*) from public.messages u
          where u.sender = pr.id and u.recipient = me
            and u.created_at > coalesce((select read_at from public.chat_reads where user_id = me and peer_id = pr.id), '-infinity')
        ),
        'peer_read_at', (select read_at from public.chat_reads where user_id = pr.id and peer_id = me)
      ) as item, l.created_at as last_at, pr.name
      from (
        select x.id, bool_or(x.friends) as friends
        from (
          select case when f.requester = me then f.addressee else f.requester end as id, true as friends
          from public.friendships f where f.status = 'accepted' and me in (f.requester, f.addressee)
          union
          select distinct case when m.sender = me then m.recipient else m.sender end, false
          from public.messages m where me in (m.sender, m.recipient)
        ) x
        group by x.id
      ) peers
      join public.profiles pr on pr.id = peers.id
      left join public.public_stats s on s.user_id = pr.id
      left join lateral (
        select * from public.messages m
        where least(m.sender, m.recipient) = least(me, pr.id) and greatest(m.sender, m.recipient) = greatest(me, pr.id)
        order by m.created_at desc, m.id desc
        limit 1
      ) l on true
      where not public.blocked_between(me, pr.id)
    ) c
  ), '[]'::jsonb);
end;
$$;

-- Denuncia uma mensagem recebida. Repetir não muda nada.
create or replace function public.report_message(msg uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid();
begin
  perform public.require_access();
  if not exists (select 1 from public.messages where id = msg and recipient = me) then
    raise exception 'Mensagem não encontrada.' using errcode = '42501';
  end if;
  insert into public.message_reports (message_id, reporter) values (msg, me) on conflict do nothing;
end;
$$;

-- Realtime ----------------------------------------------------------------------
-- O app assina os inserts de messages e as mudanças de chat_reads; o RLS acima filtra o que cada conta recebe.

do $$
declare t text;
begin
  foreach t in array array['messages', 'chat_reads'] loop
    if not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- "digitando…" por Broadcast em canal privado (Realtime Authorization): receber e enviar só no tópico do par.
drop policy if exists "chat pair receives broadcast" on realtime.messages;
create policy "chat pair receives broadcast" on realtime.messages
  for select to authenticated
  using (realtime.messages.extension = 'broadcast' and (select public.chat_topic_allowed((select realtime.topic()))));

drop policy if exists "chat pair sends broadcast" on realtime.messages;
create policy "chat pair sends broadcast" on realtime.messages
  for insert to authenticated
  with check (realtime.messages.extension = 'broadcast' and (select public.chat_topic_allowed((select realtime.topic()))));

-- Permissões -------------------------------------------------------------------
-- O Supabase dá execute em funções novas para anon e authenticated. As duas das políticas também ficam com
-- authenticated: a política roda com o papel de quem lê.

do $$
declare f text;
begin
  foreach f in array array[
    'chat_unblocked(uuid, uuid)', 'chat_topic_allowed(text)',
    'send_message(uuid, text, text)', 'mark_read(uuid)', 'my_conversations()', 'report_message(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
