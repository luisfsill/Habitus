# Conta, login e sincronização: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conta obrigatória com e-mail e senha (código de 6 dígitos), Termos e Política, sincronização do `AppData` com o Supabase, e o app inteiro em azul cobalto.

**Architecture:** O cliente `@supabase/supabase-js` vive em `src/services/supabase.ts` e guarda a sessão pelo adaptador exportado de `src/services/storage.ts`. Um `AuthProvider` em `src/state/auth.tsx` expõe sessão e ações; o `AppStateProvider` puxa, mescla (função pura `mergeData` em `src/domain/sync.ts`) e envia o `AppData`. O `_layout.tsx` roteia: sem sessão vai para `src/app/auth/*`, sem onboarding para `onboarding`, senão para as abas.

**Tech Stack:** Expo SDK 58, Expo Router, Reanimated 4, react-native-svg, `@supabase/supabase-js`, `react-native-url-polyfill`, Jest (jest-expo).

**Spec:** `docs/superpowers/specs/2026-10-25-conta-e-sincronizacao-design.md`

## Global Constraints

- Interface em português do Brasil; sem afirmações médicas ou científicas.
- Dependências só com `npx expo install <pkg>`.
- Camadas: `src/domain` puro; `src/components` não importa `services` nem `app`; `src/services` não importa UI nem `state`; AsyncStorage só em `src/services/storage.ts`; `console` só em `src/services/log.ts`; arquivos ≤ 350 linhas.
- Variáveis: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Só a chave publishable no app.
- Accent escuro `#3D7BFF`, texto branco sobre ele. Accent claro: cobalto mais escuro com contraste ≥ 4.5:1 sobre `#FFFFFF`.
- A tela de conta é sempre escura.
- Código de e-mail com 6 dígitos (`verifyOtp` com `type: "email"` no cadastro e `type: "recovery"` na senha).
- Não mexer nas cores das faixas em `src/domain/gamification.ts` (a faixa roxa é uma cor de faixa, não o accent) nem no fundo do ícone adaptativo em `app.json` (ícone fica para depois).
- `npm run check` passando ao fim de cada task.

## Review Focus

- Sem internet na primeira abertura: a tela de conta mostra erro claro de conexão, sem travar.
- Variáveis do Supabase ausentes (build sem `.env.local`): o app mostra aviso de configuração, sem crash.
- Duas abas/aparelhos marcando truques diferentes no mesmo dia: os dois ficam feitos depois de sincronizar.
- Código colado com espaços ou hífen ("123 456"): aceito e normalizado.
- Sair sem internet com mudança não enviada: pede confirmação antes de apagar.

---

### Task 1: Paleta cobalto

**Files:**
- Modify: `src/theme/index.ts:4-53`
- Modify: `public/index.html:10`, `public/manifest.json:11`, `app.json:51`

- [ ] **Step 1:** Em `src/theme/index.ts`, trocar `accent`, `onAccent`, `accentSoft`, `accentText`, `ringTrack`, `shadow` (claro) para tons de cobalto. Escuro: `accent: "#3D7BFF"`, `onAccent: "#FFFFFF"`, `accentSoft: "rgba(61,123,255,0.18)"`, `ringTrack: "rgba(61,123,255,0.2)"`, `accentText` um cobalto claro legível no preto (ex.: `#8FB3FF`). Claro: escolher o cobalto com ≥ 4.5:1 sobre branco (ex.: `#1D5BD8`). Atualizar o comentário da paleta (sem "lavender").
- [ ] **Step 2:** `theme-color` em `public/index.html` e `theme_color` em `public/manifest.json` para `#000000` (casa com a barra preta do PWA); `app.json` cor da notificação para `#3D7BFF`.
- [ ] **Step 3:** `npm run check` → tudo verde. Abrir o preview web e conferir botão, anel e aba ativa em cobalto.
- [ ] **Step 4:** Commit `feat: cobalt accent replaces purple`.

### Task 2: Mesclagem e carimbo de settings

**Files:**
- Modify: `src/domain/app-data.ts` (campo `settingsUpdatedAt`)
- Create: `src/domain/sync.ts`
- Test: `src/domain/__tests__/sync.test.ts`, `src/domain/__tests__/app-data.test.ts`
- Modify: `src/state/app-state.tsx:106-114` (`updateSettings` grava `settingsUpdatedAt: Date.now()`)

**Interfaces:**
- Produces: `AppData.settingsUpdatedAt: number`; `mergeData(local: AppData, remote: AppData): AppData` em `src/domain/sync.ts`.

- [ ] **Step 1: Testes que falham**

