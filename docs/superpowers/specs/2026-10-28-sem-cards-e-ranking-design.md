# Sem cards, Amigos com busca embutida e Conquistas com ranking global

Data: 2026-10-28. Status: aguardando aprovação. Revisado por um construtor; decisões do Claude marcadas no texto.

## Intenção

O usuário não gosta do estilo de cards de vidro em todas as telas, nem dos textos soltos: rótulos de seção em maiúsculas acima dos cards e notas de rodapé como "Crie lembretes para estudo, compras…". A tela de Conquistas está poluída: card de nível, quatro números, grade de patentes, grade de medalhas e "Como ganhar XP". O usuário quer ainda:

- ver as conquistas de outras pessoas num ranking global;
- abrir o perfil e pedir amizade direto do ranking;
- buscar amigos dentro da tela Amigos, sem abrir outra tela.

O ranking global só faz sentido se for honesto. Hoje o XP é calculado no aparelho e gravado pelo próprio app (`public_stats`), e qualquer um com a chave da API pode inflá-lo. O comentário `shortcut:` em `supabase/social.sql` já previa recalcular o XP no servidor caso o ranking virasse global.

## Objetivos

1. Nenhum card de vidro nas telas de conteúdo (Hoje, Histórico, Conquistas, Amigos, perfil de pessoa, Lembretes, Ajustes e admin). Seções separadas por linha fina (hairline).
2. Textos de apoio entram no próprio item, não ficam soltos acima ou abaixo dele.
3. Busca de amigos embutida na tela Amigos. A rota `amigos/buscar` deixa de existir.
4. Conquistas refeita, com abas **Ranking** e **Minhas**.
5. Ranking global da semana com top 10 e a linha do usuário sempre visível. O XP é calculado no servidor a partir de um registro com horário do servidor.
6. Pelo ranking dá para abrir o perfil da pessoa e pedir amizade com um toque.

## Fora do escopo

- Telas de autenticação, landing, instalação, onboarding e o menu da conta. Elas usam `Glass` direto, de propósito: são superfícies, folhas e modais, não seções de conteúdo. As telas que usam `Section` (incluindo admin e Lembretes) ficam sem card junto com o resto. Decisão do Claude: um estilo só, e `plain` pode ser removido.
- O XP pessoal mostrado no app continua calculado no aparelho (`progressOf`). Só o ranking usa o XP do servidor.
- O ranking da semana entre amigos, na tela Amigos, continua como está. Decisão do Claude: menos mudança, e entre amigos a fraude importa pouco.
- Impedir que alguém marque "feito" sem fazer a dica. Isso é impossível, e o máximo honesto da semana (cerca de 1.200 XP) é o teto real.

## Anti-objetivos (se acontecer, falhou)

- Um usuário consegue aparecer no ranking com XP semanal acima do que o app daria a alguém que marcou tudo em dia.
- O app passa a exigir internet para marcar uma dica.
- Cards trocados por outro container com fundo ou borda: a separação é só a linha.
- Qualquer e-mail ou dado privado aparecer no ranking.

## Parte 1: linguagem visual sem cards

**`Section` (`src/components/section.tsx`)**
- O modo `plain` vira o único. Remover a prop `plain` e o `Glass`, e atualizar quem passa `plain` (Ajustes).
- Cada seção ganha uma hairline no topo, de borda a borda da coluna, que a separa da anterior. As linhas entre itens continuam.
- O título deixa de ser rótulo em maiúsculas pequenas (`footnote`, `toUpperCase`) e vira cabeçalho `headline` em caixa normal, alinhado ao texto das linhas. Continua com `accessibilityRole="header"`.
- `footer` deixa de existir. Cada uso passa o texto para dentro de uma linha da seção (subtítulo da linha) ou o remove. Usos atuais: Ajustes, Hoje (Lembretes), `amigos/[id].tsx` e cinco no admin (`admin/index.tsx`, `admin/invites.tsx`, `admin/user/[id].tsx`). O construtor decide caso a caso, sem mudar o significado do texto.

