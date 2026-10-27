# Lembretes pessoais — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Objetivo:** lembretes pessoais com título, descrição, data e hora, antecipações livres e repetição livre; notificações com Feito/Adiar; uma seção na aba Hoje e uma tela "Lembretes" com Próximos e Concluídos.

**Arquitetura:** as regras ficam em `src/domain/reminders.ts` (modelo, recorrência, sanitização, mesclagem) e `src/domain/reminder-text.ts` (rótulos e textos de notificação). `planReminderNotifications` gera os avisos com as vagas que sobram depois de dicas e água. Os lembretes vivem em `AppData.reminders`, que é sincronizado no JSON de `user_data`. A UI usa as peças existentes (`Section`, `ActionRow`, `ToggleSwitch`, `Screen`, `@ncdai/react-wheel-picker`).

**Stack:** Expo SDK 58, RN 0.88, TypeScript strict, Expo Router, expo-notifications, Jest (jest-expo).

**Spec:** [docs/superpowers/specs/2026-10-27-lembretes-design.md](../specs/2026-10-27-lembretes-design.md). Mockups aprovados em `.superpowers/brainstorm/16-1793073519/content/` (`today-section.html` opção B, `form-v2.html`, `all-reminders.html`). Leia o spec, `AGENTS.md` e `docs/design.md` antes de começar.

## Restrições globais

- **Sem commits.** O dono do app pede commit e push à parte (AGENTS.md). Cada tarefa termina com `npm run check` limpo, não com commit.
- Camadas do ESLint: `src/domain` puro; `src/components` não importa `services` nem `app`; AsyncStorage só em `src/services/storage.ts`; `console` só em `src/services/log.ts`. Arquivos com no máximo 350 linhas (`src/state/app-state.tsx` já tem 289, então as ações novas ficam em um hook à parte).
- Interface 100% em português do Brasil. Sem emoji. Sem afirmações médicas.
- Antecipação: 1 a 10080 min (7 dias); no máximo 5 por lembrete; sem duplicatas.
- Repetição: dias 1–365, semanas 1–52, meses 1–12, anos 1.
- Adiar = `SNOOZE_MINUTES` (10).
- Lápides apagadas depois de 30 dias.
- Teto de notificações: `MAX_PENDING_NOTIFICATIONS` (60). Dicas e água primeiro; os lembretes ficam com o que sobra. Horizonte dos lembretes: 60 dias.
- Visual conforme `docs/design.md`: fundo liso, `Section`, sem cards, cores do tema, alvos de 44 pt, `accessibilityLabel` em português, nada animado com "reduzir movimento".
- Dependências só com `npx expo install`. Nenhuma é necessária.
- Use os testes com fuso fixo (`npm test` já usa America/New_York) e datas locais montadas com `new Date(a, m, d, h, min)`.

## Foco da revisão

1. **Dia 31 e 29/02 na repetição.** Um mensal no dia 31 cai em 30/04 e 28/02 e volta ao 31 em maio, sem escorregar. Teste na Tarefa 1.
2. **Horário de verão.** O `at` é um horário local em texto. Uma ocorrência às 17:00 continua às 17:00 depois da troca de fuso no fim de semana. Teste na Tarefa 1, em novembro de 2026 (America/New_York).
3. **Nenhuma vaga sobrando.** Com a água ligada e o teto cheio, os lembretes ficam fora sem erro. Com o horário das dicas inválido, os lembretes ainda são agendados. Testes nas Tarefas 3 e 4.
4. **Antecipação que já passou ou se repete.** Antecipações iguais viram uma só. Uma antecipação maior que o tempo restante é pulada, mas o aviso da hora continua. Testes nas Tarefas 1 e 3.
5. **Apagar em um aparelho e editar em outro.** Vence o `updatedAt` maior nos dois sentidos. Uma lápide nunca é apagada antes de 30 dias, para não ressuscitar o lembrete. Testes na Tarefa 2.

---

### Tarefa 1: Modelo e recorrência (`src/domain/reminders.ts`)

**Arquivos:**
- Criar: `src/domain/reminders.ts`
- Teste: `src/domain/__tests__/reminders.test.ts`

**Interfaces (produz):**

