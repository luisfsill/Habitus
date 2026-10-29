-- Habitus: lembretes por Web Push (chegam com o app fechado no iPhone e no Android).
-- Cole tudo no SQL Editor do Supabase e clique em Run. Pode rodar de novo sem problema.
-- Antes, troque SEU_PROJECT_REF (no fim do arquivo) pelo Reference ID do projeto.

-- Aparelhos inscritos para receber push, por conta.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "own subscriptions" on public.push_subscriptions;
create policy "own subscriptions" on public.push_subscriptions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Lembretes já calculados pelo app, à espera da hora. A função push-send apaga cada um ao enviar.
create table if not exists public.push_queue (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  send_at timestamptz not null,
  title text not null,
  body text not null,
  url text not null default '/',
  primary key (user_id, id)
);

create index if not exists push_queue_send_at on public.push_queue (send_at);

alter table public.push_queue enable row level security;

drop policy if exists "own queue" on public.push_queue;
create policy "own queue" on public.push_queue
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- De minuto em minuto, chama a função que envia os lembretes vencidos.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'habitus-push',
  '* * * * *',
  $$ select net.http_post(
       url := 'https://ybsakqsjtylrupbkbwxl.supabase.co/functions/v1/push-send',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);

-- Avisos de mensagem e de amizade não esperam o próximo minuto: chamam push-send na hora.
-- O endereço vem do próprio agendamento acima, para não repetir o SEU_PROJECT_REF. Sem ele, não faz nada.
create or replace function public.kick_push()
returns void language plpgsql security definer set search_path = ''
as $$
declare target text;
begin
  select substring(command from 'https://[^'']+/functions/v1/push-send') into target
  from cron.job where jobname = 'habitus-push';
  if target is null then
    return;
  end if;
  -- pg_net só envia depois do commit, então push-send já encontra o aviso na fila.
  perform net.http_post(url := target, headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);
end;
$$;

revoke execute on function public.kick_push() from public, anon, authenticated;
