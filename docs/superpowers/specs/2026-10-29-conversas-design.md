# Conversas: chat entre amigos no estilo MSN (e abas reorganizadas)

Data: 2026-10-29. Primeira de duas partes da "mini rede social". A segunda (recados do Orkut com aprovação) tem documento próprio, depois desta.

## Por quê

O usuário quer que o Habitus tenha um lado social de verdade: conversar com os amigos com o clima do MSN antigo (chamar atenção, figurinhas no meio da conversa). Hoje a amizade só serve para ver o perfil do outro. Conversar dá motivo para voltar ao app e puxa os amigos para os hábitos.

## Objetivos

- Uma aba **Conversas** na barra, ao lado do Perfil, com a lista de conversas e a conversa com cada amigo.
- Conversa 1:1 só entre amigos, liberada direto (sem aceite).
- Mensagem de texto com tudo que o teclado do celular oferece (emojis, símbolos).
- **Chamar atenção**: a conversa do amigo treme, o celular vibra e toca um som.
- **Figurinhas**: pacote próprio que aparece grande na conversa.
- "digitando…", "visto", contagem de não lidas no selo da aba.
- Mensagens chegam na hora com o app aberto e viram aviso (Web Push) com o app fechado.
- Denunciar mensagem e bloquear a pessoa.
- **Histórico** deixa de ser aba e vira uma opção dentro de **Conquistas**.

## Fora do escopo (desta versão)

Grupos, áudio, foto, vídeo, GIFs da internet (GIPHY), imagens coladas pelo teclado, editar ou apagar mensagem, mensagem para quem não é amigo, recados (documento seguinte), push nativo (Expo push tokens).

## Anti-objetivos

- Nada de assets do MSN: emoticons, sons e o nome "MSN" são da Microsoft. Tudo próprio ou de licença livre.
- Ninguém lê conversa de outros: as regras de leitura ficam no banco (RLS), não no app.
- Chamar atenção não pode virar tortura: tem limite.
- Sem afirmações médicas nas figurinhas e textos (AGENTS.md).

## Barra de abas

Fica: **Hoje · Conquistas · Conversas · Perfil · Ajustes** (Admin continua oculta).

- Nativo: `src/app/(tabs)/_layout.tsx` perde o trigger `history` e ganha `conversas` entre Conquistas e Perfil. Ícone `bubble.left.and.bubble.right` / `chat` (conferir se o glifo existe em `src/components/icon-glyphs.ts`; senão rodar `node scripts/build-icon-font.mjs`, há teste que cobra). Selo: total de não lidas.
- Web: `src/app/(tabs)/_layout.web.tsx`, mesma troca no array `TABS`; o rótulo acessível do Conversas fala as não lidas, como o Perfil fala os pedidos.
- Conquistas (`src/app/(tabs)/achievements.tsx`): `SegmentedTabs` com **Histórico · Ranking · Medalhas**, abrindo em Histórico (decisão do Claude). O conteúdo de `history.tsx` sai para um componente (ex.: `src/components/history-panel.tsx`, se for só apresentação, ou um bloco no próprio arquivo da rota se precisar de estado), sem mudar o comportamento.
- `/history` continua existindo como redirecionamento para `/achievements?tab=historico` (o segmento lê o parâmetro), para links antigos não quebrarem. A rota não aparece na barra (`hidden` no nativo, fora do `TABS` no web).

## Telas

`src/app/(tabs)/conversas/`:

- `_layout.tsx`: Stack como o de `amigos`, `useStackHeader("Conversas")`.
- `index.tsx` (lista): um amigo por linha (reusar `PersonRow` ou um irmão dele): foto, nome, prévia da última mensagem ("Chamou sua atenção!", "Figurinha" para os tipos especiais), hora, bolinha de não lida. Ordem: última mensagem mais recente. Amigos sem conversa ainda ficam abaixo, num bloco "Começar conversa". Sem amigos: texto + link para `/amigos/lista`.
- `[id].tsx` (conversa com o amigo `id`): mensagens em balões (minhas à direita), agrupadas por dia; campo de texto com botão de figurinhas, botão de chamar atenção e enviar. Topo: foto e nome (toque abre `/amigos/[id]`) e "digitando…". Abaixo da minha última mensagem lida pelo amigo, "Visto".
- Perfil do amigo (`src/app/(tabs)/amigos/[id].tsx`): botão "Mandar mensagem" quando `relation === "friends"`, abre `/conversas/[id]`.