```ts
export type RepeatUnit = "day" | "week" | "month" | "year";
export interface Repeat { every: number; unit: RepeatUnit }
export interface Reminder {
  id: string;
  title: string;          // 1–80 caracteres, sem espaços nas pontas
  notes: string;          // 0–500
  at: string;             // primeira ocorrência, hora local "YYYY-MM-DDTHH:MM" (âncora da repetição)
  leads: number[];        // minutos antes, únicos, ordem decrescente, 1..MAX_LEAD_MINUTES
  repeat: Repeat | null;
  doneAt: number | null;      // ms; só lembrete único: concluído
  doneThrough: string | null; // só com repetição: última ocorrência marcada como feita ("YYYY-MM-DDTHH:MM")
  updatedAt: number;          // ms
  deletedAt: number | null;   // ms; lápide
}
export interface ReminderDraft { title: string; notes: string; at: string; leads: number[]; repeat: Repeat | null }

export const MAX_LEAD_MINUTES = 7 * 24 * 60;
export const MAX_LEADS = 5;
export const MAX_TITLE = 80;
export const MAX_NOTES = 500;
export const REPEAT_LIMITS: Record<RepeatUnit, number> = { day: 365, week: 52, month: 12, year: 1 };
export const TOMBSTONE_DAYS = 30;

export function parseLocal(at: string): Date | null;
export function toLocal(date: Date): string;
export function occurrenceAt(reminder: Pick<Reminder, "at" | "repeat">, n: number): Date;          // n-ésima a partir da âncora
export function occurrencesBetween(reminder: Reminder, from: Date, to: Date): Date[];              // ocorrências pendentes em (from, to]
export function nextOccurrence(reminder: Reminder, now: Date): Date | null;
export function isOverdue(reminder: Reminder, now: Date): boolean;
export function validateDraft(draft: ReminderDraft, now: Date): string | null;
export function buildReminder(draft: ReminderDraft, id: string, now: Date, existing?: Reminder): Reminder;
export function completeReminder(reminder: Reminder, occurrence: string, now: Date): Reminder;
export function reopenReminder(reminder: Reminder, now: Date): Reminder;
export function deleteReminder(reminder: Reminder, now: Date): Reminder;
export function pendingReminders(all: Readonly<Record<string, Reminder>>, now: Date): { reminder: Reminder; at: Date; overdue: boolean }[]; // por data, atrasados primeiro
export function doneReminders(all: Readonly<Record<string, Reminder>>): Reminder[]; // por doneAt decrescente
```

Regras que os testes fixam:
- `occurrenceAt` soma à **âncora** (nunca encadeia). Mês e ano limitam o dia ao último dia do mês de destino.
- `nextOccurrence`:
  - Sem repetição: `at`, se não está feito nem apagado, mesmo que já tenha passado (fica atrasado); senão `null`.
  - Com repetição: a primeira ocorrência estritamente depois de `max(now, doneThrough)`. Apagado dá `null`.
- `occurrencesBetween` respeita as mesmas exclusões. Use o limite de 1000 iterações como trava de laço.
- `isOverdue`: só para lembrete único, com `at < now` e `doneAt === null`.
- `validateDraft` devolve a mensagem em português ou `null`:
  - título vazio: "Dê um nome ao lembrete.";
  - `at` inválido: "Escolha a data e a hora.";
  - lembrete único no passado: "Escolha uma data e hora no futuro.";
  - antecipação fora de 1..10080: "A antecipação vai de 1 minuto a 7 dias.";
  - mais de 5 antecipações: "Use no máximo 5 antecipações.";
  - repetição fora dos limites: "A repetição vai de 1 dia a 1 ano.".
- `buildReminder`:
  - corta título e notas nos limites;
  - ordena e deduplica `leads`;
  - preserva `doneAt` e `doneThrough` do `existing`, exceto quando `at` ou `repeat` mudam: aí zera os dois (editar um concluído para uma data nova o reabre);
  - grava `updatedAt = now`.
- `completeReminder`:
  - único: `doneAt = now`;
  - com repetição: `doneThrough = max(atual, occurrence)`;
  - sempre `updatedAt = now`.
- `deleteReminder`: `deletedAt = updatedAt = now`.

