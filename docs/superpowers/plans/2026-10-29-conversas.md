# Conversas — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Objetivo:** aba Conversas com chat 1:1 entre amigos no clima do MSN (chamar atenção, figurinhas, "digitando…", "visto"), e Histórico movido para dentro de Conquistas.

**Arquitetura:** o banco ganha `supabase/chat.sql` (tabelas `messages`, `chat_reads`, `message_reports`, RLS e funções `security definer`), que é a única porta de escrita. O app lê e assina por Supabase Realtime (`postgres_changes` para mensagens e leituras, Broadcast em canal privado para "digitando…"). Regras puras em `src/domain/chat.ts` e `src/domain/stickers.ts`, chamadas em `src/services/chat.ts`, estado em `src/state/use-chat.ts`, telas em `src/app/(tabs)/conversas/`.

**Stack:** Expo SDK 58, RN 0.88, TypeScript strict, Expo Router, Supabase (Postgres, RLS, Realtime), Reanimated 4, expo-haptics, expo-audio, Jest (jest-expo).

**Spec:** [docs/superpowers/specs/2026-10-29-conversas-design.md](../specs/2026-10-29-conversas-design.md). Leia o spec, `AGENTS.md` e `docs/design.md` antes de começar.

## Restrições globais

- **Sem commits.** O dono pede commit à parte (AGENTS.md). Cada tarefa termina com `npm run check` limpo.
- **Camadas do ESLint:** `src/domain` puro; `src/components` não importa `services` nem `app`; `src/services` não importa UI nem `state`; `console` só em `src/services/log.ts`; arquivos com no máximo 350 linhas.
- **Dependências:** nenhuma nova. `@supabase/supabase-js` já traz Realtime. Se precisar de algo, `npx expo install`.
- **Expo/Supabase:** consultar `https://docs.expo.dev/versions/v58.0.0/` e a doc atual do Supabase Realtime (Context7) antes de usar API; não confiar em memória.
- **Textos do app** em português do Brasil, sem emoji nos textos fixos (o conteúdo que o usuário digita aceita tudo que o teclado oferece). Alvos de toque de 44 pt, `accessibilityLabel` em português.
- **SQL:** toda função `security definer`, `set search_path = ''`, `revoke … from public, anon` + `grant … to authenticated` (internas: revoke de todos); arquivo roda de novo sem erro; erros em português com `errcode = '42501'`.
- **Acesso:** funções de chat chamam `public.require_access()`; o select de `messages` exige `public.has_access()`. Com "App liberado para todos" ligado, todos passam.
- **Valores fixos:** texto até 2000 caracteres (`char_length`), vazio só com espaços é recusado; 30 mensagens por minuto por remetente; chamar atenção 1 a cada 30 s por par; 50 mensagens por página; até 24 figurinhas.
- **Push:** ids sempre `social:msg:<remetente>` via `queue_social_push` (o prefixo `social:` é o que `unqueuePush` em `src/services/web-push.ts` preserva).
- **Assets:** nada da Microsoft/MSN (emoticons, sons, nome). Figurinhas e som próprios ou de licença compatível com uso comercial; créditos em `src/app/legal/` se a licença pedir.
- **Supabase:** o implementador não tem acesso ao projeto. SQL é verificado por leitura e por `supabase/tests/chat.sql`, que o dono roda.

## Review Focus

1. Mensagem chegando de alguém que não está na lista carregada (amizade nova, ex-amigo): a lista de conversas deve recarregar, não ignorar.
2. Duas abas/aparelhos da mesma conta: a mensagem que eu enviei aparece uma vez só (dedupe por `id` entre o retorno do `send` e o evento Realtime).
3. Reconexão (app volta do fundo, rede cai): ao voltar, recarregar a página atual e as conversas; nada some nem duplica.
4. Texto com emoji, quebra de linha e 2000 caracteres exatos passa; 2001 é recusado no SQL e o app avisa antes de enviar.
5. Chamar atenção duplo-toque rápido: só um envio; o segundo dentro de 30 s mostra a espera e o SQL recusa se chegar.

