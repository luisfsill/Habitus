-- Habitus: ranking global da semana (XP calculado no servidor).
-- Rode DEPOIS de social.sql: cole tudo no SQL Editor do Supabase e clique em Run.
-- Pode rodar de novo sem problema.
-- week_xp_of espelha weekXp (src/domain/ranking.ts); os dois rodam os vetores de supabase/tests/ranking.sql.

-- Dicas distintas e válidas (inteiros 0 a 5) de um dia: `day_tricks` é o array JSON do dia.
create or replace function public.tricks_done_of(day_tricks jsonb)
returns int
language sql
immutable
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
create or replace function public.week_xp_of(
  tricks jsonb,
  water jsonb,
  active_days smallint[],
  week_start date,
  lenient_from date
)
returns int
language plpgsql
immutable
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
begin
  tricks := coalesce(tricks, '{}'::jsonb);
  water := coalesce(water, '{}'::jsonb);

  select min(k::date) into first_day
  from jsonb_object_keys(tricks) k
  where k ~ '^\d{4}-\d{2}-\d{2}$' and public.tricks_done_of(tricks -> k) > 0;
  start_day := least(coalesce(first_day, week_start), week_start);

  for n in 0 .. (week_end - start_day) loop
    d := start_day + n;
    cnt := public.tricks_done_of(tricks -> to_char(d, 'YYYY-MM-DD'));
    -- extract(dow): 0 = domingo, igual a Date#getDay()
    is_active := coalesce(cardinality(active_days), 0) = 0 or extract(dow from d)::smallint = any(active_days);
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
      if jsonb_typeof(w) = 'object' and (w ->> 'cups')::numeric >= (w ->> 'goal')::numeric then
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