- [ ] **Passo 1: escrever os testes que falham** em `reminders.test.ts`:
  - `occurrenceAt` mensal com âncora `"2026-01-31T09:00"`: n=1 → 28/02/2026 09:00; n=3 → 30/04/2026; n=4 → 31/05/2026.
  - Anual com âncora `"2028-02-29T08:00"`: n=1 → 28/02/2029.
  - Semanal com âncora `"2026-10-27T17:00"` atravessando 01/11/2026 (fim do horário de verão em America/New_York): n=1 → 03/11/2026 17:00 local (`getHours() === 17`).
  - `nextOccurrence`:
    - único feito → `null`;
    - único atrasado → `at`;
    - diário com `doneThrough` igual à ocorrência de hoje → a de amanhã;
    - diário às 17:00 com `now` às 17:05 → amanhã 17:00;
    - apagado → `null`.
  - `validateDraft` com cada mensagem acima, e `null` para um rascunho válido.
  - `buildReminder` deduplica `[60, 60, 1440]` → `[1440, 60]`; editar `at` de um concluído zera `doneAt`.
  - `pendingReminders` põe um atrasado antes de um de amanhã e exclui concluídos e apagados. `doneReminders` ordena por `doneAt` decrescente.
- [ ] **Passo 2:** `npx jest src/domain/__tests__/reminders.test.ts` → FAIL ("Cannot find module '../reminders'").
- [ ] **Passo 3:** implementar `src/domain/reminders.ts`. Use os helpers de `./time` (`addDays`) e monte as datas com campos locais (`new Date(y, m, d, h, min)`), nunca somando milissegundos.
- [ ] **Passo 4:** rodar o mesmo comando → PASS.

### Tarefa 2: Dados e sincronização

**Arquivos:**
- Modificar: `src/domain/reminders.ts` (sanitizar e mesclar)
- Modificar: `src/domain/app-data.ts` (campo `reminders`)
- Modificar: `src/domain/sync.ts`
- Teste: `src/domain/__tests__/reminders.test.ts`
- Teste: `src/domain/__tests__/app-data.test.ts`
- Teste: `src/domain/__tests__/sync.test.ts`

**Interfaces:**
- Consome: `Reminder` e os limites da Tarefa 1.
- Produz:
  - `sanitizeReminders(raw: unknown, now?: Date): Record<string, Reminder>`;
  - `mergeReminders(local: Record<string, Reminder>, remote: Record<string, Reminder>): Record<string, Reminder>`;
  - `AppData.reminders: Record<string, Reminder>` (padrão `{}`).

- [ ] **Passo 1: testes que falham:**
  - `sanitizeReminders` descarta itens sem título, com `at` inválido, com chave diferente do `id` e lápides com mais de 30 dias. Ele limita `leads` e `repeat` aos limites e mantém os válidos.
  - `mergeReminders`:
    - vence o `updatedAt` maior em edição × lápide, nos dois sentidos;
    - no empate vence o local;
    - ids presentes só de um lado entram.
  - `sanitizeData` de um JSON antigo (sem `reminders`) devolve `reminders: {}`.
  - `mergeData` mescla os lembretes, e um `resetAt` mais novo descarta os lembretes do outro lado.
- [ ] **Passo 2:** `npx jest src/domain/__tests__/reminders.test.ts src/domain/__tests__/app-data.test.ts src/domain/__tests__/sync.test.ts` → FAIL.
- [ ] **Passo 3:** implementar.
  - `app-data.ts`: o campo entra no tipo, em `defaultData()` e em `sanitizeData` (`reminders: sanitizeReminders(raw.reminders)`). Atualize também o comentário da chave de dados em `docs/architecture.md` na Tarefa 8.
  - `sync.ts`: `reminders: mergeReminders(local.reminders, remote.reminders)`.
- [ ] **Passo 4:** mesmo comando → PASS.

### Tarefa 3: Textos e plano de notificações

**Arquivos:**
- Criar: `src/domain/reminder-text.ts`
- Teste: `src/domain/__tests__/reminder-text.test.ts`
- Modificar: `src/domain/notification-plan.ts`
- Modificar: `src/domain/notification-actions.ts`
- Teste: `src/domain/__tests__/notification-plan.test.ts`
- Criar teste: `src/domain/__tests__/notification-actions.test.ts`