Cada item tem teste na tarefa dona (marcado com **RF-n**).

---

### Tarefa 1: Abas — Histórico dentro de Conquistas e aba Conversas vazia

**Arquivos:**
- Criar: `src/components/history-panel.tsx` (conteúdo de `history.tsx` sem o `Screen`; recebe `data` por prop, para continuar apresentacional)
- Modificar: `src/app/(tabs)/history.tsx` (vira `<Redirect href="/achievements?tab=historico" />`)
- Modificar: `src/app/(tabs)/achievements.tsx` (segmentos `historico | ranking | medalhas`, padrão `historico`, lê `useLocalSearchParams<{ tab?: string }>()`)
- Modificar: `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/_layout.web.tsx`
- Criar: `src/app/(tabs)/conversas/_layout.tsx`, `src/app/(tabs)/conversas/index.tsx` (por ora: `Screen title="Conversas"` com "Em breve.")
- Modificar: `src/components/icon-glyphs.ts` via `node scripts/build-icon-font.mjs`

**Interfaces:**
- Produz: rota `/conversas` e `/conversas/[id]` (Tarefa 6); `HistoryPanel({ data }: { data: AppData })`.

- [ ] **Passo 1:** mover o corpo de `HistoryScreen` para `HistoryPanel`; `achievements.tsx` usa `TABS = [{ value: "historico", label: "Histórico" }, { value: "ranking", label: "Ranking" }, { value: "medalhas", label: "Medalhas" }]`; valor inicial = `tab` da URL se for um dos três, senão `"historico"`. O título da tela continua "Conquistas"; o `LevelCard` fica só nos segmentos Ranking e Medalhas (decisão do builder se ficar nos três).
- [ ] **Passo 2:** nativo: `NativeTabs.Trigger name="history" hidden` e novo trigger `conversas` entre `achievements` e `amigos`, rótulo "Conversas", ícone `sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} md="chat"`. Web: tirar `history` de `TABS`, incluir `{ key: "conversas", fx: "pop", label: "Conversas", ios: "bubble.left.and.bubble.right", android: "chat", href: "/conversas" }` antes de `amigos`. Selo fica para a Tarefa 6.
- [ ] **Passo 3:** `node scripts/build-icon-font.mjs` (o teste `icon-glyphs.test.ts` cobra o glifo `chat`).
- [ ] **Passo 4:** `npm run check` → 0 errors, todos os testes passam. No navegador (`preview_start habitus-web`), `/history` abre Conquistas no segmento Histórico; a barra mostra Hoje, Conquistas, Conversas, Perfil, Ajustes.
- [ ] **Passo 5:** `PRODUCT.md` e `docs/architecture.md`: abas novas.

### Tarefa 2: Banco — `supabase/chat.sql`

**Arquivos:**
- Criar: `supabase/chat.sql`, `supabase/tests/chat.sql`
- Modificar: `supabase/social.sql` (`queue_social_push` ganha `url text default '/amigos'` como 4º parâmetro; atualizar a lista de permissões para a nova assinatura e dar `drop function if exists public.queue_social_push(uuid, text, text)` antes)
- Modificar: `docs/supabase-setup.md` (passo novo "Conversas", depois de `social.sql`; avisa para rodar `social.sql` de novo)

