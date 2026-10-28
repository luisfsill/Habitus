# Pix automático (PagBank) e área Pagamentos no Admin: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manter o Pix manual, somar um modo automático pelo PagBank e dar ao Admin uma área Pagamentos com método, resumo, gráfico de faturamento e histórico completo.

**Architecture:**
- **Banco** (`supabase/payments.sql`): configuração, pagamentos, CPF e as RPCs.
- **Edge Functions** (Deno): `pix-checkout` cria a cobrança no PagBank; `pagbank-webhook` reconsulta o pedido e libera os dias.
- **App:** chama a função e consulta o status. No modo manual, só grava o pedido. O Admin lê tudo por RPCs.

**Tech Stack:** Expo SDK 58, React Native 0.88, TypeScript strict, Jest, Supabase (Postgres, Edge Functions em Deno), `react-native-svg`, API de Pedidos do PagBank.

**Spec:** `docs/superpowers/specs/2026-10-28-pix-automatico-design.md`

## Global Constraints

- Interface 100% pt-BR. `src/domain` puro; `src/components` não importa `services`/`state`/`app`; `src/services` não importa UI/`state`; arquivos com no máximo 350 linhas.
- **SQL:**
  - `security definer`, `set search_path = ''` e `revoke ... from public, anon`;
  - pode rodar de novo;
  - comentários em português.
- **Edge Functions:** ficam fora do lint/tsc do app e seguem `supabase/functions/admin-users/index.ts`.
- **Token PagBank:** só em segredos do Supabase, `PAGBANK_TOKEN_SANDBOX` e `PAGBANK_TOKEN_PRODUCTION`. Nunca no código, no app ou no banco.
- **URL base do PagBank:** `https://sandbox.api.pagseguro.com` (`sandbox`) e `https://api.pagseguro.com` (`production`). Cabeçalho `Authorization: Bearer <token>`.
- **Configuração:** `payment_mode` ∈ `manual|automatic` (padrão `manual`); `pagbank_env` ∈ `sandbox|production` (padrão `sandbox`).
- **Pagamentos:**
  - `payments.status` ∈ `pending|paid|expired|failed|canceled`; `method` ∈ `manual|automatic`;
  - o QR automático expira em 30 min;
  - limite de 5 cobranças automáticas por hora por conta.
- **Liberação:** soma de dias igual a `extendAccess` (`src/domain/access.ts`), mais `plan = 'paid'`.
- **CPF:** guardado em `billing_info` só com os 11 dígitos, validado no SQL e em `src/domain/cpf.ts`. Nunca sai em RPCs de amigos, ranking ou admin.
- **Faturamento:** só pagamentos `paid` de `env = 'production'`, agrupados no fuso `America/Sao_Paulo`.
- Commit por tarefa, em pt-BR, com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sem push.

## Review Focus

1. **Webhook repetido ou fora de ordem:** os dias são somados uma vez só (`grant_payment` idempotente). Teste em `supabase/tests/payments.sql` (Task 2).
2. **Webhook forjado** com `PAID` no corpo e o pedido não pago no PagBank: nada é liberado. Teste: a função de checagem pura `isPaidOrder` com fixtures (Task 3).
3. **Token ausente ou inválido, ou PagBank fora do ar:** "Assinar" cai no Pix manual com a mensagem do spec. Teste: o parser de `startPixCheckout` devolve `fallback` em erro e em resposta malformada (Task 4).
4. **CPF inválido ou com máscara:** rejeitado no app e no SQL; os dígitos são normalizados. Teste: vetores de `isValidCpf` (Task 1) e `set_my_tax_id` (Task 2).
5. **Gráfico sem dados ou com um único dia:** desenha sem erro; barras com zero ficam visíveis como traço. Teste: `revenueBars` com lista vazia e com uma única entrada (Task 1).

---

### Task 1: Domínio puro (CPF, pagamentos, barras do gráfico)