**Interfaces:**
- Consome: Tarefas 1 e 2.
- Produz, em `reminder-text.ts`:
  - `formatLead(minutes: number): string`:
    - `16` → "16 min";
    - `90` → "1 h 30";
    - `60` → "1 h";
    - `1440` → "1 dia";
    - `2880` → "2 dias";
    - `1530` → "1 dia e 1 h 30".
  - `formatRepeat(repeat: Repeat): string`:
    - `{1,"day"}` → "todo dia";
    - `{3,"day"}` → "a cada 3 dias";
    - `{1,"week"}` → "toda semana";
    - `{2,"week"}` → "a cada 2 semanas";
    - `{1,"month"}` → "todo mês";
    - `{6,"month"}` → "a cada 6 meses";
    - `{1,"year"}` → "todo ano".
  - `whenLabel(at: Date, now: Date): string`:
    - mesmo dia → "Hoje às 17:00";
    - dia seguinte → "Amanhã às 09:30";
    - outro dia → "Ter, 3 nov às 17:00".
  - `groupLabel(at: Date, now: Date, overdue: boolean): string`:
    - atrasado → "Atrasados";
    - mesmo dia → "Hoje";
    - dia seguinte → "Amanhã";
    - outro dia do mesmo ano → nome do mês ("Novembro");
    - outro ano → "Janeiro de 2027".
  - `formatReminderCountdown(ms: number): string`:
    - ≥ 1 dia → "1 dia" ou "3 dias";
    - senão "H:MM:SS" com horas, ou "MM:SS";
    - ≤ 0 → "Agora".
  - `reminderSummary(r: Reminder): string`, juntando com " · ":
    - repetição: "↻ " + `formatRepeat`;
    - antecipações: "antecipa " + rótulos unidos por ", " e " e " no último.
  - `alertTitle(title: string, occurrence: Date, alertAt: Date): string`:
    - lead 0 → "Agora: {title}";
    - mesmo dia → "Daqui a {formatLead(diff)}: {title}";
    - senão `whenLabel(occurrence, alertAt)` + ": {title}".
  - `alertBody(r: Reminder, occurrence: Date, alertAt: Date, lead: number): string`:
    - lead 0 → `r.notes` ou "Às HH:MM";
    - antecipado → `whenLabel(occurrence, alertAt)`.
- Produz, em `notification-plan.ts`:
  - `PlannedKind` ganha `"reminder"`;
  - `PlannedNotification` ganha `reminderId?: string; occurrence?: string; lead?: number`;
  - `export const REMINDER_HORIZON_DAYS = 60;`
  - `planReminderNotifications(reminders: Readonly<Record<string, Reminder>>, now: Date, options: { slots: number; until?: Date }): PlannedNotification[]`. Gera, para cada ocorrência em `(now, now + 60 dias]`, um aviso por antecipação mais o da hora (lead 0). Pula os que caem em `≤ now` ou depois de `until`. Ordena por data e corta em `max(slots, 0)`. Id: `rem:{id}:{occurrence}:{lead}`.
  - `reminderSnooze(item: PlannedNotification, now: Date): PlannedNotification`. Id: `rem:{id}:snooze:{now ms}`. Fica a 10 min, com o mesmo texto e `lead` igual.
  - `reminderUrl` → `/lembretes/{reminderId}` quando `kind === "reminder"`.
- Produz, em `notification-actions.ts`:
  - `REMINDER_CATEGORY = "reminder"` (Feito/Adiar) e `REMINDER_LEAD_CATEGORY = "reminder-lead"` (Ok/Adiar);
  - `ACTION_OK = "ok"`;
  - o payload ganha `kind: "reminder"`, `reminderId`, `occurrence` e `lead`;
  - `ResponseIntent` ganha:
    - `{ type: "open-reminder"; reminderId: string }`;
    - `{ type: "reminder-done"; reminderId: string; occurrence: string }`;
    - `{ type: "reminder-snooze"; reminderId: string; occurrence: string; lead: number }`;
    - `{ type: "dismiss" }`.

- [ ] **Passo 1: testes que falham:**
  - todos os exemplos de texto acima;
  - um lembrete às 17:00 com leads `[90]` e `now` às 12:00 gera ids `rem:a:2026-10-27T17:00:90` (15:30) e `...:0` (17:00);
  - com `now` às 16:00, só o de 17:00;
  - um lead de 60 e um de 90 no mesmo lembrete geram 3 avisos;
  - `slots: 0` → `[]`;
  - `slots: 2` com 5 avisos → os 2 mais próximos;
  - nada depois de `until`;
  - `pushRow` de um aviso de lembrete leva `url: "/lembretes/a"`;
  - `isOneOffId` é verdadeiro para o id do `reminderSnooze`;
  - `interpretResponse("done", payloadDeLembrete)` → `reminder-done`;
  - `"snooze"` → `reminder-snooze`;
  - `"ok"` → `dismiss`;
  - toque padrão → `open-reminder`;
  - payload de dica continua igual.