**`StatColumns` (`src/components/stat-columns.tsx`)**
- Sem `Glass`. Números com linhas verticais finas entre colunas e uma hairline embaixo, que separa o bloco do resto.

**`ActionRow`**
- Ganha um subtítulo opcional (`detail`), em `footnote` e `secondaryLabel`, embaixo do rótulo. É o "texto dentro do menu".

**Por tela**
- **Hoje:** "Novo lembrete" ganha `detail="Estudo, compras, contas e o que mais precisar"`, e o footer da seção Lembretes sai. A frase de resumo ("Faltam 3 dicas hoje.") vai para dentro do bloco de números, como linha abaixo deles, sem ficar solta entre seções. Água, Lembretes e Linha do tempo seguem como seções com cabeçalho e hairline.
- **Histórico:** `StatColumns` sem card (efeito automático da mudança acima). O resto da tela não muda.
- **Amigos e perfil de pessoa (`amigos/[id]`):** efeito automático da nova `Section`.

## Parte 2: Amigos com busca embutida

- Um `TextField` "Buscar por nome ou @" no topo da tela Amigos, logo abaixo do título.
- Com o campo vazio, a tela fica como hoje: ranking da semana, pedidos e amigos. A seção "Encontrar pessoas" sai.
- Com texto no campo, a lista é trocada pelos resultados (`useUserSearch`), com os mesmos estados de hoje: "Pelo menos 3 letras", "Buscando…", "Ninguém encontrado.", erro com "Tentar de novo".
- A conta oculta (`searchable === false`) vê, no lugar do campo, a linha "Você está fora da busca", com `detail` e um toque que abre Ajustes > Conta.
- Apagar `src/app/(tabs)/amigos/buscar.tsx` e tirar a rota do `_layout` de amigos. Procurar e corrigir links para `/amigos/buscar`.

## Parte 3: Conquistas refeita

Estrutura, de cima para baixo:

1. **Linha de nível:** círculo da faixa com o número do nível, "Nível N · Faixa X", barra de XP e "faltam N XP". Reaproveita `LevelCard` sem fundo.
2. **Abas** `Ranking | Minhas` com `SegmentedTabs`, que já existe. A aba padrão é Ranking. Decisão do Claude: guardar a última aba é desnecessário.
3. **Ranking:**
   - Título "Top 10 da semana". Cada linha mostra posição, nome, @, faixa e XP da semana, com 1º, 2º e 3º destacados pela cor da posição.
   - Se o usuário estiver fora do top 10, depois de uma linha fina aparece a linha dele com a posição real ("34 · Você"). Se ainda não tiver XP na semana: "Você ainda não pontuou nesta semana".
   - Tocar numa linha que não é a sua abre `/amigos/[id]`.
   - Quem não é amigo e não tem pedido pendente ganha um botão "+" no fim da linha (alvo de 44 pt, rótulo de acessibilidade "Pedir amizade a Nome"). O toque chama `sendFriendRequest`, e a linha passa a mostrar "Enviado". Pedido pendente mostra "Enviado" ou "Te pediu". Amigo e a própria linha não têm botão.
   - Erros do servidor (limite de pedidos etc.) aparecem como texto `danger` acima da lista.
   - Estados de carregando, erro com "Tentar de novo" e vazio ("Ninguém pontuou nesta semana ainda").
4. **Minhas:** uma linha por medalha, com ícone da medalha, título, descrição em `detail` e, à direita, "Conquistada" ou "3/10". Primeiro as conquistadas, depois as bloqueadas.

**Sai da tela:** `StatColumns` com quatro números, grade de patentes (`BELTS`), "Como ganhar XP" (`RULES`) e o subtítulo "N XP no total". `BELTS` continua no domínio porque a faixa ainda aparece em vários lugares.

## Parte 4: registro antifraude e ranking no servidor

### Princípio

O servidor guarda a sua própria cópia das dicas feitas e dos copos de água, sempre com o **horário do servidor**, e aceita só dias recentes. O XP do ranking é calculado a partir dessa cópia. O app não precisa de nenhuma chamada nova: a cópia é preenchida por um trigger no `user_data`, que o app já envia em toda sincronização. Por isso marcar dica offline continua funcionando, inclusive pelas ações de notificação no Android.

