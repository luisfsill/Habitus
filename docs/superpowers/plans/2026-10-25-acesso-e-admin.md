# Acesso por plano e painel admin: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validade de acesso por conta (7 dias grátis, planos por tempo), tela de renovação pelo WhatsApp e painel `/admin` para gerenciar contas e preços.

**Architecture:** Perfis e planos ficam em tabelas do Supabase com RLS; toda mudança de acesso passa por funções SQL `security definer` que checam `is_admin()`, e criar usuário/trocar e-mail/gerar senha passa pela Edge Function `admin-users`. O app lê o próprio perfil num `AccessProvider`, guarda cópia local e roteia: sem acesso → `/renovar`. As regras (tem acesso, status, somar dias, busca) são puras em `src/domain/access.ts`.

**Tech Stack:** Expo SDK 58, Expo Router (NativeTabs + Tabs web), Supabase (Postgres, RLS, Edge Functions em Deno), Jest.

**Spec:** `docs/superpowers/specs/2026-10-25-acesso-e-admin-design.md`

## Global Constraints

- Português do Brasil; sem afirmações de saúde. Camadas e 350 linhas como em `AGENTS.md`. Dependências com `npx expo install`. `npm run check` verde ao fim de cada task.
- Teste grátis: 7 dias, no gatilho do cadastro. Planos: Mensal 30 dias R$ 9,90; Trimestral 90 dias R$ 24,90; Anual 365 dias R$ 79,90 (destaque "Mais vantajoso").
- WhatsApp: `https://wa.me/5537999216351?text=` + "Olá! Sou {nome} ({e-mail}) e quero renovar meu Habitus no plano {plano}."
- "Válido até" = fim do dia em São Paulo (UTC−3, sem horário de verão).
- `service_role` só dentro da Edge Function (variável do Supabase), nunca no repositório.

## Review Focus

- Pessoa comum chamando as funções `admin_*` ou fazendo `update` em `profiles` pela API: recusado pelo banco.
- Administrador tentando tirar o próprio cargo ou se excluir: recusado pelo banco e botão desabilitado no painel.
- Sem internet com acesso pago em cache: abre o app normalmente.
- Busca "joao" encontra "João"; busca por parte do e-mail funciona.
- Acesso vencido enquanto o app está aberto em segundo plano: ao voltar ao primeiro plano, vai para `/renovar`.

---

### Task 1: Regras de acesso (domínio)

**Files:** Create `src/domain/access.ts`; Test `src/domain/__tests__/access.test.ts`

**Interfaces — Produces:**
- `type Role = "user" | "admin"`, `type PlanKind = "trial" | "paid"`
- `interface Profile { id: string; name: string; email: string; role: Role; plan: PlanKind; accessUntil: string | null; unlimited: boolean; createdAt: string }`
- `type AccessStatus = "admin" | "unlimited" | "expired" | "trial" | "active"`
- `hasAccess(p: Profile, now: Date): boolean` — admin ou unlimited ou `accessUntil > now`
- `accessStatus(p: Profile, now: Date): AccessStatus` — ordem: admin, unlimited, expired, trial, active
- `daysLeft(p: Profile, now: Date): number` — dias inteiros arredondados para cima; 0 se vencido
- `extendAccess(current: string | null, days: number, now: Date): string` — soma à validade se no futuro, senão a partir de `now`; ISO
- `endOfDaySaoPaulo(day: string): string` — `"2026-11-30"` → `"2026-12-01T02:59:59.999Z"`
- `displayName(p: Pick<Profile, "name" | "email">): string` — nome ou parte do e-mail antes do `@`; `firstName(...)` — primeira palavra
- `normalizeSearch(text: string): string` — minúsculas, sem acentos, trim; `matchesSearch(p: Profile, query: string): boolean` — nome ou e-mail
- `renewWhatsAppUrl(name: string, email: string, planName: string): string`
- `parseProfile(row: unknown): Profile | null` — valida a linha vinda do Supabase (snake_case → camelCase)