- [ ] **Passo 2:** `npx jest src/domain` → FAIL.
- [ ] **Passo 3:** implementar. `planNotifications` não muda; a soma acontece no serviço (Tarefa 4).
- [ ] **Passo 4:** `npx jest src/domain` → PASS.

### Tarefa 4: Serviços de notificação e armazenamento

**Arquivos:**
- Modificar: `src/services/notifications.ts`
- Modificar: `src/services/notification-responses.ts`
- Modificar: `src/services/storage.ts`
- Modificar: `src/services/web-reminders.ts` (só se for preciso: ele já usa `reminderUrl`)

**Interfaces:**
- Consome: Tarefa 3.
- Produz:
  - `cancelReminder(id: string): Promise<void>` cancela os ids que começam com `rem:{id}:`;
  - `scheduleReminderSnooze(reminderId: string, occurrence: string, lead: number, data: AppData, now?: Date): Promise<void>`;
  - `markReminderDoneInStorage(reminderId: string, occurrence: string): Promise<AppData>`.

- [ ] **Passo 1:** `configureNotifications` registra as duas categorias novas. A da hora tem `done` "Feito" e `snooze` "Adiar 10 min"; a antecipada tem `ok` "Ok" e `snooze` "Adiar 10 min". As opções `opensAppToForeground` seguem a mesma regra das dicas. `schedule()` grava o payload completo e escolhe a categoria: `lead === 0` usa `REMINDER_CATEGORY`, senão `REMINDER_LEAD_CATEGORY`.
- [ ] **Passo 2:** em `rescheduleAll`:
  - Calcule `tips` como hoje (vazio quando `!result.ok`).
  - Depois, `reminders = planReminderNotifications(data.reminders, now, { slots: MAX_PENDING_NOTIFICATIONS - tips.length, until })`.
  - Agende `[...tips, ...reminders]`.
  - O retorno antecipado por `!result.ok` deixa de bloquear os lembretes. `!data.onboarded` e a falta de permissão continuam bloqueando tudo.
  - Atualize o comentário da função.
- [ ] **Passo 3:** em `applyResponse`:
  - `reminder-done` chama `markReminderDoneInStorage` e `cancelWhere` no prefixo `rem:{id}:{occurrence}:`;
  - `reminder-snooze` agenda `reminderSnooze` a partir da ocorrência lida do storage;
  - `dismiss` só descarta a notificação.
  - A trava `handled` vale para os três.
- [ ] **Passo 4:** `npm run check` → tudo passa.

### Tarefa 5: Estado e roteamento

**Arquivos:**
- Criar: `src/state/use-reminders.ts`
- Modificar: `src/state/app-state.tsx`
- Modificar: `src/state/use-notification-routing.ts`

**Interfaces:**
- Consome: Tarefas 1, 2 e 4.
- Produz, em `useAppState()`:
  - `saveReminder(draft: ReminderDraft, id?: string): Promise<string | null>`: devolve a mensagem de erro ou `null`;
  - `completeReminder(id: string): Promise<void>`: conclui a ocorrência de `nextOccurrence`, com háptico de sucesso;
  - `reopenReminder(id: string): Promise<void>`;
  - `deleteReminders(ids: readonly string[]): Promise<void>`.

- [ ] **Passo 1:** escrever `useReminderActions({ dataRef, commit })` em `use-reminders.ts`, no mesmo estilo do `useAddWater`. Cada ação monta o novo `AppData` com as funções da Tarefa 1 e chama `commit`, que salva, reagenda e sincroniza. O id novo é `Date.now().toString(36) + Math.random().toString(36).slice(2, 8)`. `app-state.tsx` só espalha o resultado no `value` e na interface.
- [ ] **Passo 2:** no roteamento:
  - `open-reminder` → `router.push({ pathname: "/lembretes/[id]", params: { id } })`;
  - `reminder-done` e `reminder-snooze` → `refresh()`;
  - `dismiss` → nada.
- [ ] **Passo 3:** `npm run check` → passa.

### Tarefa 6: Componentes