**Files:**
- Create: `src/domain/cpf.ts`, `src/domain/payments.ts`
- Test: `src/domain/__tests__/cpf.test.ts`, `src/domain/__tests__/payments.test.ts`

**Interfaces (Produces):**
```ts
// cpf.ts
export function cpfDigits(text: string): string;          // only digits
export function isValidCpf(text: string): boolean;        // 11 digits, not all equal, both check digits
export function formatCpf(text: string): string;          // "000.000.000-00" as the user types (partial ok)
export function maskCpf(digits: string): string;          // "***.456.789-**"
// payments.ts
export type PaymentStatus = "pending" | "paid" | "expired" | "failed" | "canceled";
export type PaymentMethod = "manual" | "automatic";
export type PaymentMode = "manual" | "automatic";
export type PagbankEnv = "sandbox" | "production";
export interface PaymentConfig { mode: PaymentMode; env: PagbankEnv }
export type Checkout =
  | { mode: "manual" }
  | { mode: "fallback" }
  | { mode: "needs_cpf" }
  | { mode: "automatic"; paymentId: string; qrText: string; expiresAt: string };
export interface AdminPayment {
  id: string; userId: string; name: string; username: string | null; email: string; avatarUrl: string | null;
  planName: string; amountCents: number; days: number; method: PaymentMethod; status: PaymentStatus; env: PagbankEnv;
  orderCode: string | null; pagbankOrderId: string | null; createdAt: string; paidAt: string | null; grantedUntil: string | null;
}
export interface RevenuePoint { bucket: string; cents: number; count: number } // bucket "YYYY-MM-DD" or "YYYY-MM"
export interface Bar { label: string; cents: number; ratio: number }          // ratio 0…1 of the tallest
export function parseConfig(raw: unknown): PaymentConfig;                      // defaults manual/sandbox
export function parseCheckout(raw: unknown): Checkout;                         // anything unexpected → fallback
export function parseAdminPayment(raw: unknown): AdminPayment | null;
export function parseRevenue(raw: unknown): RevenuePoint[];
export function revenueBars(points: readonly RevenuePoint[], period: "days" | "months", today: Date): Bar[]; // fills gaps with 0, 30 or 12 bars, oldest first
export function paymentSummary(points: readonly RevenuePoint[]): { cents: number; count: number; averageCents: number };
export const STATUS_LABEL: Record<PaymentStatus, string>; // Pendente, Confirmado, Expirado, Falhou, Cancelado
```

- [ ] **Step 1: Write the tests.**
  - `cpf.test.ts`:
    - `isValidCpf("529.982.247-25")` é true; `"52998224725"` é true; `"529.982.247-24"` é false; `"111.111.111-11"` é false; `"123"` é false;
    - `formatCpf("5299822")` dá `"529.982.2"`;
    - `maskCpf("52998224725")` dá `"***.982.247-**"`.
  - `payments.test.ts`:
    - `parseCheckout({ mode: "automatic", paymentId: "p", qrText: "000201…", expiresAt: "2026-10-28T12:30:00Z" })` volta igual;
    - `parseCheckout({ mode: "automatic" })`, `parseCheckout(null)` e `parseCheckout({ error: "x" })` dão `{ mode: "fallback" }`;
    - `parseConfig({})` dá `{ mode: "manual", env: "sandbox" }`;
    - `revenueBars([], "days", new Date(2026, 9, 28))` tem 30 barras, todas com `cents` 0 e `ratio` 0, a última `label` "28/10";
    - `revenueBars([{ bucket: "2026-10-27", cents: 7990, count: 1 }], "days", …)` dá a penúltima barra com `ratio` 1;
    - `revenueBars` com `"months"` tem 12 barras, a última `label` "out";
    - `paymentSummary` de duas entradas (7990 e 990) dá `{ cents: 8980, count: 2, averageCents: 4490 }`;
    - `parseAdminPayment` descarta uma linha sem `id` e mapeia `amount_cents` para `amountCents`.
