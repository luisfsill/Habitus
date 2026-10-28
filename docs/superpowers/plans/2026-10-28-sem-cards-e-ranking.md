# Sem cards, Amigos com busca e Conquistas com ranking global: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tirar os cards de vidro das telas de conteúdo, embutir a busca em Amigos, refazer Conquistas com abas Ranking/Minhas e criar um ranking global semanal cujo XP é calculado pelo Supabase.

**Architecture:** Um trigger em `user_data` copia dicas e água dos últimos dias para tabelas só do servidor, com horário do servidor e janela de aceitação. Uma função SQL pura calcula o XP da semana com as mesmas regras de uma função TS pura (`weekXp`). Os vetores de teste ficam em um único arquivo SQL, que o Jest também lê. A UI troca `Glass` por hairlines em `Section` e `StatColumns`.

**Tech Stack:** Expo SDK 58, React Native 0.88, TypeScript strict, Expo Router, Jest (jest-expo), Supabase (Postgres, plpgsql).

**Spec:** `docs/superpowers/specs/2026-10-28-sem-cards-e-ranking-design.md`

## Global Constraints

- Interface 100% em português do Brasil. Nenhuma afirmação médica.
- Camadas (ESLint): `src/domain` puro; `src/components` não importa `services` nem `app`; `src/services` não importa UI nem `state`; `console` só em `src/services/log.ts`; arquivos com no máximo 350 linhas.
- Toda regra de XP vive em `src/domain` como função pura com teste.
- SQL em `supabase/`: `security definer`, `set search_path = ''`, `revoke ... from public, anon`, `grant ... to authenticated`, pode rodar de novo (`if not exists`, `create or replace`, `drop ... if exists`).
- Janela de aceitação: `current_date - 2 <= day <= current_date + 1` (UTC). Truques 0..5. Copos 0..50 (`MAX_CUPS`). Meta 1..20 (`WATER_GOAL`).
- XP: `trick 10`, `perfectDay 25`, `streakStep 5`, `streakCap 10`, `perfectWeek 150`, `waterGoal 15` (de `XP_RULES`).
- Top 10, semana começando no domingo.
- Alvos de toque ≥ 44 pt (`HIT`). Todo item tocável tem `accessibilityLabel`.
- Commit e push só quando o usuário pedir. As etapas "Checkpoint" abaixo só conferem `git status`. Nada é commitado.
- Rode `npm run check` antes de declarar a tarefa pronta.

## Review Focus

1. Dados malformados em `user_data` (dia inválido, índice string, `water` ausente, `settings` faltando). O trigger pula o item e o `upsert` do app nunca falha. Teste: casos em `supabase/tests/ranking.sql` (Task 2).
2. Usuário que desligou "Aparecer na busca" ou é admin. Não aparece para os outros, mas vê a própria linha. Teste: asserts do parser com `me` sem estar no `top` (Task 3). A regra SQL é conferida pelo checklist manual da Task 2.
3. Empates de XP. Todos dividem a posição (1, 1, 3), igual a `rankWeek`. Teste: vetor de parser na Task 3 e cláusula `rank()` na Task 2.
4. Ranking vazio ou erro de rede na aba Ranking. Aparece mensagem e "Tentar de novo", sem tela branca. Teste: verificação no navegador (Task 6).
5. Toque em "+" com o pedido recusado pelo servidor (limite, bloqueio). A mensagem aparece e o "+" volta. Teste: estado do hook (Task 3) e verificação no navegador (Task 6).

---

### Task 1: `weekXp` pura em TS e SQL, com vetores compartilhados

**Files:**
- Create: `src/domain/ranking.ts`
- Create: `src/domain/__tests__/ranking.test.ts`
- Create: `supabase/tests/ranking.sql`
- Create: `supabase/ranking.sql` (só a função `public.week_xp_of` nesta task)