**Interfaces (produz, usadas pela Tarefa 4):**
- `messages(id uuid, sender uuid, recipient uuid, kind text, body text, created_at timestamptz)`; select direto pelo app com RLS.
- `send_message(to_user uuid, msg_kind text, msg_body text) returns jsonb` → a linha inserida (`id, sender, recipient, kind, body, created_at`).
- `mark_read(peer uuid) returns void`.
- `my_conversations() returns jsonb` → array de `{ peer: { id, name, username, level, avatar_url }, friends: boolean, last: <linha de messages> | null, unread: int, peer_read_at: timestamptz | null }`, ordenado por `last.created_at desc nulls last`, depois `name`. Inclui todo amigo aceito (mesmo sem mensagem) e ex-amigos com histórico; exclui bloqueios.
- `report_message(msg uuid) returns void`.
- `chat_reads(user_id, peer_id, read_at)` legível pelos dois lados.
- `messages` e `chat_reads` na publicação `supabase_realtime`.
- Policy em `realtime.messages` para tópicos `chat:<menor uuid>:<maior uuid>`: só os dois, amigos, sem bloqueio (conferir na doc do Realtime Authorization o nome de `realtime.topic()` e o `extension = 'broadcast'`).

- [ ] **Passo 1: escrever `supabase/tests/chat.sql` primeiro** (estilo de `supabase/tests/ranking.sql`: bloco `do $$ … $$` que termina com `raise notice 'chat ok'`). Simula usuários com `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>"}'` dentro de uma transação com `rollback` no fim. Casos:
  - amigos A e B: `send_message(B, 'text', 'oi 😀\nlinha 2')` devolve a linha; B a lê em `messages`; C (não amigo) não lê (0 linhas).
  - **RF-4:** texto de 2000 caracteres passa; 2001 falha com 42501; `'   '` falha; `kind = 'foto'` falha.
  - A para C (não amigo) falha; depois de `block_user`, `messages` do par some para os dois; depois de `remove_friend`, o histórico segue legível e `send_message` falha.
  - **RF-5:** dois `nudge` seguidos de A para B: o segundo falha; nudge de B para A no mesmo instante passa (limite é por remetente no par).
  - 31ª mensagem no mesmo minuto falha.
  - `mark_read(A)` por B: `my_conversations()` de B mostra `unread = 0`; o de A mostra `peer_read_at` preenchido; a linha `social:msg:<A>` de B some da `push_queue` (se `push_queue` existir).
  - `insert into messages` direto pelo app falha (sem policy).
- [ ] **Passo 2:** escrever `chat.sql` (tabelas com `if not exists`, índice do par por `least/greatest` + `created_at desc`, RLS, funções, publicação com bloco que ignora "já é membro", policy do Realtime). `send_message` enfileira push com `queue_social_push(to_user, 'msg', '{nome}: ' || prévia, '/conversas/' || auth.uid())`; prévia: texto cortado em 80 caracteres, "mandou uma figurinha", ou "{nome} chamou sua atenção!" para `nudge`.
- [ ] **Passo 3:** reler o arquivo contra as Restrições globais (search_path, revoke/grant, reexecutável). O dono roda `chat.sql` e `tests/chat.sql` no SQL Editor; esperado `NOTICE: chat ok`.

### Tarefa 3: Domínio — `src/domain/chat.ts` e `src/domain/stickers.ts`

**Arquivos:**
- Criar: `src/domain/chat.ts`, `src/domain/stickers.ts`, `src/domain/__tests__/chat.test.ts`

**Interfaces (produz):**
```ts
export type MessageKind = "text" | "sticker" | "nudge";
export interface Message { id: string; sender: string; recipient: string; kind: MessageKind; body: string; createdAt: string }
export interface ChatPeer { id: string; name: string; username: string; level: number; avatarUrl: string | null }
export interface Conversation { peer: ChatPeer; friends: boolean; last: Message | null; unread: number; peerReadAt: string | null }
export interface DayGroup { day: string; label: string; messages: Message[] }
export const MAX_TEXT = 2000;
export const NUDGE_COOLDOWN_MS = 30_000;
export const PAGE_SIZE = 50;
export function parseMessage(row: unknown): Message | null;
export function parseConversations(value: unknown): Conversation[];
export function previewOf(m: Message, me: string): string;
export function groupByDay(messages: readonly Message[], today: Date): DayGroup[];
export function seenMessageId(messages: readonly Message[], me: string, peerReadAt: string | null): string | null;
export function nudgeWaitMs(messages: readonly Message[], me: string, now: Date): number;
export function mergeMessages(current: readonly Message[], incoming: readonly Message[]): Message[];
export function textProblem(text: string): string | null;
export function unreadTotal(conversations: readonly Conversation[]): number;
// stickers.ts
export interface Sticker { id: string; label: string }
export const STICKERS: readonly Sticker[];
export function stickerLabel(id: string): string;
```