- [ ] **Step 2:** Rode `npx jest src/domain/__tests__/cpf.test.ts src/domain/__tests__/payments.test.ts`. Esperado: FAIL, módulo inexistente.
- [ ] **Step 3: Implemente.** Os parsers seguem o estilo de `parsePublicUser` (`src/domain/friends.ts`: `isRow`/`str`/`num`). O avatar passa por `photoLink` (`src/domain/access.ts`). Os rótulos de mês: `jan fev mar abr mai jun jul ago set out nov dez`.
- [ ] **Step 4:** Rode os testes. Esperado: PASS. Rode também `npm run check`.
- [ ] **Step 5:** Commit: `feat(pagamentos): domínio de CPF, pagamentos e barras do faturamento`.

### Task 2: Banco (`supabase/payments.sql`) e teste SQL

**Files:**
- Create: `supabase/payments.sql`, `supabase/tests/payments.sql`
- Modify: `docs/supabase-setup.md`

**Interfaces (Produces, SQL):**
- **Tabelas:**
  - `app_config(key text pk, value text not null)`, semeada com `payment_mode=manual` e `pagbank_env=sandbox` (`on conflict do nothing`);
  - `payments(id uuid pk default gen_random_uuid(), user_id uuid references auth.users on delete cascade, plan_id text references plans, amount_cents int, days int, method text, status text, env text, order_code text unique, pagbank_order_id text unique, created_at timestamptz default now(), paid_at timestamptz, granted_until timestamptz)`;
  - `billing_info(user_id uuid pk references auth.users on delete cascade, tax_id text not null, updated_at timestamptz default now())`.
- **RLS:**
  - `app_config`: leitura para `authenticated`;
  - `payments`: leitura só da própria linha;
  - `billing_info`: leitura só da própria linha;
  - nenhuma política de escrita.
- **RPCs:**

| Função | Quem chama | O que faz |
| --- | --- | --- |
| `admin_set_config(k text, v text)` | `authenticated` + `require_admin` | valida a chave e o valor |
| `set_my_tax_id(cpf text)` | `authenticated` | dígitos e verificadores; erro `CPF inválido.` com código 22023 |
| `my_tax_id() returns text` | `authenticated` | devolve só os dígitos da própria conta |
| `start_manual_payment(plan text) returns text` | `authenticated` | cria o pagamento `manual`/`pending`/`env` atual e devolve `order_code` (`HAB` + 6, alfabeto sem 0/O/1/I) |
| `my_payment_status(pid uuid) returns text` | `authenticated` | marca `expired` um automático `pending` com mais de 30 min antes de responder |
| `grant_payment(pid uuid) returns boolean` | só `service_role` (via webhook) e as RPCs admin abaixo | idempotente; `for update`; soma os dias como `extendAccess`; grava `paid_at` e `granted_until`; devolve se liberou agora |
| `admin_confirm_payment(pid uuid)` | `require_admin` | chama `grant_payment` |
| `admin_cancel_payment(pid uuid)` | `require_admin` | só `pending` vira `canceled` |
| `admin_payments(st text, before timestamptz, max int) returns jsonb` | `require_admin` | linhas em ordem decrescente de `created_at`, com nome, @, e-mail e avatar de `profiles` e o nome do plano; `st` = `all`, `paid`, `pending` ou `closed` (expired/failed/canceled); `max` limitado a 100 |
| `admin_revenue(period text) returns jsonb` | `require_admin` | `[{bucket,cents,count}]`, com `paid` e `env='production'`, os últimos 30 dias (`days`) ou 12 meses (`months`), em `America/Sao_Paulo` |

- **Para as funções:** `create_auto_payment(uid, plan, order)`, `attach_pagbank_order(pid, order_id)`, `fail_payment(pid)` e `payment_for_webhook(pid)`. Todas recebem `execute` só para `service_role`.