**Interfaces:**
- Produces (TS):
  ```ts
  export interface RankingLog {
    /** day key -> trick indices done */
    tricks: Readonly<Record<string, readonly number[]>>;
    /** day key -> cups drunk and the goal frozen that day */
    water: Readonly<Record<string, { cups: number; goal: number }>>;
    activeDays: readonly Weekday[];
  }
  /** XP earned in the Sunday-first week starting `weekStart`. Days >= `lenientFrom` never break the streak. */
  export function weekXp(log: RankingLog, weekStart: string, lenientFrom: string): number;
  ```
- Produces (SQL): `public.week_xp_of(tricks jsonb, water jsonb, active_days smallint[], week_start date, lenient_from date) returns int`, `immutable`, mesmos formatos JSON do `RankingLog`.

**Algoritmo** (idêntico nos dois lados):
1. Percorra os dias de `min(primeiro dia com dica, weekStart)` até `weekStart + 6`, em ordem, mantendo `streak`.
2. Para cada dia, `count` = índices distintos em 0..5. `active` = dia da semana em `activeDays` (vazio conta como todos os 7).
3. Se `count == 6`: some 1 a `streak` quando `active`. Bônus `25 + 5 * min(max(streak - 1, 0), 10)`, contado só se o dia está na semana.
4. Senão, se `active` e `day < lenientFrom`: `streak = 0`.
5. Na semana: some `10 * count`, e some `15` se `water[day].cups >= water[day].goal`.
6. No fim: +150 se todo dia ativo da semana tem `count == 6` e existe ao menos um dia ativo.

O passo 6 é uma simplificação: `computeStats` fecha a semana no sábado ou em "hoje", mas dias futuros nunca estão completos, então o resultado é o mesmo.

- [ ] **Step 1: Escreva `supabase/tests/ranking.sql` com os vetores**

  Bloco entre `-- vectors:begin` e `-- vectors:end`, contendo `$json$[ ... ]$json$`. Cada item: `{ "name", "log": { "tricks", "water", "activeDays" }, "weekStart", "lenientFrom", "expected" }`. Depois do bloco, um `do $$ ... $$` percorre os vetores, chama `public.week_xp_of` e faz `raise exception 'vetor % esperava % obteve %'` se divergir. Termina com `raise notice 'ranking ok'`.

  Vetores obrigatórios (semana `2026-10-25` a `2026-10-31`, todos os dias ativos, salvo indicação):
  - `vazio`: nada → `0`.
  - `uma-dica`: `{"2026-10-26":[0]}` → `10`.
  - `indice-invalido-e-repetido`: `{"2026-10-26":[0,0,7,-1]}` → `10`.
  - `dia-perfeito`: `{"2026-10-26":[0,1,2,3,4,5]}` → `60 + 25 = 85`.
  - `sequencia-de-antes`: dias perfeitos 2026-10-22 a 2026-10-26, `lenientFrom 2026-10-26` → semana tem só 26/10, com sequência 5: `60 + 25 + 20 = 105`.
  - `sequencia-quebrada`: perfeito 2026-10-24, nada em 25/10, perfeito 26/10, `lenientFrom 2026-10-31` → `85` (sequência volta a 1).
  - `hoje-nao-quebra`: perfeito 25/10, nada em 26/10, `lenientFrom 2026-10-26` → `85`.
  - `dia-inativo-perfeito`: `activeDays [1,2,3,4,5]`, perfeito domingo 25/10 → `85`, e o domingo não soma à sequência.
  - `teto-de-sequencia`: 15 dias perfeitos seguidos terminando em 2026-10-31 → bônus de cada dia limitado a `25 + 50`. Calcule e fixe o número.
  - `semana-perfeita`: 7 dias perfeitos 25 a 31/10, sem histórico anterior → `7*60 + Σ(25+5*(i-1)) para i=1..7 + 150`. Calcule e fixe.
  - `agua`: `{"2026-10-26":{"cups":8,"goal":8}, "2026-10-27":{"cups":7,"goal":8}}` → `15`.
  - `maximo-honesto`: 7 dias perfeitos com sequência longa anterior e água batida todo dia → `7*60 + 7*75 + 150 + 7*15 = 1200`.