### Novo arquivo `supabase/ranking.sql`

Roda depois de `social.sql`, pode rodar de novo e segue o estilo dos outros arquivos: `security definer`, `search_path = ''`, `revoke` de `public` e `anon`, `require_access()`.

**Tabelas** (RLS ligado e nenhuma política: só as funções e o trigger acessam):
- `ranking_tricks (user_id, day date, trick smallint check (trick between 0 and 5), recorded_at timestamptz default now(), primary key (user_id, day, trick))`
- `ranking_water (user_id, day date, cups smallint, goal smallint, recorded_at timestamptz, primary key (user_id, day))`
- `ranking_settings (user_id primary key, active_days smallint[], water_enabled boolean, updated_at timestamptz)`

**Janela de aceitação.** Um dia `d` enviado pelo app só é gravado se `current_date(UTC) - 2 <= d <= current_date(UTC) + 1`. Isso cobre todos os fusos e até cerca de dois dias de atraso offline. Dia fora da janela é ignorado em silêncio pelo ranking e continua valendo no app. Decisão do Claude: dois dias de folga.

**Trigger `after insert or update on user_data`:**
- Para cada `(dia, índices)` de `data->'completions'` dentro da janela, insere os índices válidos (0 a 5, inteiros) com `on conflict do nothing`. Nunca apaga: as dicas não podem ser desmarcadas no app, e o `mergeData` só soma.
- Para cada dia de `data->'water'` dentro da janela: grava `cups` limitado a 0..50 (`MAX_CUPS`) e a meta atual (`settings.water.goal`, limitada a `WATER_GOAL.min..max`). A meta fica congelada no primeiro registro do dia: o upsert atualiza `cups` mas não `goal`, para que ninguém baixe a meta depois de beber.
- Atualiza `ranking_settings` com `settings.days` (só 0 a 6, sem repetir; vazio vira os 7) e `settings.water.enabled`.
- Se `resetAt` mudou para um valor maior, apaga as linhas de ranking do usuário. Decisão do Claude: "Resetar dados" vale também para o ranking.
- O trigger nunca pode fazer a gravação do `user_data` falhar. Dados malformados são pulados.

**`week_xp(uid, week_start date)`** em SQL puro aplica as mesmas regras de `computeStats` e `withWater`, só sobre os dias `week_start .. week_start + 6`:
- `10 × dicas` do dia;
- dia perfeito (6 dicas): `25 + 5 × min(sequência - 1, 10)`. A sequência conta dias ativos perfeitos seguidos, olhando também antes da semana (dentro do que existe em `ranking_tricks`). Dia ativo não perfeito zera a sequência, exceto o dia de hoje. Dia inativo perfeito pontua, mas não soma à sequência;
- semana perfeita (todos os dias ativos da semana completos): +150;
- meta de água batida (`cups >= goal`, sem olhar `water_enabled`, igual ao `withWater`): +15 por dia. A meta é a congelada no dia (`ranking_water.goal`). Isso é mais rígido que o TS, que usa a meta atual para o passado inteiro. Decisão do Claude: a diferença é a proteção contra fraude, então nesse ponto vale o SQL. `ranking_settings.water_enabled` fica fora do schema.

Se `computeStats` usar outra definição em algum detalhe (exceto a meta de água congelada), vale a do TS, e o SQL acompanha.

**Fuso de cada pessoa.** O servidor não sabe o fuso de cada um. A exceção "o dia de hoje não quebra a sequência" vale, para cada pessoa, para qualquer dia `>= current_date(UTC) - 1`. Decisão do Claude: ninguém perde sequência ou semana perfeita por diferença de fuso.