Se a amizade foi desfeita: histórico visível, campo trocado por uma linha "Vocês não são mais amigos." Bloqueio: a conversa some para os dois, mas as mensagens não são apagadas; se desbloquear, voltam só para leitura, já que o bloqueio desfaz a amizade (decisão do Claude: nada se perde de vez).

## Chamar atenção

- Quem manda: botão no campo; desabilita por 30 s após usar (o servidor também recusa, ver abaixo).
- Quem recebe, com a conversa aberta: a tela treme (Reanimated, ~0,5 s), `Haptics.notificationAsync`, som próprio (via `src/services/sound.ts`, respeitando o ajuste de sons de efeito que já existe).
- Com o app aberto em outra tela: só vibra e conta como não lida (decisão do Claude). Com o app fechado: push "{nome} chamou sua atenção!".
- Na conversa aparece como linha central: "Você chamou a atenção" / "{nome} chamou sua atenção".
- Respeitar "reduzir movimento": sem tremor, só vibração e som.

## Figurinhas

- Pacote fixo no app, umas 24, em `assets/` com a lista e os nomes em `src/domain/stickers.ts` (id, rótulo acessível). A mensagem guarda só o id; id desconhecido mostra "Figurinha".
- Origem: arte própria, ou uma coleção de licença compatível com uso comercial (ex.: Fluent Emoji, MIT; OpenMoji, CC BY-SA 4.0, que pede crédito). Créditos na tela legal se a licença pedir. Decisão do builder, anotar no PR.
- Tema: o clima dos emoticons antigos mais algumas do app ("bebe água!", "cadê sua sequência?"), sem promessas de saúde.

## Dados (Supabase)

Novo arquivo `supabase/chat.sql`, rodado depois de `social.sql` (usa `blocked_between`, `relation_of`, `require_access`, `queue_social_push`). Passo novo em `docs/supabase-setup.md`.

- `messages`: `id uuid pk default gen_random_uuid()`, `sender uuid`, `recipient uuid` (ambos `references auth.users on delete cascade`), `kind text check (kind in ('text','sticker','nudge'))`, `body text` (texto até 2000 caracteres; id da figurinha), `created_at timestamptz default now()`. Índice em `(least(sender,recipient), greatest(sender,recipient), created_at desc)`.
- `chat_reads`: `(user_id, peer_id) pk`, `read_at timestamptz`. Dá o "visto" e as não lidas.
- `message_reports`: `message_id`, `reporter`, `created_at`, pk `(message_id, reporter)`. Versão 1: o admin consulta no painel do Supabase (decisão do Claude); tela de admin fica para depois.
- RLS em `messages`: select só se `auth.uid()` é sender ou recipient e `not blocked_between(sender, recipient)`. Sem policy de insert/update/delete: tudo entra por função.
- RLS em `chat_reads`: select das linhas em que sou `user_id` ou `peer_id`; escrita só por função.
- Funções `security definer`, no padrão de `social.sql` (`set search_path = ''`, `require_access()`, permissões revogadas das internas):
  - `send_message(to uuid, kind text, body text)`: exige amizade aceita e sem bloqueio; valida tamanho e kind; limite de 30 mensagens por minuto por remetente; `nudge` no máximo 1 a cada 30 s por par; enfileira push com `queue_social_push(..., 'msg', ...)`, que monta o id `social:msg:<remetente>` (o prefixo `social:` é o que `unqueuePush` em `src/services/web-push.ts` preserva ao limpar lembretes; um aviso por remetente substitui o anterior; texto: prévia curta ou "chamou sua atenção!"). O `url` do push deve abrir `/conversas/<remetente>`: hoje `queue_social_push` fixa `/amigos`, então ganhar um parâmetro de url (com default) sem quebrar quem já chama.
  - `mark_read(peer uuid)`: upsert em `chat_reads` com `now()` e apaga da `push_queue` o `social:msg:<peer>` ainda não enviado, para quem já leu não receber aviso atrasado (decisão do Claude).
  - `my_conversations()`: por amigo (e ex-amigo com histórico, sem bloqueio): última mensagem, não lidas, `read_at` do outro. Não lidas de ex-amigo contam no selo até abrir a conversa (decisão do Claude).
  - `report_message(id uuid)`.