- [ ] **Step 1: Escreva `supabase/tests/payments.sql`**, no padrão de `supabase/tests/ranking.sql` (sentinela de rollback, sem deixar linhas). Asserts:
  - `grant_payment` duas vezes soma os dias uma vez;
  - a validade vencida conta a partir de agora; a que ainda corre conta a partir da validade;
  - `set_my_tax_id('529.982.247-24')` levanta `CPF inválido.`;
  - `admin_revenue` ignora `env='sandbox'`;
  - `my_payment_status` marca `expired` depois de 30 min (use `created_at` no passado).
  - Termina com `raise notice 'payments ok'`.
- [ ] **Step 2: Escreva `supabase/payments.sql`** atendendo às interfaces. `grant_payment` fica fora do laço de `grant ... to authenticated` de `admin.sql` (revoke de `public, anon, authenticated`, grant a `service_role`).
- [ ] **Step 3: Atualize `docs/supabase-setup.md`.** Novo passo: rodar `payments.sql` depois de `admin.sql`/`social.sql`, e depois `tests/payments.sql`, que deve dar `payments ok`.
- [ ] **Step 4: Verificação.** O SQL não roda localmente. Registre "pendente: usuário roda no SQL Editor" e liste no relatório as semânticas de Postgres de que não tem certeza.
- [ ] **Step 5:** Commit: `feat(pagamentos): tabelas, CPF e RPCs de pagamento no Supabase`.

### Task 3: Edge Functions `pix-checkout` e `pagbank-webhook`

**Files:**
- Create:
  - `supabase/functions/_shared/pagbank.ts`;
  - `supabase/functions/pix-checkout/index.ts`;
  - `supabase/functions/pagbank-webhook/index.ts`;
  - `supabase/functions/_shared/pagbank_test.ts` (Deno test).
- Modify: `docs/supabase-setup.md`, `docs/architecture.md`.

**Interfaces (Produces):**
- `_shared/pagbank.ts`:
  - `baseUrl(env)`;
  - `tokenFor(env)` (lê o segredo; vazio dá erro);
  - `createPixOrder({ env, referenceId, customer: { name, email, taxId }, item: { name, cents }, expiresAt, notificationUrl }) → { orderId, qrText }`;
  - `getOrder(env, orderId) → unknown`;
  - **pura:** `isPaidOrder(order: unknown, expected: { orderId: string; referenceId: string; cents: number }) → boolean`. Vale para `charges[].status === "PAID"` com `amount.value === cents`, ou para o formato `qr_codes` pago (confirmar no sandbox).
- **`pix-checkout`:** POST `{ planId }` com o JWT do usuário. Respostas: `{ mode: "manual" }`, `{ mode: "needs_cpf" }`, `{ mode: "fallback" }` ou `{ mode: "automatic", paymentId, qrText, expiresAt }`.
  - Reaproveita um `pending` automático do mesmo plano ainda dentro do prazo.
  - Acima de 5 por hora, responde `fallback`.
  - Erro do PagBank: `fail_payment` e `fallback`.
- **`pagbank-webhook`:** público.
  - Lê só `reference_id` do corpo (com fallback para o `id` do pedido, procurando por `pagbank_order_id`) e busca o pagamento.
  - Reconsulta com o `pagbank_order_id` e o `env` **da linha**: `getOrder`, e se `isPaidOrder` der true chama `grant_payment`.
  - Sempre responde 200.
  - O admin usa a mesma rota para "Consultar no PagBank".

- [ ] **Step 1: Escreva `_shared/pagbank_test.ts`.** Fixtures de `isPaidOrder`:
  - pedido com charge `PAID` e valor certo dá true;
  - charge `PAID` com valor diferente dá false;
  - `WAITING` dá false;
  - `reference_id` diferente dá false;
  - corpo `null` dá false.