- [ ] **Step 2: Escreva `src/domain/__tests__/ranking.test.ts`**
  - `it.each(vectors)("%s", ...)`: lê `supabase/tests/ranking.sql` com `fs`, extrai o JSON entre `$json$` e `$json$`, e confere `expect(weekXp(v.log, v.weekStart, v.lenientFrom)).toBe(v.expected)`.
  - `"bate com progressOf"`: dados de app com `completions` em 2026-10-20..2026-10-28, `water` com meta fixa 8, `settings.days` padrão e `now = new Date(2026, 9, 28, 12)`. Espera `weekXp(...)` igual a `progressOf(data, now).stats.xp - progressOf(data, sabadoAnterior23h59).stats.xp`, com o mesmo `end` que `publicStats` usa em `src/domain/friends.ts`. `lenientFrom = "2026-10-28"`.

- [ ] **Step 3: Rode `npx jest src/domain/__tests__/ranking.test.ts`.** Esperado: FAIL, "Cannot find module '../ranking'".

- [ ] **Step 4: Implemente `weekXp` em `src/domain/ranking.ts`** com `addDays`, `dayKey` e `fromDayKey` de `./time`, `XP_RULES` e `TRICK_COUNT`.

- [ ] **Step 5: Rode o teste de novo.** Esperado: PASS. Corrija os números fixados no Step 1 só se o teste `progressOf` passar e o vetor estiver errado à mão.

- [ ] **Step 6: Escreva `public.week_xp_of` em `supabase/ranking.sql`**, em plpgsql, seguindo o mesmo algoritmo. O cabeçalho do arquivo segue o estilo de `social.sql`: "Rode DEPOIS de social.sql…".

- [ ] **Step 7: Peça ao usuário para rodar `supabase/ranking.sql` e depois `supabase/tests/ranking.sql` no SQL Editor.** Esperado: notice `ranking ok`. Se ele não puder agora, registre como pendente e siga.

- [ ] **Step 8: Checkpoint.** `npm test` passa e `git status` mostra só os 4 arquivos.

### Task 2: Tabelas, trigger, carga inicial e `global_ranking` no Supabase

**Files:**
- Modify: `supabase/ranking.sql`
- Modify: `supabase/tests/ranking.sql` (casos do trigger)
- Modify: `supabase/social.sql:17` (comentário `shortcut:` aponta para `ranking.sql`)
- Modify: `docs/supabase-setup.md`, `docs/architecture.md`

**Interfaces:**
- Consumes: `public.week_xp_of` (Task 1); `public.user_has_access`, `public.blocked_between`, `public.relation_of` e `public.require_access` de `social.sql`.
- Produces: `public.global_ranking(today date) returns jsonb` no formato
  ```json
  { "week_start": "2026-10-25",
    "top": [{ "position": 1, "id": "uuid", "name": "Ana", "username": "ana", "level": 4, "week_xp": 320, "relation": "none" }],
    "me": { "position": 34, "id": "...", "name": "...", "username": "...", "level": 2, "week_xp": 40, "relation": "none" } }
  ```
  `me` é `null` quando o usuário tem 0 XP na semana. Quando o usuário está no top, `me` repete a linha dele.

- [ ] **Step 1: Crie as tabelas** `ranking_tricks`, `ranking_water` (`goal` congelado) e `ranking_settings (user_id, active_days smallint[], reset_at bigint, updated_at)`. Use as colunas do spec, sem `water_enabled`, mais `reset_at` para detectar reset. Ligue o RLS sem políticas. Crie índice `(day)` em `ranking_tricks`.