**`global_ranking(today date)`**
- Requer acesso. `today` é limitado a ±1 dia de `current_date` UTC. A semana começa no domingo de `today`.
- Considera só contas com `user_has_access`, `searchable = true`, `@` definido e que não sejam admin (`invisible_to` já esconde admin de quem não é admin, e o perfil não abriria). Decisão do Claude. sem bloqueio com quem pede (`blocked_between`), e com `week_xp > 0`.
- Devolve até 10 linhas: `position` (empates dividem a posição, como em `rankWeek`), `id`, `name`, `username`, `level` (de `public_stats`, só para a faixa), `week_xp` e `relation` (via `relation_of`). Devolve também a linha do próprio usuário com a posição real, mesmo fora do top 10 e mesmo com `searchable = false`, mas nesse caso sem entrar na contagem dos outros.
- Nunca devolve e-mail.
- Desempenho: o cálculo roda sobre `ranking_tricks` só da semana e dos dias anteriores necessários para a sequência. Para a base atual, calcular na hora basta. `shortcut:` quando houver muitos usuários, materializar `week_xp` numa tabela atualizada pelo trigger.

**Carga inicial.** No fim de `ranking.sql`, um `insert ... select` roda a mesma lógica do trigger sobre todo o `user_data` existente, só para os dias dentro da janela. Os dados continuam sendo os mesmos que o app grava, com a mesma confiança. Decisão do Claude: ninguém começa a semana do lançamento zerado sem motivo. Sequências anteriores à janela não entram.

### Paridade TS ↔ SQL

- Nova função pura `weekXp(...)` em `src/domain/ranking.ts`, com a mesma assinatura lógica da SQL: dias com dicas, água, metas, dias ativos e início da semana. Testada em Jest.
- Vetores de teste em `src/domain/__tests__/ranking-vectors.json`, usados pelo teste Jest e por `supabase/tests/ranking.sql`. Esse script cria uma tabela temporária com os vetores, chama `week_xp` e faz `raise exception` se algum resultado divergir. Roda manualmente no SQL Editor, como o resto de `supabase/`.
- Um teste Jest confere que `weekXp` bate com `progressOf` (diferença de XP entre o fim da semana anterior e hoje) em dados com meta de água fixa e sem dias anteriores à janela de sequência, ancorando as três implementações.

### App

- `src/services/social.ts`: `fetchGlobalRanking(today)` chama a RPC e valida as linhas com parser no estilo de `parsePublicUser`.
- `src/state/use-friends.ts` (ou um hook novo `useGlobalRanking`): carrega ao focar a aba Conquistas e expõe `{ rows, me, loading, error, reload, request(id) }`. O pedido de amizade atualiza a `relation` da linha sem recarregar tudo.
- `public_stats.week_xp` continua sendo gravado e usado no ranking de amigos. O ranking global o ignora.

## Documentação a atualizar

- `docs/design.md`: a regra "sem cards, separação por linha", `Section` sem glass, `ActionRow.detail` e a nova estrutura de Conquistas.
- `docs/supabase-setup.md`: rodar `ranking.sql` depois de `social.sql` e rodar `supabase/tests/ranking.sql` para conferir.
- `docs/architecture.md`: o registro de ranking no servidor e por que existe.
- `supabase/social.sql`: o comentário `shortcut:` passa a apontar para `ranking.sql`.

## Critério de aceite

- `npm run check` passa.
- `Section` e `StatColumns` não importam `Glass`. Nenhuma tela de `src/app` usa `Glass` direto fora de auth e legal.
- A busca funciona dentro de Amigos, e `/amigos/buscar` não existe mais.
- No Supabase, com os vetores, `supabase/tests/ranking.sql` termina sem exceção.
- Um `update` manual de `user_data` com dicas de 10 dias atrás não muda o XP no ranking. Dez dicas no mesmo dia contam como 6. Baixar a meta de água no mesmo dia não gera bônus.
- Verificação visual no navegador (`npm run dev`) de Hoje, Histórico, Conquistas (as duas abas) e Amigos (campo vazio e com busca), em claro e escuro.

## Deixado ao construtor

- Espaçamentos exatos, cor do destaque do pódio (usar tokens existentes) e animação da troca de abas.
- Onde a linha "fora da busca" e o erro do ranking ficam, dentro das regras acima.
- Ordem de implementação. Sugestão: Parte 4 (SQL, domínio e teste), depois Parte 1, Parte 2 e Parte 3.