- [ ] **Step 2: Implemente `_shared/pagbank.ts`.** Antes, confira o formato atual de criação de pedido Pix na documentação (`https://developer.pagbank.com.br/reference/criar-pedido`), evitando o exemplo marcado "[Depreciado]".
- [ ] **Step 3: Implemente as duas funções** no estilo de `admin-users` (CORS, `reply`, cliente `service_role` só no servidor). `pix-checkout` lê o CPF com o cliente service_role. Nunca devolve a resposta crua do PagBank.
- [ ] **Step 4: Verificação.** Se `deno` estiver disponível, `deno test supabase/functions/_shared/pagbank_test.ts`. Senão, registre como pendente.
- [ ] **Step 5: Documentação.**
  - `docs/supabase-setup.md`, passo a passo:
    - `npx supabase functions deploy pix-checkout --project-ref SEU_PROJECT_REF`;
    - `npx supabase functions deploy pagbank-webhook --no-verify-jwt --project-ref SEU_PROJECT_REF`;
    - os segredos `PAGBANK_TOKEN_SANDBOX` e `PAGBANK_TOKEN_PRODUCTION` em Dashboard → Edge Functions → Secrets;
    - como testar no sandbox.
  - `docs/architecture.md`: o fluxo, e por que o webhook reconsulta o pedido.
- [ ] **Step 6:** Commit: `feat(pagamentos): funções pix-checkout e pagbank-webhook (PagBank)`.

### Task 4: App: serviço, renovação automática, CPF e privacidade

**Files:**
- Create: `src/services/payments.ts`, `src/components/cpf-field.tsx`
- Modify: `src/app/renovar.tsx` (se passar de 350 linhas, extraia o passo do Pix para `src/components/pix-step.tsx`), `src/domain/legal.ts`

**Interfaces:**
- Consumes: Task 1 (`parseCheckout`, `parseConfig`, `isValidCpf`, `formatCpf`, `maskCpf`) e Task 2/3 (RPCs e função).
- Produces (`services/payments.ts`):
  - `getPaymentConfig(): Promise<PaymentConfig>`
  - `setPaymentConfig(key: "payment_mode" | "pagbank_env", value: string): Promise<void>`
  - `startPixCheckout(planId: string): Promise<Checkout>` (erro de rede ou da função dá `{ mode: "fallback" }`)
  - `startManualPayment(planId: string): Promise<string>` (o código do pedido)
  - `paymentStatus(id: string): Promise<PaymentStatus>`
  - `myTaxId(): Promise<string | null>`
  - `saveTaxId(cpf: string): Promise<void>`
  - `adminPayments(status, before, max): Promise<AdminPayment[]>`
  - `adminRevenue(period): Promise<RevenuePoint[]>`
  - `confirmPayment(id)`, `cancelPayment(id)`;
  - `recheckPayment(id)`: chama `pagbank-webhook` com `{ reference_id: id }`, que reconsulta o PagBank.

- [ ] **Step 1: Teste.** Em `payments.test.ts`, um caso de `parseCheckout({ mode: "needs_cpf" })` dá `needs_cpf`.
- [ ] **Step 2: Implemente `services/payments.ts`** com o helper `call` no estilo de `src/services/social.ts`, e `functions.invoke` no estilo de `src/services/admin.ts`.
- [ ] **Step 3: Mude `renovar.tsx`**, no "Assinar":
  - **Lê o modo** com `getPaymentConfig`.
  - **Manual:** `startManualPayment(plan.id)` vira o código do pedido; o resto é a tela atual. Se a RPC falhar, usa `orderCode()` local, para nunca travar.
  - **Automático:** `startPixCheckout`.
    - `needs_cpf` mostra `CpfField` ("CPF de quem paga", máscara, erro "CPF inválido"); depois `saveTaxId` e de novo `startPixCheckout`.
    - `fallback` mostra o Pix manual com a mensagem "Não deu para gerar o Pix automático agora. Pague por este Pix e envie o comprovante."
    - `automatic` mostra `PixQr value={qrText}`, "Copiar Pix copia e cola", "Aguardando pagamento…" e um contador até `expiresAt`. A tela consulta `paymentStatus` a cada 5 s:
      - `paid`: "Pagamento confirmado", `refresh()` e `router.replace("/")`;
      - `expired`: "O Pix expirou" e "Gerar outro Pix".
    - O rodapé tem "Falar com a gente" (WhatsApp, com o código) e "Trocar plano".
  - **CPF já salvo:** aparece mascarado, com "Trocar".