**Arquivos (todos em `src/components`, apresentacionais e sem `services`):**
- Criar: `lead-picker.tsx` + `lead-picker.web.tsx`
- Criar: `repeat-picker.tsx` + `repeat-picker.web.tsx`
- Criar: `date-field.tsx` + `wheel-date.web.tsx` + `wheel-date.tsx`
- Criar: `segmented-tabs.tsx`
- Criar: `reminder-row.tsx`
- Criar: `reminder-hero.tsx`
- Modificar: `wheel-time.css`, só se as rodas novas precisarem de classe extra

**Interfaces:**
- `LeadPicker({ value: number; onChange(minutes: number): void })`:
  - Web: três rodas `@ncdai/react-wheel-picker`, dias 0–7, horas 0–23 e minutos 0–59, no mesmo visual do `WheelTime`. O total é limitado a 1..10080.
  - Nativo: três `Stepper` (dias, horas, minutos). **Decisão do plano:** no nativo não há roda genérica instalada, e o PWA é a plataforma principal.
  - Embaixo, a linha "Avisa às HH:MM" fica no pai.
- `RepeatPicker({ value: Repeat; onChange(r: Repeat): void })`:
  - Web: uma roda de N (1..`REPEAT_LIMITS[unit]`) e uma de unidade, com plural ("dias", "semanas", "meses", "anos" ou o singular quando N=1).
  - Nativo: `Stepper` mais `SegmentedTabs`.
  - Trocar a unidade limita N.
- `DateField({ label: string; value: string /* YYYY-MM-DD */; onChange })`: segue o `TimeField`. iOS usa o `DateTimePicker` compacto `mode="date"`; Android usa o diálogo; a web usa `WheelDate` (dia, mês por extenso e ano atual +5), que abre abaixo da linha.
- `SegmentedTabs({ options: { value: string; label: string }[]; value: string; onChange })`: trilho `fill`, pílula `accent` com texto `onAccent`, 32 pt, alvo de 44 pt com `hitSlop`, `accessibilityRole="tab"`.
- `ReminderRow({ time: string; day?: string; title: string; detail?: string; overdue?: boolean; done?: boolean; selected?: boolean | undefined; onPress(): void; onToggleDone?(): void })`:
  - Coluna da hora com 50 pt de largura. O dia fica embaixo em `caption`.
  - Título em `body`; em concluído, `secondaryLabel` riscado.
  - `detail` em `footnote`.
  - Seta à direita.
  - `overdue` deixa o dia em `danger` com "Atrasado".
  - Com `selected !== undefined`, mostra um círculo de seleção à esquerda.
  - Com `onToggleDone`, mostra um círculo de concluir à esquerda (verde com ✓ quando feito).
- `ReminderHero({ title: string; when: string; countdown: string; progress: number /* 0..1 */; onPress })`:
  - Rótulo "PRÓXIMO · {when}" em `accentText`.
  - Título em `title2` negrito.
  - Contagem em `largeTitle`, `accent`, `fontVariant: ["tabular-nums"]`.
  - Barra de 3 pt: trilho `ringTrack`, preenchimento `accent`.
  - A contagem fica fora de live region.
  - `progress` = 1 − restante/24 h, limitado a 0..1 (**decisão do plano**: a barra só começa a encher no último dia).

**Decisão do plano sobre o gesto de deslizar:** o app não tem `GestureHandlerRootView`, e embrulhar a raiz ameaça a rolagem como documento na web (`docs/design.md`, "Rolagem na web"). No lugar do deslize, cada linha de Próximos tem um **círculo para concluir** à esquerda, como no app Lembretes do iPhone, e Apagar fica na tela de edição e na seleção. Isso vale para todas as plataformas.

- [ ] **Passo 1:** implementar os componentes com os tokens de `@/theme` (`space`, `radius`, `HIT`, `type`).
- [ ] **Passo 2:** `npm run check` → passa.

### Tarefa 7: Telas

**Arquivos:**
- Modificar: `src/app/(tabs)/index.tsx`. A função local `TodayReminders` fica no mesmo arquivo, como a `TodayWater`, e a seção vai entre Água e Linha do tempo. O arquivo tem 144 linhas, então cabe.
- Criar: `src/app/lembretes/index.tsx` (lista)
- Criar: `src/app/lembretes/[id].tsx` (formulário; `id === "novo"` cria)
- Criar: `src/components/reminder-form.tsx` (seções do formulário, apresentacional: `draft` + `onChange`)
- Modificar: `src/app/_layout.tsx` (rotas `lembretes/index` e `lembretes/[id]` no `Stack.Protected` de `open && data.onboarded`, com as mesmas opções de cabeçalho do `trick/[id]`; `headerBackTitle` "Hoje" e "Lembretes")