- [ ] **Step 2: Escreva `public.ranking_ingest(uid uuid, data jsonb) returns void`**, que concentra a regra do trigger para a carga inicial também usar. A regra é a do spec, Parte 4:
  - Janela de dias.
  - Índices 0..5 inteiros, com `on conflict do nothing`.
  - Água: `insert ... on conflict (user_id, day) do update set cups = excluded.cups, recorded_at = now()`. `goal` não muda no update e fica limitado a 1..20 (padrão 8 se ausente). `cups` fica limitado a 0..50.
  - `active_days`: só 0..6 distintos; vazio vira os 7.
  - `resetAt` maior que o `reset_at` guardado: apague `ranking_tricks` e `ranking_water` do usuário antes de inserir.
  - Todo acesso a JSON passa por `jsonb_typeof` e por regex `^\d{4}-\d{2}-\d{2}$` em vez de cast cego. O corpo vai num bloco `begin ... exception when others then raise warning ... end` para que o trigger nunca falhe.

- [ ] **Step 3: Crie o trigger** `ranking_ingest_trg after insert or update on public.user_data for each row execute function public.ranking_ingest_row()`. A função de trigger chama `ranking_ingest(new.user_id, new.data)` e retorna `null`.

- [ ] **Step 4: Escreva a carga inicial** no fim do arquivo: `select public.ranking_ingest(user_id, data) from public.user_data;`. Pode rodar de novo, porque os inserts são idempotentes.

- [ ] **Step 5: Escreva `public.week_xp(uid uuid, week_start date) returns int`.** Monte `tricks` e `water` em jsonb a partir das tabelas (dicas desde `week_start - 60`, que já cobre o teto de sequência de 11 dias) e chame `week_xp_of(..., lenient_from => current_date - 1)`.

- [ ] **Step 6: Escreva `public.global_ranking(today date) returns jsonb`.**
  - Chama `require_access()`. Limita `today` a `current_date ± 1`. `week_start = today - extract(dow from today)::int`.
  - Candidatos: `profiles` com `username` não nulo, `searchable`, `role <> 'admin'`, `user_has_access(id)`, `not blocked_between(auth.uid(), id)` e `week_xp > 0`.
  - `position` vem de `rank() over (order by week_xp desc)`. Desempate na ordem por `name`.
  - `top` traz as 10 primeiras linhas, com `level` de `public_stats` (`coalesce` 1) e `relation_of(auth.uid(), id)`.
  - `me` usa o XP de `auth.uid()`: posição = `1 + count(candidatos com week_xp maior)`, mesmo que o usuário não seja candidato.
  - Revogue de `public` e `anon`. Conceda a `authenticated`. `revoke execute` em `week_xp`, `week_xp_of` e `ranking_ingest` de `authenticated` também: só as funções internas as usam.

- [ ] **Step 7: Adicione casos do trigger a `supabase/tests/ranking.sql`**, num bloco `do $$` separado.
  - As tabelas têm `user_id references auth.users (id) on delete cascade` (Step 1). Então o teste pega um usuário existente (`select id from auth.users limit 1`) e roda tudo dentro de um bloco que termina em `raise exception` proposital, capturado para desfazer as gravações. Ou documente que o teste deve rodar entre `begin;` e `rollback;`.
  - Asserts:
    - dicas de `current_date - 10` são ignoradas;
    - `[0,0,9,"x"]` em `current_date` grava 1 linha;
    - segunda chamada com meta 1 no mesmo dia mantém a meta original;
    - `"data": {}` não lança erro.
  - Limpe no fim.

- [ ] **Step 8: Atualize a documentação.**
  - `docs/supabase-setup.md`: passo "rodar `ranking.sql` depois de `social.sql`" e depois `supabase/tests/ranking.sql`, que deve dar `ranking ok`.
  - `docs/architecture.md`: parágrafo sobre o registro do ranking (por quê, janela, meta congelada).
  - `supabase/social.sql:17`: o comentário passa a dizer que o ranking global usa `ranking.sql`, e que `public_stats.week_xp` vale só entre amigos.

- [ ] **Step 9: Peça ao usuário para rodar os dois scripts** e confira o checklist manual do spec ("Critério de aceite", itens do Supabase). Esperado: `ranking ok`.

- [ ] **Step 10: Checkpoint.** `git status`.

### Task 3: Ranking global no app (parser, serviço e hook)

