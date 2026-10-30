-- Habitus: ranking global da semana (XP calculado no servidor).
-- Rode DEPOIS de social.sql: cole tudo no SQL Editor do Supabase e clique em Run.
-- Pode rodar de novo sem problema.
-- week_xp_of espelha weekXp (src/domain/ranking.ts); os dois rodam os vetores de supabase/tests/ranking.sql.
-- As funções são puras (não leem tabelas) e não devem abortar com dados malformados: rodam para todo usuário.

-- Chave "AAAA-MM-DD" como date; null se não for uma data real (ex.: 2026-02-31).
create or replace function public.day_of(k text)
returns date
language plpgsql
immutable
set search_path = ''
as $$
begin
  if k !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  return k::date;
exception when others then
  return null;
end;
$$;

-- Dicas distintas e válidas (inteiros 0 a 5) de um dia: `day_tricks` é o array JSON do dia.
create or replace function public.tricks_done_of(day_tricks jsonb)
returns int
language sql
immutable
set search_path = ''
as $$
  select case when jsonb_typeof(day_tricks) = 'array' then (
    select count(distinct e)::int
    from jsonb_array_elements(day_tricks) e
    where jsonb_typeof(e) = 'number' and e::text ~ '^[0-5]$'
  ) else 0 end;
$$;

-- XP da semana (domingo a sábado) que começa em `week_start`.
-- Dias a partir de `lenient_from` nunca quebram a sequência (o dia de hoje ainda está em andamento).
-- tricks: {"AAAA-MM-DD": [índices]}; water: {"AAAA-MM-DD": {"cups": n, "goal": n}}; active_days vazio vale como os 7 dias.
-- active_on: {"AAAA-MM-DD": true|false} tem prioridade sobre active_days no dia; ausente ou malformado cai em active_days.
drop function if exists public.week_xp_of(jsonb, jsonb, smallint[], date, date);
create or replace function public.week_xp_of(
  tricks jsonb,
  water jsonb,
  active_days smallint[],
  week_start date,
  lenient_from date,
  active_on jsonb default '{}'::jsonb
)
returns int
language plpgsql
immutable
set search_path = ''
as $$
declare
  week_end date := week_start + 6;
  first_day date;
  start_day date;
  d date;
  n int;
  cnt int;
  is_active boolean;
  in_week boolean;
  streak int := 0;
  xp int := 0;
  all_done boolean := true;
  any_active boolean := false;
  w jsonb;
  a jsonb;
  k text;