```ts
// sync.test.ts
test("completions são unidas por dia", () => {
  const a = withDays({ "2026-10-25": [0, 2] }), b = withDays({ "2026-10-25": [1], "2026-10-24": [3] });
  expect(mergeData(a, b).completions).toEqual({ "2026-10-25": [0, 1, 2], "2026-10-24": [3] });
});
test("gratidão no mesmo dia: vence o local", () => {
  expect(mergeData(grat({ d: "local" }), grat({ d: "remoto", e: "outro" })).gratitude).toEqual({ d: "local", e: "outro" });
});
test("settings: vence o settingsUpdatedAt maior; empate fica local", () => { /* start "07:00"@200 local vs "09:00"@100 remoto → "07:00"; remoto @300 → "09:00"; @200 x @200 → local */ });
test("onboarded é true se qualquer lado for true", () => { /* false + true → true */ });
// app-data.test.ts
test("sanitizeData sem settingsUpdatedAt usa 0", () => { expect(sanitizeData({ ...defaultData(), settingsUpdatedAt: undefined }).settingsUpdatedAt).toBe(0); });
```

- [ ] **Step 2:** `npx jest src/domain/__tests__/sync.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3:** Adicionar `settingsUpdatedAt` a `AppData`, `defaultData()` (0) e `sanitizeData` (número finito ≥ 0, senão 0; `version` continua 1). Implementar `mergeData`; os dias de completions passam pela mesma ordenação/deduplicação de `sanitizeCompletions`. `sleepLog` segue a regra da gratidão. O `settingsUpdatedAt` do resultado é o do lado vencedor.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(domain): mergeData for account sync`.

### Task 3: Regras do formulário de conta

**Files:**
- Create: `src/domain/auth-rules.ts`
- Test: `src/domain/__tests__/auth-rules.test.ts`

**Interfaces:**
- Produces: `isValidEmail(text: string): boolean`; `passwordChecks(pw: string): { length: boolean; letter: boolean; number: boolean }` (length = ≥ 8); `passwordStrength(pw: string): 0 | 1 | 2 | 3 | 4`; `normalizeCode(text: string): string | null` (6 dígitos ou null); `TERMS_VERSION = "2026-10-25"`.

- [ ] **Step 1: Testes**

```ts
expect(isValidEmail(" voce@email.com ")).toBe(true); expect(isValidEmail("voce@")).toBe(false);
expect(passwordChecks("abc12345")).toEqual({ length: true, letter: true, number: true });
expect(passwordStrength("")).toBe(0); expect(passwordStrength("Abcdef12!xyz")).toBe(4);
expect(normalizeCode("123 456")).toBe("123456"); expect(normalizeCode("12-34-56")).toBe("123456"); expect(normalizeCode("12345")).toBeNull();
```

- [ ] **Step 2:** Rodar → FAIL. **Step 3:** Implementar (força: +1 por regra de `passwordChecks` atendida, +1 se ≥ 12 caracteres e tiver símbolo ou maiúscula; 0 se vazio). **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Commit `feat(domain): auth form rules`.

### Task 4: Cliente Supabase, banco e guia de configuração

**Files:**
- Modify: `package.json` (via `npx expo install @supabase/supabase-js react-native-url-polyfill`)
- Modify: `src/services/storage.ts` (exporta `authStorage`, `clearData` já existe)
- Create: `src/services/supabase.ts`, `src/services/sync.ts`
- Create: `supabase/schema.sql`, `docs/supabase-setup.md`

**Interfaces:**
- Produces:
  - `authStorage: { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void>; removeItem(k: string): Promise<void> }`
  - `supabase: SupabaseClient | null` (null quando faltam as variáveis); `supabaseConfigured: boolean`
  - `fetchRemote(userId: string): Promise<{ data: AppData; updatedAt: string } | null>` (passa por `sanitizeData`)
  - `pushMerged(userId: string, local: AppData): Promise<AppData>` (ler-mesclar-gravar com `mergeData`, devolve o mesclado)
  - `overwriteRemote(userId: string, data: AppData): Promise<void>`
  - `deleteAccountRemote(): Promise<void>` (chama `rpc("delete_my_account")`)