- [ ] **Passo 1: testes** em `chat.test.ts`:
  - `parseMessage` lê `{ id, sender, recipient, kind: "text", body, created_at }` e devolve `null` para `kind: "foto"` ou sem `id`.
  - `parseConversations` converte `avatar_url` com `photoLink`, descarta itens inválidos, `[]` para não-array.
  - `previewOf`: texto meu → `"Você: oi"`; texto do outro → `"oi"`; sticker → `"Figurinha"`; nudge meu → `"Você chamou a atenção"`; nudge do outro → `"Chamou sua atenção!"`; texto com quebra de linha vira uma linha só.
  - `groupByDay` com `today = 2026-10-29T15:00` (fuso do Jest, America/New_York): rótulos `"Hoje"`, `"Ontem"`, `"27 de outubro"`; ordem cronológica dentro do grupo.
  - `seenMessageId`: última mensagem minha com `createdAt <= peerReadAt`; `null` sem `peerReadAt` ou sem mensagem minha.
  - `nudgeWaitMs`: meu nudge há 10 s → `20_000`; há 31 s → `0`; nudge do outro não conta.
  - **RF-2:** `mergeMessages` com a mesma `id` duas vezes deixa uma; resultado ordenado por `createdAt` crescente.
  - **RF-4:** `textProblem("a".repeat(2000))` → `null`; `"a".repeat(2001)` → `"Mensagem muito longa (máx. 2000)."`; `"  \n "` → `"Escreva uma mensagem."`; `"😀"` → `null`.
  - `unreadTotal` soma `unread`.
  - `stickerLabel("x-desconhecida")` → `"Figurinha"`; ids de `STICKERS` únicos e em `[a-z0-9-]`.
- [ ] **Passo 2:** `npx jest src/domain/__tests__/chat.test.ts` → falha (módulo não existe).
- [ ] **Passo 3:** implementar. `textProblem` conta com `[...text].length` para não cortar emoji ao meio na contagem do app (o SQL usa `char_length`, que também conta code points). Rótulo de dia usa nomes de mês minúsculos como `MONTHS` em `src/app/(tabs)/index.tsx` (mover para `src/domain/time.ts` se for reusar).
- [ ] **Passo 4:** `npx jest src/domain/__tests__/chat.test.ts` → passa; `npm run check` limpo.

### Tarefa 4: Serviço e estado — `src/services/chat.ts`, `src/state/use-chat.ts`

**Arquivos:**
- Criar: `src/services/chat.ts`, `src/state/use-chat.ts`

**Interfaces:**
- Consome: Tarefa 2 (funções SQL), Tarefa 3 (tipos e `parse*`, `mergeMessages`).
- Produz:
```ts
// services/chat.ts
export function listConversations(): Promise<Conversation[]>;
export function loadMessages(peer: string, before?: string): Promise<Message[]>; // até PAGE_SIZE, crescente
export function sendMessage(peer: string, kind: MessageKind, body: string): Promise<Message>;
export function markRead(peer: string): Promise<void>;
export function reportMessage(id: string): Promise<void>;
export function subscribeInbox(me: string, on: { message: (m: Message) => void; read: (peer: string, readAt: string) => void; reconnect: () => void }): () => void;
export function joinTyping(me: string, peer: string, onTyping: (typing: boolean) => void): { setTyping: (on: boolean) => void; leave: () => void };
// state/use-chat.ts
export function useUnreadCount(): number;
export function useConversations(): { conversations: Conversation[] | null; loading: boolean; error: string | null; reload: () => Promise<void> };
export function useConversation(peer: string): { messages: Message[]; peerReadAt: string | null; typing: boolean; nudges: number; error: string | null; send: (kind: MessageKind, body: string) => Promise<void>; loadOlder: () => Promise<void>; setTyping: (on: boolean) => void; report: (id: string) => Promise<void> };
```