**Files:**
- Modify: `src/domain/ranking.ts` (tipos e parser)
- Modify: `src/domain/__tests__/ranking.test.ts`
- Modify: `src/services/social.ts`
- Create: `src/state/use-global-ranking.ts`

**Interfaces:**
- Consumes: formato JSON de `global_ranking` (Task 2); `Relation` de `@/domain/friends`; `sendFriendRequest` de `@/services/social`.
- Produces:
  ```ts
  // src/domain/ranking.ts
  export interface GlobalRow { id: string; name: string; username: string; level: number; weekXp: number; position: number; relation: Relation }
  export interface GlobalRanking { top: GlobalRow[]; me: GlobalRow | null }
  export function parseGlobalRanking(raw: unknown): GlobalRanking;
  // src/services/social.ts
  export async function fetchGlobalRanking(today: string): Promise<GlobalRanking>; // rpc "global_ranking", { today }
  // src/state/use-global-ranking.ts
  export function useGlobalRanking(): {
    ranking: GlobalRanking | null; loading: boolean; error: string | null;
    reload: () => Promise<void>; requesting: string | null; request: (id: string) => Promise<void>;
  };
  ```

- [ ] **Step 1: Testes do parser** em `ranking.test.ts`:
  - linha válida com `week_xp` → `weekXp`;
  - linha com `relation: "x"` ou sem `username` é descartada;
  - `raw = null` → `{ top: [], me: null }`;
  - `me` presente e fora do `top` é mantido;
  - empate: duas linhas com `position: 1` são preservadas.

- [ ] **Step 2: Rode os testes.** Esperado: FAIL.

- [ ] **Step 3: Implemente `parseGlobalRanking`** reaproveitando o estilo de `parsePublicUser` (`isRow`, `str`, `num`). Exporte de `friends.ts` o que for preciso, sem duplicar.

- [ ] **Step 4: Rode os testes.** Esperado: PASS.

- [ ] **Step 5: Implemente `fetchGlobalRanking`** com o helper `call` de `social.ts`, passando `today = dayKey(new Date())` a partir do hook.

- [ ] **Step 6: Implemente `useGlobalRanking`.**
  - Recarrega com `useFocusEffect`, como `useFriends`.
  - `request(id)` chama `sendFriendRequest`. Em `"accepted"`, a `relation` vira `"friends"`; em `"sent"`, vira `"outgoing"`, atualizando só a linha.
  - Em erro, `error = e.message` e a relation fica como estava.
  - `requesting` guarda o id em voo.

- [ ] **Step 7: Rode `npm run typecheck && npm run lint`.** Esperado: sem erros.

- [ ] **Step 8: Checkpoint.**

### Task 4: Linguagem sem cards (`Section`, `StatColumns`, `ActionRow.detail`) e todos os chamadores

