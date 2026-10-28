-- Vetores compartilhados de week_xp_of (SQL) e weekXp (TS, src/domain/__tests__/ranking.test.ts).
-- Rode DEPOIS de ranking.sql, no SQL Editor do Supabase. Esperado: notice 'ranking ok'.
do $$
declare
  vectors jsonb := (
-- vectors:begin
$json$[
{"name":"vazio","log":{"tricks":{},"water":{},"activeDays":[0,1,2,3,4,5,6]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":0},
{"name":"uma-dica","log":{"tricks":{"2026-10-26":[0]},"water":{},"activeDays":[0,1,2,3,4,5,6]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":10},
{"name":"indice-invalido-e-repetido","log":{"tricks":{"2026-10-26":[0,0,7,-1]},"water":{},"activeDays":[0,1,2,3,4,5,6]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":10},
{"name":"dia-perfeito","log":{"tricks":{"2026-10-26":[0,1,2,3,4,5]},"water":{},"activeDays":[0,1,2,3,4,5,6]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":85},
{"name":"sequencia-de-antes","log":{"tricks":{"2026-10-22":[0,1,2,3,4,5],"2026-10-23":[0,1,2,3,4,5],"2026-10-24":[0,1,2,3,4,5],"2026-10-25":[0,1,2,3,4,5],"2026-10-26":[0,1,2,3,4,5]},"water":{},"activeDays":[0,1,2,3,4,5,6]},"weekStart":"2026-10-25","lenientFrom":"2026-10-26","expected":205},
{"name":"sequencia-quebrada","log":{"tricks":{"2026-10-24":[0,1,2,3,4,5],"2026-10-26":[0,1,2,3,4,5]},"water":{},"activeDays":[0,1,2,3,4,5,6]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":85},
{"name":"hoje-nao-quebra","log":{"tricks":{"2026-10-25":[0,1,2,3,4,5]},"water":{},"activeDays":[0,1,2,3,4,5,6]},"weekStart":"2026-10-25","lenientFrom":"2026-10-26","expected":85},
{"name":"dia-inativo-perfeito","log":{"tricks":{"2026-10-25":[0,1,2,3,4,5]},"water":{},"activeDays":[1,2,3,4,5]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":85},
{"name":"teto-de-sequencia","log":{"tricks":{"2026-10-17":[0,1,2,3,4,5],"2026-10-18":[0,1,2,3,4,5],"2026-10-19":[0,1,2,3,4,5],"2026-10-20":[0,1,2,3,4,5],"2026-10-21":[0,1,2,3,4,5],"2026-10-22":[0,1,2,3,4,5],"2026-10-23":[0,1,2,3,4,5],"2026-10-24":[0,1,2,3,4,5],"2026-10-25":[0,1,2,3,4,5],"2026-10-26":[0,1,2,3,4,5],"2026-10-27":[0,1,2,3,4,5],"2026-10-28":[0,1,2,3,4,5],"2026-10-29":[0,1,2,3,4,5],"2026-10-30":[0,1,2,3,4,5],"2026-10-31":[0,1,2,3,4,5]},"water":{},"activeDays":[0,1,2,3,4,5,6]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":1080},
{"name":"semana-perfeita","log":{"tricks":{"2026-10-25":[0,1,2,3,4,5],"2026-10-26":[0,1,2,3,4,5],"2026-10-27":[0,1,2,3,4,5],"2026-10-28":[0,1,2,3,4,5],"2026-10-29":[0,1,2,3,4,5],"2026-10-30":[0,1,2,3,4,5],"2026-10-31":[0,1,2,3,4,5]},"water":{},"activeDays":[0,1,2,3,4,5,6]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":850},
{"name":"agua","log":{"tricks":{},"water":{"2026-10-26":{"cups":8,"goal":8},"2026-10-27":{"cups":7,"goal":8}},"activeDays":[0,1,2,3,4,5,6]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":15},
{"name":"maximo-honesto","log":{"tricks":{"2026-10-05":[0,1,2,3,4,5],"2026-10-06":[0,1,2,3,4,5],"2026-10-07":[0,1,2,3,4,5],"2026-10-08":[0,1,2,3,4,5],"2026-10-09":[0,1,2,3,4,5],"2026-10-10":[0,1,2,3,4,5],"2026-10-11":[0,1,2,3,4,5],"2026-10-12":[0,1,2,3,4,5],"2026-10-13":[0,1,2,3,4,5],"2026-10-14":[0,1,2,3,4,5],"2026-10-15":[0,1,2,3,4,5],"2026-10-16":[0,1,2,3,4,5],"2026-10-17":[0,1,2,3,4,5],"2026-10-18":[0,1,2,3,4,5],"2026-10-19":[0,1,2,3,4,5],"2026-10-20":[0,1,2,3,4,5],"2026-10-21":[0,1,2,3,4,5],"2026-10-22":[0,1,2,3,4,5],"2026-10-23":[0,1,2,3,4,5],"2026-10-24":[0,1,2,3,4,5],"2026-10-25":[0,1,2,3,4,5],"2026-10-26":[0,1,2,3,4,5],"2026-10-27":[0,1,2,3,4,5],"2026-10-28":[0,1,2,3,4,5],"2026-10-29":[0,1,2,3,4,5],"2026-10-30":[0,1,2,3,4,5],"2026-10-31":[0,1,2,3,4,5]},"water":{"2026-10-25":{"cups":8,"goal":8},"2026-10-26":{"cups":8,"goal":8},"2026-10-27":{"cups":8,"goal":8},"2026-10-28":{"cups":8,"goal":8},"2026-10-29":{"cups":8,"goal":8},"2026-10-30":{"cups":8,"goal":8},"2026-10-31":{"cups":8,"goal":8}},"activeDays":[0,1,2,3,4,5,6]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":1200},
{"name":"dia-antigo-ignorado","log":{"tricks":{"0001-01-01":[0],"2026-10-26":[0]},"water":{},"activeDays":[0,1,2,3,4,5,6]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":10},
{"name":"chave-invalida","log":{"tricks":{"2026-02-31":[0],"lixo":[0],"2026-10-26":[0]},"water":{},"activeDays":[0,1,2,3,4,5,6]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":10},
{"name":"domingo-inativo-segunda","log":{"tricks":{"2026-10-25":[0,1,2,3,4,5],"2026-10-26":[0,1,2,3,4,5]},"water":{},"activeDays":[1,2,3,4,5]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":170},
{"name":"dias-ativos-vazios","log":{"tricks":{"2026-10-25":[0,1,2,3,4,5]},"water":{},"activeDays":[]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":85},
{"name":"semana-perfeita-subconjunto","log":{"tricks":{"2026-10-26":[0,1,2,3,4,5],"2026-10-27":[0,1,2,3,4,5],"2026-10-28":[0,1,2,3,4,5],"2026-10-29":[0,1,2,3,4,5],"2026-10-30":[0,1,2,3,4,5]},"water":{},"activeDays":[1,2,3,4,5]},"weekStart":"2026-10-25","lenientFrom":"2026-10-31","expected":625}
]$json$
-- vectors:end
  )::jsonb;
  item jsonb;
  got int;
begin
  for item in select jsonb_array_elements(vectors) loop
    got := public.week_xp_of(
      item->'log'->'tricks',
      item->'log'->'water',
      array(select jsonb_array_elements_text(item->'log'->'activeDays')::smallint),
      (item->>'weekStart')::date,
      (item->>'lenientFrom')::date
    );
    if got is distinct from (item->>'expected')::int then
      raise exception 'vetor % esperava % obteve %', item->>'name', item->>'expected', got;
    end if;
  end loop;
  raise notice 'ranking ok';
end $$;

-- Casos de ranking_ingest (a regra do trigger). Usa o primeiro usuário de auth.users e não deixa linhas:
-- tudo roda num sub-bloco que termina em exceção proposital, que desfaz as gravações. Falha de assert continua visível.
do $$
declare
  uid uuid;
  d date := (now() at time zone 'utc')::date;
  n int;
  g smallint;
begin
  select id into uid from auth.users limit 1;
  if uid is null then
    raise notice 'ranking_ingest: sem usuário em auth.users, casos pulados';
    return;
  end if;
  begin
    delete from public.ranking_tricks where user_id = uid;
    delete from public.ranking_water where user_id = uid;

    perform public.ranking_ingest(uid, jsonb_build_object(
      'completions', jsonb_build_object((d - 10)::text, jsonb_build_array(0, 1), d::text, '[0,0,9,"x"]'::jsonb),
      'water', jsonb_build_object(d::text, jsonb_build_object('cups', 3)),
      'settings', '{"water":{"goal":5}}'::jsonb
    ));
    select count(*) into n from public.ranking_tricks where user_id = uid and day = d - 10;
    if n <> 0 then raise exception 'dica fora da janela foi gravada (%)', n; end if;
    select count(*) into n from public.ranking_tricks where user_id = uid and day = d and trick = 0;
    if n <> 1 then raise exception 'esperava 1 linha para [0,0,9,"x"], obteve %', n; end if;
    select count(*) into n from public.ranking_tricks where user_id = uid;
    if n <> 1 then raise exception 'esperava 1 linha no total, obteve %', n; end if;
    n := public.week_xp(uid, d - extract(dow from d)::int);
    if n <> 10 then raise exception 'week_xp esperava 10, obteve %', n; end if;

    perform public.ranking_ingest(uid, jsonb_build_object(
      'water', jsonb_build_object(d::text, jsonb_build_object('cups', 4)),
      'settings', '{"water":{"goal":1}}'::jsonb
    ));
    select goal into g from public.ranking_water where user_id = uid and day = d;
    if g is distinct from 5 then raise exception 'meta deveria seguir 5, obteve %', g; end if;
    select cups into g from public.ranking_water where user_id = uid and day = d;
    if g is distinct from 4 then raise exception 'cups deveria ser 4, obteve %', g; end if;

    perform public.ranking_ingest(uid, '{}'::jsonb);

    raise exception 'rollback-sentinel';
  exception when others then
    if sqlerrm <> 'rollback-sentinel' then raise; end if;
  end;
  raise notice 'ranking_ingest ok';
end $$;