- [ ] **Passo 1:** `services/chat.ts`: RPC pelo padrão `call()` de `src/services/social.ts` e erros por `serviceError`. `loadMessages` faz `from("messages").select("*").or(par)` com `lt("created_at", before)`, `order desc`, `limit(PAGE_SIZE)`, e inverte. `subscribeInbox` abre um canal com `postgres_changes` `INSERT` em `messages` filtrado por `recipient=eq.<me>` e `INSERT/UPDATE` em `chat_reads` filtrado por `peer_id=eq.<me>`; chama `reconnect` quando o status volta a `SUBSCRIBED` depois de cair. `joinTyping` usa Broadcast no tópico privado `chat:<menor>:<maior>`, evento `typing`, e considera "parou" após 4 s sem evento.
- [ ] **Passo 2:** `use-chat.ts`: guarda as conversas num store compartilhado (`useSyncExternalStore`, igual a `src/state/use-friends.ts`), uma assinatura `subscribeInbox` para o app todo enquanto há sessão. Mensagem nova: atualiza a conversa do remetente; **RF-1:** se o remetente não está na lista, chama `reload()`. `reconnect` e `AppState` voltando a `active`: `reload()` e recarregar a conversa aberta (**RF-3**). `useConversation`: ao montar e a cada mensagem recebida com a tela focada, `markRead(peer)`; `send` faz merge do retorno com `mergeMessages` (**RF-2**); nudge recebido incrementa `nudges`.
- [ ] **Passo 3:** `npm run check` limpo. (Sem teste de unidade aqui: a lógica decidível está no domínio; o resto é verificado na Tarefa 6.)

### Tarefa 5: Figurinhas e som

**Arquivos:**
- Criar: `assets/stickers/<id>.png` (até 24, quadradas, 256 px, fundo transparente), `src/components/sticker-image.tsx`, `src/components/__tests__/sticker-image.test.ts`
- Modificar: `src/domain/stickers.ts` (lista final), `src/services/sound.ts` (`playNudge()`), `assets/sounds/nudge.mp3`
- Modificar (se a licença pedir): tela de créditos em `src/app/legal/`

**Interfaces:**
- Produz: `STICKER_SOURCES: Record<string, number>` e `StickerImage({ id, size }: { id: string; size: number })` (id desconhecido mostra o rótulo "Figurinha"); `playNudge(): void` (respeita `effectsOn`).

- [ ] **Passo 1: teste** `sticker-image.test.ts`: toda `STICKERS[i].id` tem chave em `STICKER_SOURCES` e vice-versa.
- [ ] **Passo 2:** `npx jest src/components/__tests__/sticker-image.test.ts` → falha.
- [ ] **Passo 3:** escolher a arte (própria, Fluent Emoji MIT, ou OpenMoji CC BY-SA 4.0 com crédito), exportar PNGs, preencher `STICKERS` com rótulos em português (ex.: `"bebe-agua"` → "Bebe água!"; `"cade-sequencia"` → "Cadê sua sequência?"), mapa de `require`. Som curto (< 1 s) próprio ou CC0. Registrar origem e licença no relatório da tarefa.
- [ ] **Passo 4:** teste passa; `npm run check` limpo.

### Tarefa 6: Telas de Conversas, selo e "Mandar mensagem"