**Comportamento:**
- **Hoje:**
  - Usa `pendingReminders(data.reminders, now)` com `useNow(1000)`, que já existe na tela.
  - Com itens: `Section` com o título "Lembretes" e o link "Ver todos" no `accessory` (texto `accentText`). Dentro: `ReminderHero` com o primeiro item (`whenLabel` e `formatReminderCountdown`; atrasado mostra "Atrasado" em `danger`), até 2 `ReminderRow` e um `ActionRow` "+ Novo lembrete".
  - Sem itens: só o `ActionRow` e o rodapé "Crie lembretes para estudo, compras, contas e o que mais precisar.".
- **Lista (`/lembretes`):**
  - `Screen` com o título "Lembretes", `underHeader`, o botão ＋ em `headerRight` e `SegmentedTabs` Próximos | Concluídos.
  - **Próximos:** uma `Section` por `groupLabel`, com `ReminderRow` (`detail = reminderSummary`, `onToggleDone = completeReminder`). Rodapé `pinned` com `PrimaryButton` "+ Novo lembrete".
  - **Concluídos:** `Section` por mês do `doneAt`, com o `detail` "Feito em 25 out, 10:12".
    - "Selecionar" no cabeçalho liga a seleção. Aí aparecem "Selecionar todos" e "OK", e uma barra `pinned` com "N selecionados" e "Apagar" em `danger`.
    - Apagar usa `confirm` (`src/state`) com o texto "Apagar N lembretes? Isso não pode ser desfeito.".
    - Tocar num concluído fora da seleção abre a edição.
  - Estados vazios: "Nenhum lembrete por aqui." e "Nada concluído ainda.".
- **Formulário (`/lembretes/[id]`):**
  - Título "Novo lembrete" ou "Editar lembrete", com Cancelar e Salvar no cabeçalho. Salvar fica desabilitado sem título.
  - Seções:
    - campos (`TextField`, que já existe; notas com várias linhas);
    - **Quando** (`DateField` e `TimeField`; o padrão é a próxima hora cheia);
    - **Antecipar**: linhas "1 h 30 antes" com botão de remover; "+ Adicionar antecipação" abre o `LeadPicker` em linha, com padrão de 60 min, e some ao chegar a 5. O rodapé lista todos os avisos da próxima ocorrência ("Você recebe 3 avisos: seg 16:00, ter 15:30 e ter 17:00", com `whenLabel` curto);
    - **Repetir**: `ToggleSwitch` e "A cada" com o `RepeatPicker` (padrão 1 semana); o rodapé mostra as próximas 3 datas.
  - Em edição, uma seção no fim com `ActionRow` "Marcar como feito" (ou "Desfazer feito" quando concluído) e "Apagar lembrete" (`destructive`, com `confirm`).
  - O erro de `saveReminder` aparece com `accessibilityRole="alert"`.
  - Ao salvar ou apagar, `router.back()`.
  - Id inexistente (link antigo de notificação): "Este lembrete foi apagado." e um botão para voltar.

- [ ] **Passo 1:** implementar as telas e as rotas.
- [ ] **Passo 2:** `npm run check` → passa.
- [ ] **Passo 3:** conferência visual com `preview_start` (`.claude/launch.json`) na web, em 375 × 812 e no computador, nos temas claro e escuro:
  - criar um lembrete com 2 antecipações e repetição semanal;
  - ver o destaque na Hoje;
  - concluir, abrir Concluídos, selecionar todos e apagar;
  - sem erros no console.
- [ ] **Passo 4:** no Ajustes, "testar notificação" continua funcionando. Crie um lembrete para daqui a 2 min com antecipação de 1 min e confirme que os 2 avisos chegam na web com permissão concedida.

### Tarefa 8: Documentação

**Arquivos:** `docs/architecture.md`, `docs/design.md`.

- [ ] **Passo 1:**
  - `architecture.md`: subseção "Lembretes" em Agendamento (vagas que sobram, horizonte de 60 dias, ids `rem:`, ações); o campo `reminders` e as lápides em Dados e em Sync.
  - `design.md`: seção "Lembretes" (destaque na Hoje, tela com Próximos/Concluídos e seleção, formulário com roletas, círculo de concluir no lugar do deslize, `Stepper` no nativo).
- [ ] **Passo 2:** `npm run check` final → passa.