- Realtime: `messages` na publicação `supabase_realtime`; o app assina `postgres_changes` de insert (o RLS filtra o que cada um recebe). "digitando…" por Realtime Broadcast num canal privado por par, autorizado por policy em `realtime.messages` (consultar a doc atual do Supabase Realtime Authorization). Se o canal privado não sair, "digitando…" cai fora antes do resto.
- Paginação: carregar as 50 últimas, mais antigas ao rolar para cima.

## Acesso (plano)

Conversas segue a mesma regra de Amigos (decisão do Claude, alinhada ao plano do usuário de liberar o app agora e cobrar depois): `send_message`, `my_conversations`, `mark_read` e `report_message` chamam `require_access()`; o select de `messages` exige também `public.has_access()` de quem lê, para quem está sem plano não ler nem receber ao vivo. Sem plano, a aba mostra o convite para renovar (como Amigos); amigos ainda podem mandar mensagem para quem está sem plano, que fica esperando até a pessoa voltar. O usuário pretende liberar o app para todos por enquanto (trabalho separado, mexe em `has_access()`); como o chat só usa essas funções, ele fica liberado junto, sem mudança aqui.

## Código do app (camadas do AGENTS.md)

- `src/domain/chat.ts`: tipos, `parseMessage`/`parseConversations` (como `parseFriendsOverview`), agrupamento por dia, prévia da última mensagem, cálculo de "visto". Testes em `src/domain/__tests__/chat.test.ts`.
- `src/services/chat.ts`: chamadas RPC, assinatura Realtime, broadcast de digitação. Erros pelo `serviceError` existente.
- `src/state/use-chat.ts`: `useConversations()` (com total de não lidas compartilhado para o selo, como `useIncomingCount`) e `useConversation(peerId)`.
- Componentes novos em `src/components` só apresentacionais (balão, linha de sistema, seletor de figurinhas, campo da conversa).

## Critérios de aceite

1. A barra mostra Hoje, Conquistas, Conversas, Perfil, Ajustes no nativo e no web; `/history` abre Conquistas em Histórico.
2. Dois amigos trocam texto com emoji e figurinha; aparece na outra ponta sem recarregar.
3. Chamar atenção treme a conversa aberta do outro, vibra e toca som; o segundo em menos de 30 s é recusado.
4. Não lidas aparecem no selo e somem ao abrir a conversa; "Visto" aparece depois que o outro abre.
5. Quem não é amigo não consegue enviar (testar a função no SQL) nem ler (RLS).
6. Bloqueio esconde a conversa dos dois; desfazer amizade deixa só leitura.
7. Com o PWA fechado, chega push e o toque abre a conversa.
8. `npm run check` passa.

## Deixado para o builder

Visual dos balões e do seletor (seguir `docs/design.md`), duração e amplitude do tremor, escolha final do pacote de figurinhas, nome dos componentes, texto exato das prévias.

## Riscos conhecidos

- Push leva até 1 minuto (a fila roda de minuto em minuto) e só existe no PWA; no app nativo fechado não chega aviso, igual aos pedidos de amizade hoje.
- Realtime conta conexões no plano do Supabase.