**Arquivos:**
- Modificar: `src/app/(tabs)/conversas/index.tsx` (lista real)
- Criar: `src/app/(tabs)/conversas/[id].tsx`, `src/components/chat-bubble.tsx`, `src/components/chat-composer.tsx`, `src/components/sticker-picker.tsx`, `src/components/conversation-row.tsx`
- Modificar: `src/app/(tabs)/_layout.tsx` e `_layout.web.tsx` (selo `useUnreadCount()`; rótulo web "Conversas, N não lidas"), `src/app/(tabs)/amigos/[id].tsx` (botão "Mandar mensagem" quando `relation === "friends"`, ícone `bubble.left` / `chat`)

**Interfaces:**
- Consome: Tarefa 3 (`groupByDay`, `previewOf`, `seenMessageId`, `nudgeWaitMs`, `textProblem`), Tarefa 4 (hooks), Tarefa 5 (`StickerImage`).
- Produz: `ChatComposer({ onSendText, onSendSticker, onNudge, nudgeWaitMs, disabled, onTyping })`, `ChatBubble({ message, mine, onLongPress })`.

- [ ] **Passo 1:** lista: `ConversationRow` (foto, nome, prévia, hora `formatTime` ou dia curto, bolinha com `unread`); amigos sem conversa num `Section title="Começar conversa"`; sem amigos, texto + `ActionRow` "Encontrar amigos" para `/amigos/lista`.
- [ ] **Passo 2:** conversa: `FlatList` invertida com `groupByDay`; balões meus à direita; figurinha sem balão em 120 pt; nudge como linha central. Topo: avatar e nome (toque → `/amigos/<id>`) e "digitando…". "Visto" abaixo do `seenMessageId`. Rolar ao topo chama `loadOlder`. Toque longo num balão do outro → `confirm("Denunciar mensagem?", …)` → `report`. `friends === false` troca o composer pela linha "Vocês não são mais amigos."
- [ ] **Passo 3:** composer: `TextInput` multiline com `maxLength` não definido (o aviso vem de `textProblem`, mostrado abaixo do campo); botão enviar desabilitado enquanto `textProblem` não for `null` ou um envio estiver em andamento (**RF-5**: o botão de chamar atenção também trava durante o envio, além da espera de `nudgeWaitMs`, que aparece como "Aguarde 12 s"). `onTyping(true)` ao digitar, `false` ao enviar ou apagar tudo.
- [ ] **Passo 4:** `npm run check` limpo.

### Tarefa 7: Chamar atenção (tremor, vibração, som)

**Arquivos:**
- Modificar: `src/app/(tabs)/conversas/[id].tsx`, `src/state/use-chat.ts`
- Criar: `src/components/shake-view.tsx`

**Interfaces:**
- Consome: `nudges` de `useConversation`, `playNudge`.
- Produz: `ShakeView({ trigger, children }: { trigger: number; children: ReactNode })` — treme ~0,5 s quando `trigger` muda (> 0); com `useReducedMotion()` não treme.

- [ ] **Passo 1:** `ShakeView` com Reanimated (`withSequence` de `translateX` ±8 px); envolve o conteúdo da conversa.
- [ ] **Passo 2:** nudge recebido com a conversa aberta: `trigger = nudges`, `Haptics.notificationAsync(Warning)`, `playNudge()`. Recebido com o app aberto em outra tela: só `Haptics` (no `use-chat` global).
- [ ] **Passo 3:** `npm run check` limpo.

### Tarefa 8: Verificação final e docs

- [ ] **Passo 1:** `PRODUCT.md` (Conversas, chamar atenção, figurinhas, regras de bloqueio/desfazer amizade), `docs/architecture.md` (banco, Realtime, camadas novas), `docs/supabase-setup.md` (já na Tarefa 2; conferir).
- [ ] **Passo 2:** `npm run check` → 0 errors; todos os testes passam.
- [ ] **Passo 3:** com o dono rodando `chat.sql` e duas contas de teste (dele): critérios de aceite 1–7 do spec, um por um, no PWA (`npm run dev`) em duas janelas. Registrar o que foi visto; o que não deu para ver vai no relatório como não verificado.