**Files:**
- Modify: `src/components/section.tsx`, `src/components/stat-columns.tsx`, `src/components/action-row.tsx`
- Modify (callers of `plain`/`footer`): `src/app/(tabs)/settings/[section].tsx`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/amigos/[id].tsx`, `src/app/(tabs)/admin/invites.tsx`, `src/app/(tabs)/admin/user/[id].tsx`, `src/components/reminder-form.tsx`, `src/components/sky-trick.tsx`
- Modify: `docs/design.md`

**Interfaces:**
- Produces:
  - `Section({ title, accessory?, children })`. As props `plain` e `footer` deixam de existir.
  - `ActionRow({ ..., detail?: string })`.
  - `StatColumns`: mesma API, sem `Glass`.

- [ ] **Step 1: `Section`.**
  - Remova `Glass`, `plain` e `footer`.
  - O wrapper ganha `borderTopWidth: hairline` com `colors.separator` e `paddingTop: space.md`.
  - O título vira `AppText variant="headline"`, sem `toUpperCase` e sem `letterSpacing`, e mantém `accessibilityRole="header"`.
  - As linhas entre itens continuam.

- [ ] **Step 2: `ActionRow.detail`.** O rótulo e o `detail` ficam numa coluna `flex: 1`. O `detail` usa `footnote` e `secondaryLabel`. O `accessibilityLabel` passa a ser `` `${label}. ${detail}` `` quando há detail.

- [ ] **Step 3: `StatColumns`.** Troque `Glass` por `View`, com `borderBottomWidth: hairline`. Mantenha as linhas internas.

- [ ] **Step 4: Rode `npm run typecheck`.** A lista de erros é a lista de chamadores com `footer`/`plain`.

- [ ] **Step 5: Converta cada chamador.**
  - Remova `plain`.
  - Cada `footer` vira o último filho da seção: `<AppText variant="footnote" color="secondaryLabel">…</AppText>`. Assim o texto fica dentro da seção, numa linha separada por hairline.
  - Exceção em `index.tsx`: a seção Lembretes perde o footer, e o `ActionRow` "Novo lembrete" ganha `detail="Estudo, compras, contas e o que mais precisar"`.
  - Em `index.tsx`, a frase `summary(...)` continua logo abaixo de `StatColumns`, dentro do mesmo `View`. A hairline do `StatColumns` passa a ficar abaixo da frase: mova a borda para o wrapper `styles.summary` e passe `StatColumns` sem borda própria, ou aceite a borda entre os dois. Decida pela leitura no navegador.

- [ ] **Step 6: Rode `npm run check`.** Esperado: PASS.

- [ ] **Step 7: Atualize `docs/design.md`.** Registre a regra "sem cards; seções separadas por hairline com cabeçalho `headline`; textos de apoio dentro da linha (`ActionRow.detail` ou última linha da seção)" e remova as menções a seção em card de vidro.

- [ ] **Step 8: Verifique no navegador** (`preview_start`, `npm run dev`): Hoje, Histórico, Ajustes, Lembretes e Admin, em claro e escuro. Nenhum card. Tire screenshot de Hoje.

- [ ] **Step 9: Checkpoint.**

### Task 5: Busca embutida em Amigos

**Files:**
- Modify: `src/app/(tabs)/amigos/index.tsx`
- Delete: `src/app/(tabs)/amigos/buscar.tsx`
- Modify: `src/app/(tabs)/amigos/_layout.tsx` (remova a tela `buscar` se estiver listada)

**Interfaces:**
- Consumes: `useUserSearch(enabled)` de `@/state/use-friends`; `useAccess().profile.searchable`; `TextField`; `PersonRow`; `ActionRow` com `detail` (Task 4).

- [ ] **Step 1: Mova `Results` de `buscar.tsx` para `amigos/index.tsx`**, sem mudar a lógica.

- [ ] **Step 2: Topo da tela Amigos.**
  - Se `profile?.searchable === false`: mostre `ActionRow` com `label="Você está fora da busca"`, `detail="Ative \"Aparecer na busca\" em Ajustes para buscar pessoas."`, `navigates`, abrindo `router.navigate("/settings/conta")`.
  - Senão: `TextField label="Buscar por nome ou @"`, `placeholder="Pelo menos 3 letras"`, `autoCapitalize="none"`, `maxLength={40}`.

- [ ] **Step 3: Corpo da tela.** Com `search.query !== ""`, renderize só `<Results search={search} />`. Senão, mostre o conteúdo atual sem a seção "Encontrar pessoas", e remova a constante `SEARCH`.

- [ ] **Step 4: Apague `buscar.tsx`.** Rode `grep -rn "amigos/buscar" src`. Esperado: nada.

- [ ] **Step 5: Rode `npm run check`.** Esperado: PASS (inclui o limite de 350 linhas).

- [ ] **Step 6: Verifique no navegador:** campo vazio mostra a lista; "ana" mostra resultados; toque abre o perfil; conta oculta vê a linha de Ajustes.

- [ ] **Step 7: Checkpoint.**

### Task 6: Conquistas refeita

**Files:**
- Modify: `src/app/(tabs)/achievements.tsx` (reescrita)
- Create: `src/components/global-rank-list.tsx`
- Create: `src/components/badge-list.tsx`

**Interfaces:**
- Consumes: `useGlobalRanking()` (Task 3); `GlobalRow` e `GlobalRanking` (Task 3); `progress.badges: BadgeState[]`; `LevelCard`; `SegmentedTabs`; `BeltChip` de `./person-row`; `Section` (Task 4).
- Produces:
  ```ts
  export function GlobalRankList(props: {
    ranking: GlobalRanking; onOpen: (id: string) => void; onAdd: (id: string) => void; requesting: string | null;
  }): JSX.Element;
  export function BadgeList(props: { badges: readonly BadgeState[] }): JSX.Element;
  ```

- [ ] **Step 1: `GlobalRankList`.**
  - Linha: posição, nome (ou "Você"), `@username`, `BeltChip level` e "N XP". Posições 1 a 3 com cor de destaque (tokens existentes, por exemplo `warm` e `accentText`).
  - Linha alheia: `Pressable` que chama `onOpen`, com `accessibilityLabel` "Nº lugar: Nome, @user, N XP na semana. Abre o perfil".
  - Botão "+" quando `relation === "none"`: `HIT`×`HIT`, label "Pedir amizade a Nome", `ActivityIndicator` quando `requesting === id`. `"outgoing"` mostra o texto "Enviado"; `"incoming"`, "Te pediu"; `"friends"`, nada.
  - Se `me` existe e não está em `top`: depois de uma hairline, a linha "N · Você". Se `me === null`, mostre a linha "Você ainda não pontuou nesta semana".
  - Lista `top` vazia: "Ninguém pontuou nesta semana ainda".

- [ ] **Step 2: `BadgeList`.** Uma linha por medalha: ícone num círculo de 36, título, `def.description` em footnote e, à direita, "Conquistada" ou `${progress}/${target}`. Ordem: conquistadas primeiro, mantendo a ordem original dentro de cada grupo. Mantenha o `accessibilityLabel` da `Badge` atual.

- [ ] **Step 3: Reescreva `achievements.tsx`.**
  - `Screen title="Conquistas"`, sem `subtitle`.
  - `LevelCard progress={progress}`.
  - `SegmentedTabs` com as opções `[{value:"ranking",label:"Ranking"},{value:"minhas",label:"Minhas"}]` e estado inicial `"ranking"`.
  - Ranking: `Section title="Top 10 da semana"` com erro (`danger`) e "Tentar de novo" (`PrimaryButton variant="tinted"`), "Carregando…" ou `GlobalRankList`. `onOpen = id => router.push(\`/amigos/${id}\`)`, `onAdd = id => void request(id)`.
  - Minhas: `Section title={\`Medalhas · ${unlocked}/${total}\`}` com `BadgeList`.
  - Remova `RULES`, `Badge`, `StatColumns`, `BELTS`, `nextBelt` e `XP_RULES` desta tela.

- [ ] **Step 4: Rode `npm run check`.** Esperado: PASS.

- [ ] **Step 5: Verifique no navegador:** as duas abas, em claro e escuro, em largura de celular (375).
  - Toque numa linha abre o perfil. "+" vira "Enviado".
  - Em erro de rede (offline no DevTools), aparece a mensagem com "Tentar de novo".
  - Tire screenshot das duas abas.

- [ ] **Step 6: Checkpoint.**

### Task 7: Fechamento

- [ ] **Step 1: Rode `npm run check`.** Esperado: tudo PASS.
- [ ] **Step 2: Rode `grep -rn "Glass" src/components/section.tsx src/components/stat-columns.tsx`.** Esperado: nada.
- [ ] **Step 3: Releia o "Critério de aceite" do spec** e marque cada item: feito, ou pendente com o motivo (por exemplo, scripts SQL ainda não rodados pelo usuário).
- [ ] **Step 4: Relate ao usuário** o que mudou e o que falta ele rodar no Supabase. Não faça commit sem pedido.