- [ ] **Step 1:** Testes com: trial com 2 dias e 1 h → `daysLeft` 3 e status `trial`; vencido ontem → `expired` e `hasAccess` false; admin vencido → `admin` e true; `extendAccess` de validade futura soma 30 dias exatos; de vencida conta de `now`; `endOfDaySaoPaulo` como acima; "joao" acha "João Silva"; "silva@" acha o e-mail; `displayName({name:"", email:"maria123@x.com"})` = "maria123"; URL contém `5537999216351` e o texto codificado; `parseProfile` rejeita role inválida.
- [ ] **Step 2:** `npx jest src/domain/__tests__/access.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar. **Step 4:** rodar → PASS.
- [ ] **Step 5:** Lembretes até a validade: em `src/domain/notification-plan.ts`, `planNotifications(..., { completed, until?: Date })` descarta notificações depois de `until`. Teste: `until` amanhã 10:00 → nenhuma depois disso. RED → GREEN.
- [ ] **Step 6:** `npm run check`; commit `feat(domain): access rules and reminder cutoff`.

### Task 2: Banco e Edge Function

**Files:** Create `supabase/admin.sql`, `supabase/functions/admin-users/index.ts`; Modify `docs/supabase-setup.md`

- [ ] **Step 1: `supabase/admin.sql`** (idempotente, roda depois de `schema.sql`):
  - `profiles(id uuid pk references auth.users on delete cascade, name text not null default '', email text not null, role text not null default 'user' check (role in ('user','admin')), plan text not null default 'trial' check (plan in ('trial','paid')), access_until timestamptz, unlimited boolean not null default false, created_at timestamptz not null default now())`.
  - `plans(id text pk, name text, days int check (days > 0), price_cents int check (price_cents >= 0), highlight boolean default false, active boolean default true, sort int)` com seed `monthly/Mensal/30/990`, `quarterly/Trimestral/90/2490`, `yearly/Anual/365/7990/highlight`, `on conflict do nothing`.
  - `is_admin()` e `has_access()` (`security definer`, `stable`, `search_path = ''`).
  - Gatilho `after insert on auth.users` → perfil com `left(trim(raw_user_meta_data->>'name'), 80)`, e-mail, `access_until = now() + interval '7 days'`. Backfill das contas existentes (`on conflict do nothing`).
  - RLS: `profiles` select próprio ou admin; sem insert/update/delete para clientes. `plans` select para `authenticated`. `user_data` insert/update passam a exigir `has_access()`.
  - Funções (`security definer`, recusam se `not is_admin()`): `admin_set_access(uid uuid, until timestamptz, unlimited boolean, plan text)`, `admin_set_role(uid uuid, role text)` (recusa `uid = auth.uid()`), `admin_update_name(uid uuid, name text)`, `admin_delete_user(uid uuid)` (recusa `uid = auth.uid()`), `admin_save_plan(id text, name text, days int, price_cents int, highlight boolean, active boolean)`. `update_my_name(name text)` para qualquer conta logada. `grant execute ... to authenticated`, `revoke ... from public, anon`.
  - Comentário final com o SQL para virar admin: `update public.profiles set role = 'admin', unlimited = true where email = 'SEU_EMAIL';`.
- [ ] **Step 2: Edge Function `admin-users`** (Deno, `npm:@supabase/supabase-js@2`): CORS; lê o JWT do header, confere `profiles.role = 'admin'` com o cliente do chamador; ações `{ action: "create", name, email }` → `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } })`, devolve `{ id, password }`; `{ action: "update_email", id, email }` → `updateUserById(id, { email, email_confirm: true })` + atualiza `profiles.email`; `{ action: "reset_password", id }` → nova senha e devolve. Senha provisória: 10 caracteres de `crypto.getRandomValues` sem ambíguos (0/O/1/l). Erros como `{ error: "mensagem em português" }` com status 4xx.
- [ ] **Step 3:** `docs/supabase-setup.md`: seções "6. Planos e administração" (rodar `admin.sql`), "7. Publicar a função admin-users" (pelo painel: Edge Functions → Deploy new function → colar o arquivo; ou CLI `supabase functions deploy admin-users`), "8. Virar administrador" (o `update` acima).
- [ ] **Step 4:** `npm run check` (o SQL e a função não entram no lint/tsc do app; excluir `supabase/functions` do `tsconfig`/ESLint se acusarem Deno). Commit `feat: profiles, plans, admin functions`.

### Task 3: Serviços de perfil, planos e admin

**Files:** Create `src/services/profile.ts`, `src/services/admin.ts`; Modify `src/services/storage.ts`

**Interfaces — Produces:**
- `storage.ts`: `loadProfileCache(): Promise<Profile | null>`, `saveProfileCache(p: Profile | null): Promise<void>` (chave `habitus:profile:v1`)
- `profile.ts`: `fetchMyProfile(userId: string): Promise<Profile>`; `updateMyName(name: string): Promise<void>`; `fetchPlans(): Promise<Plan[]>` com `interface Plan { id: string; name: string; days: number; priceCents: number; highlight: boolean; active: boolean; sort: number }` (definida em `src/domain/access.ts`, com `parsePlan(row: unknown): Plan | null`)
- `admin.ts`: `listProfiles(): Promise<Profile[]>`; `setAccess(id, { until: string | null; unlimited: boolean; plan: PlanKind }): Promise<void>`; `setRole(id, role)`; `updateName(id, name)`; `deleteUser(id)`; `savePlan(plan: Plan)`; `createUser(name, email): Promise<{ id: string; password: string }>`; `updateEmail(id, email)`; `resetPassword(id): Promise<string>` (as três últimas via `supabase.functions.invoke("admin-users", { body })`). Todas lançam `Error` com mensagem em português (reusar `authErrorMessage` para falhas de rede).

- [ ] **Step 1:** Teste de `parsePlan` em `access.test.ts` (RED → GREEN). **Step 2:** Implementar serviços. **Step 3:** `npm run check`; commit `feat: profile and admin services`.

### Task 4: Acesso no app (estado, rotas, renovação, cadastro com nome)

**Files:** Create `src/state/access.tsx`, `src/app/renovar.tsx`, `src/components/plan-card.tsx`; Modify `src/app/_layout.tsx`, `src/state/auth.tsx`, `src/state/app-state.tsx`, `src/app/auth/index.tsx`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/settings.tsx`, `src/services/notifications.ts`

