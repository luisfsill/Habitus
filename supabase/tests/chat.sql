-- Casos de chat.sql (Conversas). Rode DEPOIS de chat.sql, no SQL Editor do Supabase. Esperado: notice 'chat ok'.
-- Cria quatro contas de teste (A, B, C e D) e desfaz tudo no fim (rollback): não deixa linhas no banco.
begin;

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  d uuid := gen_random_uuid();
  u uuid;
  msg jsonb;
  convs jsonb;
  item jsonb;
  n int;
  topic text;
  has_queue boolean := to_regclass('public.push_queue') is not null;
begin
  -- Contas: o trigger de admin.sql cria o perfil; o acesso fica liberado mesmo com "App liberado" desligado.
  foreach u in array array[a, b, c, d] loop
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'chat-test-' || u || '@example.invalid', jsonb_build_object('name', 'Teste ' || left(u::text, 4)), now(), now());
    update public.profiles set unlimited = true, username = 'chat_' || left(replace(u::text, '-', ''), 12) where id = u;
  end loop;
  -- A e B amigos; A e D amigos; C não é amigo de ninguém.
  insert into public.friendships (requester, addressee, status) values (a, b, 'accepted'), (d, a, 'accepted');

  -- Daqui em diante, como o app: papel authenticated, conta trocada pelo sub do JWT.
  set local role authenticated;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- Texto com emoji e quebra de linha: devolve a linha inserida.
  msg := public.send_message(b, 'text', E'oi 😀\nlinha 2');
  if msg->>'body' <> E'oi 😀\nlinha 2' or (msg->>'sender')::uuid <> a or (msg->>'recipient')::uuid <> b
    or msg->>'kind' <> 'text' or msg->>'id' is null or msg->>'created_at' is null then
    raise exception 'send_message devolveu %', msg;
  end if;

  -- RF-4: 2000 caracteres passa (o emoji conta como 1); 2001 falha; só espaços falha; kind desconhecido falha.
  perform public.send_message(b, 'text', repeat('a', 1999) || '😀');
  begin
    perform public.send_message(b, 'text', repeat('a', 2001));
    raise exception 'aceitou 2001 caracteres';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.send_message(b, 'text', E'   \n ');
    raise exception 'aceitou mensagem só com espaços';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.send_message(b, 'foto', 'x');
    raise exception 'aceitou kind foto';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.send_message(b, 'sticker', '../x');
    raise exception 'aceitou id de figurinha inválido';
  exception when insufficient_privilege then null;
  end;

  -- Não amigo não recebe mensagem.
  begin
    perform public.send_message(c, 'text', 'oi');
    raise exception 'A mandou para C sem amizade';
  exception when insufficient_privilege then null;
  end;

  -- O app não insere direto: sem policy de insert.
  begin
    insert into public.messages (sender, recipient, kind, body) values (a, b, 'text', 'direto');
    raise exception 'insert direto em messages passou';
  exception when insufficient_privilege then null;
  end;

  -- RF-5: segundo nudge de A para B em menos de 30 s falha.
  perform public.send_message(b, 'nudge', '');
  begin
    perform public.send_message(b, 'nudge', '');
    raise exception 'segundo nudge passou';
  exception when insufficient_privilege then null;
  end;

  -- Push de A para B ficou na fila de B, com o link da conversa.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', b, 'role', 'authenticated')::text, true);
  if has_queue then
    select count(*) into n from public.push_queue where user_id = b and id = 'social:msg:' || a and url = '/conversas/' || a;
    if n <> 1 then raise exception 'push social:msg:<A> de B esperava 1, obteve %', n; end if;
  end if;

  -- B lê as 3 mensagens de A; C não lê nada.
  select count(*) into n from public.messages where sender = a and recipient = b;
  if n <> 3 then raise exception 'B deveria ler 3 mensagens de A, leu %', n; end if;

  -- RF-5: nudge de B para A no mesmo instante passa (limite é por remetente no par).
  perform public.send_message(a, 'nudge', '');
  -- 30 por minuto: B já mandou 1; mais 29 passam, a 31ª falha.
  for n in 1..29 loop
    perform public.send_message(a, 'text', 'msg ' || n);
  end loop;
  begin
    perform public.send_message(a, 'text', 'a 31ª');
    raise exception '31ª mensagem no minuto passou';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', c, 'role', 'authenticated')::text, true);
  select count(*) into n from public.messages;
  if n <> 0 then raise exception 'C leu % mensagens de outros', n; end if;
  if (select count(*) from jsonb_array_elements(public.my_conversations())) <> 0 then
    raise exception 'C deveria ter 0 conversas';
  end if;
  -- C não denuncia mensagem que não recebeu.
  begin
    perform public.report_message((msg->>'id')::uuid);
    raise exception 'C denunciou mensagem alheia';
  exception when insufficient_privilege then null;
  end;

  -- Canal de "digitando…": só o par, na ordem menor:maior.
  topic := 'chat:' || least(a, b) || ':' || greatest(a, b);
  if public.chat_topic_allowed(topic) then raise exception 'C entrou no canal de A e B'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true);
  if not public.chat_topic_allowed(topic) then raise exception 'A deveria entrar no canal com B'; end if;
  if public.chat_topic_allowed('chat:' || greatest(a, b) || ':' || least(a, b)) then raise exception 'canal fora de ordem passou'; end if;
  if public.chat_topic_allowed('chat:' || least(a, c) || ':' || greatest(a, c)) then raise exception 'canal com não amigo passou'; end if;
  if public.chat_topic_allowed('chat:lixo') or public.chat_topic_allowed(null) then raise exception 'tópico inválido passou'; end if;

  -- my_conversations de A: B (com mensagens) primeiro, depois D (amigo sem mensagem); C não aparece.
  convs := public.my_conversations();
  if jsonb_array_length(convs) <> 2 or (convs->0->'peer'->>'id')::uuid <> b or (convs->1->'peer'->>'id')::uuid <> d then
    raise exception 'my_conversations de A: %', convs;
  end if;
  if (convs->0->>'unread')::int <> 30 or (convs->0->>'friends')::boolean is not true
    or convs->0->'last' is null or convs->0->'last' = 'null'::jsonb or convs->0->>'peer_read_at' is not null then
    raise exception 'conversa A-B antes de mark_read: %', convs->0;
  end if;
  if convs->1->'last' <> 'null'::jsonb or (convs->1->>'unread')::int <> 0 then
    raise exception 'conversa A-D sem mensagem: %', convs->1;
  end if;

  -- B lê a conversa com A: zera não lidas, A vê o "visto" e o push pendente some.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', b, 'role', 'authenticated')::text, true);
  select value into item from jsonb_array_elements(public.my_conversations()) where (value->'peer'->>'id')::uuid = a;
  if (item->>'unread')::int <> 3 then raise exception 'B deveria ter 3 não lidas, tem %', item->>'unread'; end if;
  perform public.mark_read(a);
  select value into item from jsonb_array_elements(public.my_conversations()) where (value->'peer'->>'id')::uuid = a;
  if (item->>'unread')::int <> 0 then raise exception 'depois de mark_read, B tem % não lidas', item->>'unread'; end if;
  if has_queue then
    select count(*) into n from public.push_queue where user_id = b and id = 'social:msg:' || a;
    if n <> 0 then raise exception 'mark_read não tirou o push social:msg:<A> da fila de B'; end if;
  end if;
  perform public.report_message((msg->>'id')::uuid);
  perform public.report_message((msg->>'id')::uuid); -- repetir não falha

  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true);
  select value into item from jsonb_array_elements(public.my_conversations()) where (value->'peer'->>'id')::uuid = b;
  if item->>'peer_read_at' is null then raise exception 'A deveria ver peer_read_at de B'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', c, 'role', 'authenticated')::text, true);
  select count(*) into n from public.chat_reads;
  if n <> 0 then raise exception 'C leu % chat_reads de outros', n; end if;

  -- Desfazer amizade (A e D): histórico segue legível, mas ninguém envia.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform public.send_message(d, 'sticker', 'oi');
  perform public.remove_friend(d);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', d, 'role', 'authenticated')::text, true);
  select count(*) into n from public.messages where sender = a and recipient = d;
  if n <> 1 then raise exception 'D deveria ler o histórico com A depois de desfazer amizade (%)', n; end if;
  select value into item from jsonb_array_elements(public.my_conversations()) where (value->'peer'->>'id')::uuid = a;
  if item is null or (item->>'friends')::boolean or (item->>'unread')::int <> 1 then
    raise exception 'ex-amigo com histórico: %', item;
  end if;
  begin
    perform public.send_message(a, 'text', 'ainda aí?');
    raise exception 'D mandou para ex-amigo';
  exception when insufficient_privilege then null;
  end;

  -- Bloqueio (A bloqueia B): as mensagens do par somem para os dois e a conversa sai da lista.
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform public.block_user(b);
  select count(*) into n from public.messages where b in (sender, recipient);
  if n <> 0 then raise exception 'A ainda lê % mensagens com B depois do bloqueio', n; end if;
  if exists (select 1 from jsonb_array_elements(public.my_conversations()) where (value->'peer'->>'id')::uuid = b) then
    raise exception 'B segue na lista de A depois do bloqueio';
  end if;
  select count(*) into n from public.chat_reads where b in (user_id, peer_id);
  if n <> 0 then raise exception 'A ainda lê % chat_reads com B depois do bloqueio', n; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.messages where a in (sender, recipient);
  if n <> 0 then raise exception 'B ainda lê % mensagens com A depois do bloqueio', n; end if;
  select count(*) into n from public.chat_reads where a in (user_id, peer_id);
  if n <> 0 then raise exception 'B ainda lê % chat_reads com A depois do bloqueio', n; end if;
  if public.chat_topic_allowed(topic) then raise exception 'canal de A e B segue aberto depois do bloqueio'; end if;
  begin
    perform public.send_message(a, 'text', 'oi?');
    raise exception 'B mandou para quem o bloqueou';
  exception when insufficient_privilege then null;
  end;

  -- Permissões: anon não chama nada; as funções do app são de authenticated.
  if has_function_privilege('anon', 'public.send_message(uuid, text, text)', 'execute') then
    raise exception 'anon não deveria executar send_message';
  end if;
  if has_function_privilege('authenticated', 'public.queue_social_push(uuid, text, text, text)', 'execute') then
    raise exception 'authenticated não deveria executar queue_social_push';
  end if;

  raise notice 'chat ok';
end $$;

rollback;