- [ ] **Step 1:** Instalar dependências com `npx expo install`. Confirmar com a doc do SDK 58/Context7 se o polyfill ainda é preciso.
- [ ] **Step 2:** `src/services/supabase.ts`: `import "react-native-url-polyfill/auto"`; `createClient(url, key, { auth: { storage: authStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })`; no nativo, `startAutoRefresh`/`stopAutoRefresh` via `AppState`. Variável ausente → `supabase = null` e `log.error` uma vez.
- [ ] **Step 3:** `supabase/schema.sql`: tabela `public.user_data` (spec), `enable row level security`, políticas select/insert/update com `auth.uid() = user_id`, e `create function public.delete_my_account() returns void language sql security definer set search_path = '' as $$ delete from auth.users where id = auth.uid(); $$;` com `grant execute ... to authenticated` e `revoke ... from anon, public`.
- [ ] **Step 4:** `docs/supabase-setup.md` em português, passo a passo para leigo: rodar o SQL; Authentication > Sign In / Providers > Email: confirmar e-mail ligado, tamanho do OTP = 6; Emails > Templates "Confirm signup" e "Reset password" com HTML pronto em português mostrando `{{ .Token }}` (sem link); SMTP do Gmail (ativar verificação em duas etapas, criar senha de app, `smtp.gmail.com`, porta 465, usuário = o Gmail, remetente "Habitus"); limites; onde ver usuários.
- [ ] **Step 5:** `npm run check` → verde (o lint confirma que só `storage.ts` importa AsyncStorage).
- [ ] **Step 6:** Commit `feat: supabase client, schema and setup guide`.

### Task 5: Sessão e sincronização no estado

**Files:**
- Create: `src/state/auth.tsx`
- Modify: `src/state/app-state.tsx`, `src/app/_layout.tsx:91-97`

**Interfaces:**
- Consumes: Task 4 services; `mergeData`; `TERMS_VERSION`.
- Produces: `AuthProvider`, `useAuth(): { configured: boolean; session: Session | null; ready: boolean; signUp(email, password): Promise<AuthResult>; verifySignup(email, code): Promise<AuthResult>; resendSignup(email): Promise<AuthResult>; signIn(email, password): Promise<AuthResult | { needsCode: true }>; requestReset(email): Promise<AuthResult>; verifyReset(email, code): Promise<AuthResult>; updatePassword(password): Promise<AuthResult>; signOut(opts?: { force: boolean }): Promise<"ok" | "unsynced">; deleteAccount(): Promise<AuthResult> }` com `type AuthResult = { ok: true } | { ok: false; message: string }`. No `AppStateValue`: `syncPending: boolean`.

- [ ] **Step 1:** `auth.tsx`: `onAuthStateChange` alimenta `session`; `signUp` envia `options.data = { terms_version: TERMS_VERSION, terms_accepted_at: ISO }`. Erro "Email not confirmed" no `signIn` → `{ needsCode: true }` e reenvia o código. Traduzir erros do Supabase para português (credenciais inválidas, e-mail já cadastrado, código inválido/expirado, muitas tentativas, sem conexão); nada de mensagem crua em inglês.
- [ ] **Step 2:** `app-state.tsx` recebe `userId` (prop vinda do layout). Com `userId`: no boot e no `refresh`, `pushMerged(userId, local)` → salva e reagenda com o resultado; depois de `commit`, `completeTrick` e `setGratitude`, agenda um envio com espera de ~2 s que junta mudanças seguidas; falha marca `syncPending` e tenta de novo no próximo `refresh`. `reset` com conta usa `overwriteRemote`.
- [ ] **Step 3:** `signOut`: tenta `pushMerged`; se falhar e `!force` → `"unsynced"`; senão `supabase.auth.signOut()`, `clearData()`, `rescheduleAll(defaultData())`. `deleteAccount`: `deleteAccountRemote()` e o mesmo fim de `signOut`.
- [ ] **Step 4:** `_layout.tsx`: `AuthProvider` por fora do `AppStateProvider` (key = `userId` para remontar ao trocar de conta). Stack: `Stack.Protected guard={!session}` com `auth`; com sessão, a lógica atual de onboarding/abas. `InstallGate` continua antes de tudo no celular não instalado. `configured === false` → tela simples "Configuração do servidor ausente".
- [ ] **Step 5:** `npm run check` → verde.
- [ ] **Step 6:** Commit `feat: auth session and data sync`.

### Task 6: Componentes visuais da conta

**Files:**
- Create: `src/components/horizon-background.tsx`, `src/components/shimmer-title.tsx`, `src/components/auth-field.tsx`, `src/components/password-meter.tsx`, `src/components/code-input.tsx`
- Modify: `src/components/primary-button.tsx` (props `loading?: boolean`, `shake?: number` — mudar o número dispara a tremida)

**Interfaces:**
- Produces: `<HorizonBackground />`; `<ShimmerTitle before="Bora criar seu" highlight="Habitus" after="." />`; `<AuthField label value onChangeText secure? error? autoComplete keyboardType />` (rótulo flutuante, borda e halo cobalto no foco, olho para mostrar senha); `<PasswordMeter password />` (4 barras + checklist de `passwordChecks`); `<CodeInput value onChange onComplete />` (6 caixas, colar preenche tudo via `normalizeCode`).