begin
  -- Dados malformados valem como vazios: a função não pode abortar a consulta do ranking.
  if jsonb_typeof(tricks) is distinct from 'object' then tricks := '{}'::jsonb; end if;
  if jsonb_typeof(water) is distinct from 'object' then water := '{}'::jsonb; end if;
  if jsonb_typeof(active_on) is distinct from 'object' then active_on := '{}'::jsonb; end if;

  -- Só olha 80 dias para trás (o bônus de sequência para em 10 passos); dias mais antigos não mudam o resultado.
  for k in select jsonb_object_keys(tricks) loop
    d := public.day_of(k);
    if d >= week_start - 80 and d < week_start and public.tricks_done_of(tricks -> k) > 0
       and (first_day is null or d < first_day) then
      first_day := d;
    end if;
  end loop;
  start_day := coalesce(first_day, week_start);

  for n in 0 .. (week_end - start_day) loop
    d := start_day + n;
    cnt := public.tricks_done_of(tricks -> to_char(d, 'YYYY-MM-DD'));
    -- extract(dow): 0 = domingo, igual a Date#getDay()
    a := active_on -> to_char(d, 'YYYY-MM-DD');
    is_active := case when jsonb_typeof(a) = 'boolean' then (a #>> '{}')::boolean
      else coalesce(cardinality(active_days), 0) = 0 or extract(dow from d)::smallint = any(active_days) end;
    in_week := d >= week_start;

    if cnt = 6 then
      if is_active then streak := streak + 1; end if;
      if in_week then xp := xp + 25 + 5 * least(greatest(streak - 1, 0), 10); end if;
    elsif is_active and d < lenient_from then
      streak := 0;
    end if;

    if in_week then
      xp := xp + 10 * cnt;
      w := water -> to_char(d, 'YYYY-MM-DD');
      if jsonb_typeof(w) = 'object' and jsonb_typeof(w -> 'cups') = 'number' and jsonb_typeof(w -> 'goal') = 'number'
         and (w ->> 'cups')::numeric >= (w ->> 'goal')::numeric then
        xp := xp + 15;
      end if;
      if is_active then
        any_active := true;
        if cnt <> 6 then all_done := false; end if;
      end if;
    end if;
  end loop;

  if any_active and all_done then xp := xp + 150; end if;
  return xp;
end;
$$;

revoke execute on function public.day_of(text) from public, anon;
revoke execute on function public.tricks_done_of(jsonb) from public, anon;
revoke execute on function public.week_xp_of(jsonb, jsonb, smallint[], date, date, jsonb) from public, anon;

-- Registro do servidor ------------------------------------------------------------
-- Cópia das dicas e da água com o horário do servidor, preenchida por trigger no user_data.
-- Só as funções e o trigger acessam: RLS ligado e nenhuma política.

create table if not exists public.ranking_tricks (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  trick smallint not null check (trick between 0 and 5),
  recorded_at timestamptz not null default now(),
  primary key (user_id, day, trick)
);
create index if not exists ranking_tricks_day_idx on public.ranking_tricks (day);

-- goal fica congelada no primeiro registro do dia: baixar a meta depois de beber não rende XP.
create table if not exists public.ranking_water (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  cups smallint not null check (cups between 0 and 50),
  goal smallint not null check (goal between 1 and 20),
  recorded_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Dia ativo congelado no primeiro registro do dia: mudar settings.days não reescreve o passado
-- (senão dava para tirar do app um dia perdido e ganhar semana perfeita/sequência). Dia sem registro (sem sync) conta como ativo.
create table if not exists public.ranking_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  active boolean not null,
  recorded_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- reset_at guarda o resetAt do app: um valor maior apaga o registro ("Resetar dados").
create table if not exists public.ranking_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reset_at bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ranking_settings drop column if exists active_days;

alter table public.ranking_tricks enable row level security;
alter table public.ranking_water enable row level security;
alter table public.ranking_days enable row level security;
alter table public.ranking_settings enable row level security;
revoke all on public.ranking_tricks, public.ranking_water, public.ranking_days, public.ranking_settings from anon, authenticated;

-- Regra do trigger, separada para a carga inicial reaproveitar. Nunca pode abortar a gravação do user_data.
-- Só grava dias entre hoje (UTC) - 2 e hoje + 1: cobre todos os fusos e cerca de dois dias offline.
create or replace function public.ranking_ingest(uid uuid, data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'utc')::date;
  settings jsonb;
  comp jsonb;
  wat jsonb;
  goal smallint := 8;
  days smallint[];
  new_reset bigint := 0;
  old_reset bigint;
begin
  begin
    if jsonb_typeof(data) is distinct from 'object' then return; end if;
    settings := case when jsonb_typeof(data -> 'settings') = 'object' then data -> 'settings' else '{}'::jsonb end;
    comp := case when jsonb_typeof(data -> 'completions') = 'object' then data -> 'completions' else '{}'::jsonb end;
    wat := case when jsonb_typeof(data -> 'water') = 'object' then data -> 'water' else '{}'::jsonb end;

    if jsonb_typeof(settings -> 'water') = 'object' and jsonb_typeof(settings -> 'water' -> 'goal') = 'number' then
      goal := least(greatest(round((settings -> 'water' ->> 'goal')::numeric), 1), 20)::smallint;
    end if;

    select coalesce(array_agg(distinct (e #>> '{}')::smallint order by (e #>> '{}')::smallint), '{}')
      into days
      from jsonb_array_elements(case when jsonb_typeof(settings -> 'days') = 'array' then settings -> 'days' else '[]'::jsonb end) e
      where jsonb_typeof(e) = 'number' and (e #>> '{}') ~ '^[0-6]$';
    if cardinality(days) = 0 then days := '{0,1,2,3,4,5,6}'; end if;

    if jsonb_typeof(data -> 'resetAt') = 'number' then
      new_reset := least(greatest(floor((data ->> 'resetAt')::numeric), 0), 9000000000000000000)::bigint;
    end if;
    select reset_at into old_reset from public.ranking_settings where user_id = uid;
    if new_reset > coalesce(old_reset, 0) then
      delete from public.ranking_tricks where user_id = uid;
      delete from public.ranking_water where user_id = uid;
      delete from public.ranking_days where user_id = uid;
    end if;

    insert into public.ranking_settings (user_id, reset_at, updated_at)
    values (uid, new_reset, now())
    on conflict (user_id) do update
      set reset_at = greatest(public.ranking_settings.reset_at, excluded.reset_at), updated_at = now();

    -- Congela se cada dia da janela é ativo (o primeiro registro vence).
    insert into public.ranking_days (user_id, day, active)
    select uid, today + o, extract(dow from today + o)::smallint = any(days)
    from generate_series(-2, 1) o
    on conflict do nothing;

    -- Nunca apaga: as dicas não se desmarcam no app e o mergeData só soma.
    insert into public.ranking_tricks (user_id, day, trick)
    select distinct uid, public.day_of(c.key), (e #>> '{}')::smallint
    from jsonb_each(comp) c,
         jsonb_array_elements(case when jsonb_typeof(c.value) = 'array' then c.value else '[]'::jsonb end) e
    where public.day_of(c.key) between today - 2 and today + 1
      and jsonb_typeof(e) = 'number' and (e #>> '{}') ~ '^[0-5]$'
    on conflict do nothing;

    -- Atualiza cups, mas não goal (congelada).
    insert into public.ranking_water (user_id, day, cups, goal)
    select uid, public.day_of(w.key), least(greatest(floor((w.value ->> 'cups')::numeric), 0), 50)::smallint, goal
    from jsonb_each(wat) w
    where public.day_of(w.key) between today - 2 and today + 1
      and jsonb_typeof(w.value) = 'object' and jsonb_typeof(w.value -> 'cups') = 'number'
    on conflict (user_id, day) do update set cups = excluded.cups, recorded_at = now();
  exception when others then
    raise warning 'ranking_ingest falhou para %: %', uid, sqlerrm;
  end;
end;
$$;

create or replace function public.ranking_ingest_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.ranking_ingest(new.user_id, new.data);
  return null;
end;
$$;

drop trigger if exists ranking_ingest_trg on public.user_data;
create trigger ranking_ingest_trg
  after insert or update on public.user_data
  for each row execute function public.ranking_ingest_row();

-- Carga inicial: mesma regra do trigger sobre o que já existe. Idempotente.
select public.ranking_ingest(user_id, data) from public.user_data;

-- XP da semana de `uid` a partir do registro do servidor.
-- Olha 80 dias antes da semana (mesmo limite de week_xp_of); de hoje (UTC) - 1 em diante o dia não quebra sequência (fusos).
create or replace function public.week_xp(uid uuid, week_start date)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select public.week_xp_of(
    coalesce((
      select jsonb_object_agg(to_char(t.day, 'YYYY-MM-DD'), t.picked)
      from (
        select day, jsonb_agg(trick order by trick) as picked
        from public.ranking_tricks
        where user_id = uid and day between week_start - 80 and week_start + 6
        group by day
      ) t
    ), '{}'::jsonb),
    coalesce((
      select jsonb_object_agg(to_char(w.day, 'YYYY-MM-DD'), jsonb_build_object('cups', w.cups, 'goal', w.goal))
      from public.ranking_water w
      where w.user_id = uid and w.day between week_start and week_start + 6
    ), '{}'::jsonb),
    '{}'::smallint[],
    week_start,
    (now() at time zone 'utc')::date - 1,
    coalesce((
      select jsonb_object_agg(to_char(d.day, 'YYYY-MM-DD'), d.active)
      from public.ranking_days d
      where d.user_id = uid and d.day between week_start - 80 and week_start + 6
    ), '{}'::jsonb)
  );
$$;

-- Ranking global da semana (domingo a sábado de `today`, limitado a hoje UTC ± 1).
-- `me` é a linha de quem pede (null com 0 XP ou para admin, que não entra no ranking), mesmo fora do top 20 ou fora da busca.
-- shortcut: calcula week_xp na hora para todo perfil elegível; com muitos usuários, materializar numa tabela atualizada pelo trigger.
create or replace function public.global_ranking(today date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  utc date := (now() at time zone 'utc')::date;
  viewer uuid := auth.uid();
  ws date;
  my_xp int;
  top_rows jsonb;
  my_row jsonb;
begin
  perform public.require_access();
  today := least(greatest(coalesce(today, utc), utc - 1), utc + 1);
  ws := today - extract(dow from today)::int;
  my_xp := public.week_xp(viewer, ws);

  with cand as materialized (
    select p.id, p.name, p.username, x.week_xp
    from public.profiles p
    cross join lateral (select public.week_xp(p.id, ws) as week_xp) x
    where p.username is not null and p.searchable and p.role <> 'admin'
      and public.user_has_access(p.id)
      and not public.blocked_between(viewer, p.id)
      and x.week_xp > 0
  ),
  ranked as (
    select c.*, rank() over (order by c.week_xp desc) as pos from cand c
  )
  select
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', r.pos, 'id', r.id, 'name', r.name, 'username', r.username,
        'level', coalesce(s.level, 1), 'week_xp', r.week_xp, 'relation', public.relation_of(viewer, r.id),
        'avatar_url', p.avatar_url
      ) order by r.pos, r.name)
      from (select * from ranked order by pos, name limit 20) r
      join public.profiles p on p.id = r.id
      left join public.public_stats s on s.user_id = r.id
    ), '[]'::jsonb),
    case when my_xp > 0 and not exists (select 1 from public.profiles a where a.id = viewer and a.role = 'admin') then (
      select jsonb_build_object(
        'position', 1 + (select count(*) from cand where cand.week_xp > my_xp),
        'id', p.id, 'name', p.name, 'username', p.username,
        'level', coalesce(s.level, 1), 'week_xp', my_xp, 'relation', 'none', 'avatar_url', p.avatar_url
      )
      from public.profiles p left join public.public_stats s on s.user_id = p.id
      where p.id = viewer
    ) end
  into top_rows, my_row;

  return jsonb_build_object('week_start', ws, 'top', top_rows, 'me', my_row);
end;
$$;

-- Só global_ranking é do app; o resto é interno (chamado por outras funções security definer e pelo trigger).
revoke execute on function public.week_xp_of(jsonb, jsonb, smallint[], date, date, jsonb) from authenticated;
revoke execute on function public.ranking_ingest(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.ranking_ingest_row() from public, anon, authenticated;
revoke execute on function public.week_xp(uuid, date) from public, anon, authenticated;
revoke execute on function public.global_ranking(date) from public, anon;
grant execute on function public.global_ranking(date) to authenticated;