- [ ] **Step 4: Privacidade.** Em `legal.ts`, seção 2 da Política, inclua: "Seu CPF, se você pagar pelo Pix automático, guardado só para gerar a cobrança no PagBank."
- [ ] **Step 5:** Rode `npm run check`. Esperado: PASS.
- [ ] **Step 6:** Commit: `feat(planos): Pix automático pelo PagBank com CPF e volta ao Pix manual`.

### Task 5: Admin > Pagamentos

**Files:**
- Create:
  - `src/app/(tabs)/admin/payments.tsx`;
  - `src/components/revenue-chart.tsx`;
  - `src/components/payment-row.tsx`;
  - `src/components/payment-detail.tsx`.
- Modify:
  - `src/components/admin-top-bar.tsx`: `AdminSection` ganha `"payments"`, com o rótulo "Pagamentos";
  - `src/app/(tabs)/admin/index.tsx`: item "Pagamentos" no menu (`ios: "creditcard"`, `android: "payments"`) e a navegação da barra para `/admin/payments`;
  - `docs/design.md`.

**Interfaces:**
- Consumes: Task 1 (tipos, `revenueBars`, `paymentSummary`, `STATUS_LABEL`) e Task 4 (os serviços de admin).
- Produces:
  - `RevenueChart({ bars, selected, onSelect })`: `react-native-svg`; barras com alvo de toque de 44 pt; `accessibilityLabel` por barra "28/10: R$ 79,90".
  - `PaymentRow({ payment, onPress })`: `Avatar` 40, nome, plano, valor, data e hora, etiqueta de método e etiqueta de status (verde/amarelo/cinza), mais "Teste" quando `env='sandbox'`.
  - `PaymentDetail({ payment, onConfirm, onCancel, onRecheck, busy })`: e-mail, @, código, criado em, pago em, liberado até. Para um pendente manual: "Confirmar pagamento" (pede confirmação) e "Cancelar". Para um pendente automático: "Consultar no PagBank".

- [ ] **Step 1: Escreva `payments.tsx`**, nesta ordem:
  1. **Método:** dois `PlanCard`-like grandes (rádio), Manual e Automático, que salvam ao tocar; embaixo o rádio de ambiente Teste/Produção; com Automático, um aviso sobre os segredos.
  2. **Resumo:** `StatColumns` com Faturamento, Confirmados, Pendentes e Ticket médio.
  3. **Gráfico:** `SegmentedTabs` "30 dias"/"12 meses" e `RevenueChart`.
  4. **Histórico:** filtros (`SegmentedTabs`: Todos, Confirmados, Pendentes, Encerrados), lista de `PaymentRow` em `Section`, e "Carregar mais", 50 por vez.

  O detalhe abre ao tocar numa linha (expandir na própria linha ou modal; o construtor decide).
- [ ] **Step 2:** Rode `npm run check`. Esperado: PASS.
- [ ] **Step 3: Verificação no navegador.** Só se houver uma sessão de admin disponível; senão, registre como pendente para o usuário.
- [ ] **Step 4: `docs/design.md`.** Descreva a área Pagamentos e os estados do passo automático.
- [ ] **Step 5:** Commit: `feat(admin): área Pagamentos com método, resumo, gráfico e histórico`.

### Task 6: Fechamento

- [ ] `npm run check` passa.
- [ ] Revisão final da branch (subagente) com a lista de pendências.
- [ ] Relatório ao usuário com a ordem de setup no Supabase:
  1. rodar `payments.sql` e depois `tests/payments.sql`;
  2. fazer o deploy das 2 funções;
  3. cadastrar os 2 segredos;
  4. em Admin > Pagamentos, escolher Automático e Teste e fazer um pagamento no sandbox;
  5. passar para Produção quando o sandbox funcionar.