- [ ] **Step 1:** `HorizonBackground`: fundo preto, brilho radial cobalto subindo de baixo (SVG `RadialGradient`), ~20 estrelas em posições fixas piscando com `withRepeat` defasado. `useReducedMotion()` → estático.
- [ ] **Step 2:** `ShimmerTitle`: palavra destacada em gradiente cobalto→ciano (`#3D7BFF`, `#5FD4FF`) com faixa de brilho percorrendo; texto acessível único (`accessibilityLabel` com a frase inteira); estático com movimento reduzido.
- [ ] **Step 3:** `AuthField`, `PasswordMeter`, `CodeInput`, `PrimaryButton` (loading com spinner; tremida curta por `withSequence`; háptico só fora da web). Cores fixas escuras (a tela é sempre escura), alvos ≥ `HIT`.
- [ ] **Step 4:** `npm run check` → verde.
- [ ] **Step 5:** Commit `feat: animated account form components`.

### Task 7: Telas de conta e telas legais

**Files:**
- Create: `src/app/auth/_layout.tsx`, `src/app/auth/index.tsx` (abas Criar conta/Entrar), `src/app/auth/code.tsx` (confirmar cadastro), `src/app/auth/forgot.tsx` (e-mail → código → nova senha), `src/app/legal/terms.tsx`, `src/app/legal/privacy.tsx`
- Create: `src/domain/legal.ts` (textos e `LEGAL_CONTACT`)

**Interfaces:**
- Consumes: `useAuth()`, componentes da Task 6, `isValidEmail`, `passwordChecks`, `normalizeCode`, `TERMS_VERSION`.
- Produces: rotas `/auth`, `/auth/code?email=`, `/auth/forgot`, `/legal/terms`, `/legal/privacy` (as legais acessíveis com e sem sessão).

- [ ] **Step 1:** `auth/index.tsx`: layout Aurora sobre `HorizonBackground`; título `ShimmerTitle` ("Bora criar seu *Habitus*." / "Que bom te ver de novo no seu *Habitus*."); cartão de vidro (`expo-blur`) com seletor deslizante de abas, campos com `LinearTransition`, entrada escalonada (`FadeInDown.springify().delay`). Criar conta: e-mail, senha + `PasswordMeter`, checkbox "Li e aceito os Termos de uso e a Política de privacidade" (links), botão desabilitado até tudo válido. Entrar: e-mail, senha, "Esqueci minha senha". Erros abaixo do campo; tremida no botão.
- [ ] **Step 2:** `auth/code.tsx`: "Enviamos um código para <e-mail>", `CodeInput` que confirma sozinho ao completar, "Reenviar código" com contagem de 60 s, "Trocar e-mail".
- [ ] **Step 3:** `auth/forgot.tsx`: três passos na mesma tela (e-mail → código → nova senha com `PasswordMeter`), transição entre passos como no onboarding. Ao concluir, já entra.
- [ ] **Step 4:** `legal.ts` + telas: rascunho em português simples cobrindo o que a spec lista; `LEGAL_CONTACT = "[defina o e-mail de contato]"` e responsável marcados visivelmente; versão `TERMS_VERSION` no topo; aviso nenhum de saúde.
- [ ] **Step 5:** `npm run check` → verde. Preview web (`habitus-web`): criar conta com o e-mail do usuário depois de ele rodar o SQL, receber o código, entrar, sair, esqueci a senha. Telas a 375 px e 1600 px; modo "Reduzir movimento".
- [ ] **Step 6:** Commit `feat: account screens with terms and privacy`.

### Task 8: Ajustes > Conta, tela de instalação e documentação

**Files:**
- Modify: `src/app/(tabs)/settings.tsx` (seção "Conta" antes de "Dados")
- Modify: `src/components/install-gate.tsx` (linha "Você cria sua conta depois de instalar.")
- Modify: `PRODUCT.md`, `AGENTS.md`, `docs/architecture.md`

- [ ] **Step 1:** Seção "Conta": e-mail; "Sair" (se `signOut` devolver `"unsynced"`, alerta "Algumas mudanças ainda não foram enviadas e serão perdidas. Sair mesmo assim?" e repete com `force`); "Excluir conta" com duas confirmações; links para Termos e Política; "Resetar dados" passa a dizer que apaga também na nuvem.
- [ ] **Step 2:** Docs: `AGENTS.md` e `PRODUCT.md` deixam de dizer "sem login, sem backend"; `docs/architecture.md` descreve auth, `user_data`, mesclagem e o fluxo de rotas; apontar para `docs/supabase-setup.md`.
- [ ] **Step 3:** `npm run check` → verde; preview: sair, entrar de novo e ver o progresso voltar.
- [ ] **Step 4:** Commit `feat: account settings and docs for login and sync`.