**Interfaces — Produces:** `AccessProvider`, `useAccess(): { profile: Profile | null; ready: boolean; hasAccess: boolean; isAdmin: boolean; refresh(): Promise<void>; setName(name: string): Promise<void> }`. `useAuth().signUp(name, email, password)`.

- [ ] **Step 1:** `AccessProvider` (dentro do `AuthProvider`, chave `userId`): carrega cache, depois `fetchMyProfile` no início, ao voltar ao primeiro plano e em `refresh`; salva cache; sem cache e sem rede → `ready` com `profile = null` e erro de conexão na tela.
- [ ] **Step 2:** `_layout.tsx`: com sessão e `!hasAccess` → só `renovar` (+ `legal`); `AppStateProvider` recebe `accessUntil: Date | null` (null = sem limite) e `rescheduleAll(data, { until })` passa o corte; sem acesso, cancela tudo.
- [ ] **Step 3:** `renovar.tsx` com `AuthShell`: título "Seu teste grátis acabou" (`plan === "trial"`) ou "Seu plano acabou"; `PlanCard` por plano ativo (anual com "Mais vantajoso"), toque seleciona; "Renovar pelo WhatsApp" (`Linking.openURL(renewWhatsAppUrl(...))`); "Já paguei, atualizar" (`refresh`); "Sair"; "Excluir conta" (confirmação dupla); links legais.
- [ ] **Step 4:** Cadastro: campo "Nome" (obrigatório, ≤ 80) acima do e-mail na aba Criar conta; validação em `validate`; `signUp(name, email, password)` grava `options.data.name`.
- [ ] **Step 5:** Hoje: título `${greetingFor(...)}, ${firstName(profile)}!`; aviso quando `status === "trial"` e `daysLeft ≤ 3`: "Faltam N dias do seu teste grátis" com "Ver planos" (`/renovar` aberto só para consulta enquanto há acesso). Ajustes > Conta: campo "Nome" salvo com `setName`.
- [ ] **Step 6:** `npm run check`; preview web: cadastro mostra Nome; `/renovar` renderiza com perfil vencido simulado. Commit `feat: access gate, renewal screen, name at signup`.

### Task 5: Painel admin

**Files:** Create `src/app/(tabs)/admin/_layout.tsx`, `src/app/(tabs)/admin/index.tsx` (usuários), `src/app/(tabs)/admin/user/[id].tsx` (ficha), `src/app/(tabs)/admin/plans.tsx`, `src/components/admin-top-bar.tsx`, `src/components/admin-user-row.tsx`, `src/components/undo-toast.tsx`; Modify `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/_layout.web.tsx`

- [ ] **Step 1:** Aba "Admin" (ícone `shield`/`admin_panel_settings`) só quando `isAdmin`: na web, `href: null` para esconder; no nativo, a prop de esconder do `NativeTabs.Trigger` conforme a doc do SDK 58. `admin/_layout.tsx` redireciona para `/` quando não é admin.
- [ ] **Step 2:** `admin/index.tsx`: `AdminTopBar` (só largura ≥ 768: marca, seções Usuários / Planos e preços, menu da conta com iniciais, nome e e-mail completos; itens: Voltar para o app, Meu perfil → `/settings`, Planos e preços, Termos e Privacidade, separador, Sair em vermelho); números (contas, ativos, teste, vencidos via `accessStatus`); busca com `autoFocus` e `matchesSearch`; filtros Todos/Ativos/Teste/Vencidos/Admins; `AdminUserRow` com +30/+90/+365/∞ (`extendAccess`, `plan: "paid"`) e ⋯; `UndoToast` "{nome} liberada até DD/MM/AAAA" com Desfazer (restaura valores anteriores por `setAccess`); "Criar usuário" (modal: nome, e-mail → mostra senha uma vez, Copiar, Enviar pelo WhatsApp `https://wa.me/?text=`).
- [ ] **Step 3:** `user/[id].tsx`: nome, e-mail (via `updateEmail`), "Adicionar N dias", "Válido até" (campo `AAAA-MM-DD` com `endOfDaySaoPaulo`), ilimitado, Remover acesso (`until = now`), cargo (desabilitado para si mesmo), Gerar nova senha, Excluir (confirmação dupla; desabilitado para si mesmo), criado em.
- [ ] **Step 4:** `plans.tsx`: lista editável (nome, dias, preço em reais, destaque, ativo) com `savePlan`.
- [ ] **Step 5:** `npm run check`; preview web logado como admin (depois de o dono rodar o SQL): buscar, liberar, desfazer. Commit `feat: admin panel`.

### Task 6: Documentação e verificação final

- [ ] `PRODUCT.md` (acesso, planos, painel), `docs/architecture.md` (perfis, planos, RLS, funções, Edge Function, rotas), `AGENTS.md` (Edge Function e SQL em `supabase/`). `npm run check`. Commit `docs: access and admin`.
