-- Mural e depoimentos. Rode DEPOIS de social.sql (usa relation_of, blocked_between, public_user e queue_social_push).
-- Pode rodar de novo.
-- Cada linha fica no mural de `owner`. author = owner: publicação no próprio mural; author <> owner: depoimento de um amigo.
-- O mural é público como o perfil: quem pode abrir o perfil lê o mural. O feed junta os murais dos amigos e o próprio.
-- Uma publicação tem texto, foto ou os dois. A foto fica no bucket público "wall", em <id do autor>/<nome aleatório>.jpg.

create table if not exists public.wall_posts (
  id bigint generated always as identity primary key,
  owner uuid not null references auth.users (id) on delete cascade,
  author uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- Foto opcional: o texto pode ficar vazio quando há foto. Rodar de novo troca a regra antiga (texto obrigatório).
alter table public.wall_posts add column if not exists image_url text;
-- Quando o autor editou o texto pela última vez (null: nunca).
alter table public.wall_posts add column if not exists edited_at timestamptz;
alter table public.wall_posts drop constraint if exists wall_posts_body_check;
alter table public.wall_posts drop constraint if exists wall_posts_content_check;
alter table public.wall_posts add constraint wall_posts_content_check
  check (char_length(body) <= 1000 and (char_length(body) > 0 or image_url is not null));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wall', 'wall', true, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Como em avatars: cada conta só grava, lista e apaga a própria pasta; o link público é lido por quem recebe o post.
drop policy if exists "wall own folder read" on storage.objects;
create policy "wall own folder read" on storage.objects for select to authenticated
  using (bucket_id = 'wall' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "wall own folder insert" on storage.objects;
create policy "wall own folder insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'wall' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "wall own folder delete" on storage.objects;
create policy "wall own folder delete" on storage.objects for delete to authenticated
  using (bucket_id = 'wall' and (storage.foldername(name))[1] = (select auth.uid())::text);

create index if not exists wall_posts_owner on public.wall_posts (owner, created_at desc);
create index if not exists wall_posts_author on public.wall_posts (author, created_at);

-- Sem nenhuma política: só as funções abaixo leem e escrevem.
alter table public.wall_posts enable row level security;

-- Uma linha como o app recebe: texto, foto, data, dono do mural e autor (PublicUser de cada um).
create or replace function public.wall_post_json(viewer uuid, w public.wall_posts)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', w.id, 'body', w.body, 'image_url', w.image_url, 'created_at', w.created_at, 'edited_at', w.edited_at,
    'owner', public.public_user(viewer, w.owner), 'author', public.public_user(viewer, w.author)
  );
$$;

-- A versão antiga, sem foto, sai antes: com as duas, uma chamada de 2 argumentos ficaria ambígua.
drop function if exists public.post_on_wall(uuid, text);
create or replace function public.post_on_wall(target uuid, post_body text, post_image text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  b text := coalesce(trim(post_body), '');
  inserted public.wall_posts;
begin
  perform public.require_access();
  if not exists (select 1 from public.profiles where id = me and username is not null) then
    raise exception 'Escolha seu @ antes de publicar.' using errcode = '42501';
  end if;
  if char_length(b) > 1000 or (char_length(b) = 0 and post_image is null) then
    raise exception 'Escreva até 1000 caracteres ou escolha uma foto.' using errcode = '42501';
  end if;
  if post_image is not null
    and post_image !~ ('^https://[^/]+/storage/v1/object/public/wall/' || me::text || '/[A-Za-z0-9_-]+\.jpg$') then
    raise exception 'Foto inválida.' using errcode = '22023';
  end if;
  if target is null or (target <> me and (public.relation_of(me, target) <> 'friends' or public.blocked_between(me, target))) then
    raise exception 'Só amigos deixam depoimento.' using errcode = '42501';
  end if;
  if (select count(*) from public.wall_posts where author = me and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Muitas publicações seguidas. Tente de novo mais tarde.' using errcode = '42501';
  end if;
  insert into public.wall_posts (owner, author, body, image_url) values (target, me, b, post_image) returning * into inserted;
  if target <> me then
    perform public.queue_social_push(target, 'wall', '{nome} deixou um depoimento no seu mural.', '/profile');
  end if;
  return public.wall_post_json(me, inserted);
end;
$$;

-- Apaga: quem escreveu ou o dono do mural.
create or replace function public.delete_wall_post(post_id bigint)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  perform public.require_access();
  delete from public.wall_posts where id = post_id and me in (owner, author);
  if not found then
    raise exception 'Publicação não encontrada.' using errcode = '42501';
  end if;
end;
$$;

-- Troca o texto: só quem escreveu (o dono do mural apaga um depoimento, mas não reescreve). A foto não muda.
create or replace function public.edit_wall_post(post_id bigint, post_body text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  b text := coalesce(trim(post_body), '');
  updated public.wall_posts;
begin
  perform public.require_access();
  if char_length(b) > 1000 then
    raise exception 'Escreva até 1000 caracteres.' using errcode = '42501';
  end if;
  update public.wall_posts set body = b, edited_at = now()
  where id = post_id and author = me and (char_length(b) > 0 or image_url is not null)
  returning * into updated;
  if not found then
    raise exception 'Não deu para salvar. Uma publicação sem foto precisa de texto.' using errcode = '42501';
  end if;
  return public.wall_post_json(me, updated);
end;
$$;

-- O mural de uma conta: só os depoimentos recebidos, mais novo primeiro (publicações próprias vão só para o feed).
-- Mesma visibilidade do perfil (get_user_profile falha se não pode ver).
create or replace function public.wall_of(uid uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  perform public.get_user_profile(uid);
  return coalesce((
    select jsonb_agg(public.wall_post_json(me, w) order by w.created_at desc)
    from (
      select * from public.wall_posts w
      where w.owner = uid and w.author <> w.owner and not public.blocked_between(me, w.author)
      order by w.created_at desc limit 50
    ) w
  ), '[]'::jsonb);
end;
$$;

-- O feed: o que entrou no mural dos amigos e no próprio, mais novo primeiro, sem autores bloqueados.
create or replace function public.wall_feed()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  perform public.require_access();
  return coalesce((
    select jsonb_agg(public.wall_post_json(me, w) order by w.created_at desc)
    from (
      select * from public.wall_posts w
      where (w.owner = me or public.relation_of(me, w.owner) = 'friends')
        and not public.blocked_between(me, w.author)
      order by w.created_at desc limit 50
    ) w
  ), '[]'::jsonb);
end;
$$;

do $$
declare
  f text;
begin
  revoke execute on function public.wall_post_json(uuid, public.wall_posts) from public, anon, authenticated;
  foreach f in array array['post_on_wall(uuid, text, text)', 'delete_wall_post(bigint)', 'edit_wall_post(bigint, text)', 'wall_of(uuid)', 'wall_feed()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
