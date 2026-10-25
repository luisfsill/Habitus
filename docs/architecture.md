# Arquitetura

## Visão geral

Tudo roda no aparelho, com uma cópia local dos dados. A conta e a cópia na nuvem ficam no Supabase (Auth + tabela `user_data`); não há backend próprio. Configuração: [supabase-setup.md](supabase-setup.md).

```
src/app (rotas Expo Router) ─┐
src/components (UI pura) ────┼─► src/state (contexto React) ─► src/services (efeitos) ─► AsyncStorage / expo-notifications
                             └─────────────────────────────────► src/domain (funções puras, testadas)
```

| Camada | Responsabilidade | Pode importar |
|---|---|---|
| `src/domain` | Regras: agendamento, plano de notificações, histórico, sanitização dos dados, intents de resposta | nada do app |
| `src/services` | AsyncStorage, `expo-notifications`, tarefa em background, cliente Supabase e sync, log | `domain` |
| `src/state` | `AuthProvider` (sessão + ações de conta), `AppStateProvider` (dados + ações + sync), roteamento de notificações, relógio | `domain`, `services` |
| `src/components` | Peças visuais sem efeitos colaterais de dados | `domain` (tipos/formatadores), `theme` |
| `src/app` | Telas e navegação | todas acima |

As fronteiras são verificadas por `import-x/no-restricted-paths` e `quality/no-direct-data-access` em `eslint.config.mjs`.

## Agendamento

- `computeSchedule(start, end, days, bedtime?)` (`src/domain/schedule.ts`) valida e devolve os minutos de abertura, dos 5 truques do dia e do 6º (hora de dormir, em "minutos noturnos": 00:30 = 24:30).
- `estimateBedtime` (`src/domain/bedtime.ts`) aprende a hora de dormir a partir de `settings.bedtime` (resposta do usuário) e de `sleepLog` (noite → horário em que o truque 6 foi concluído, gravado por `withCompletion`). `scheduleFor(data, now)` junta tudo e é usado pela tela Hoje e pelo reagendamento.
- `planNotifications(schedule, now, { completed })` (`src/domain/notification-plan.ts`) gera as notificações futuras dos próximos 7 dias, com ids estáveis (`AAAA-MM-DD:trick:i`), pulando truques já concluídos, com teto de 60.
- `rescheduleAll(data)` (`src/services/notifications.ts`) cancela as notificações do plano e agenda o plano de novo, com gatilhos `DATE`. Adiamentos (`…:snooze:…`) e testes (`test:…`) são preservados (`isOneOffId`). Roda ao iniciar, quando o app volta ao primeiro plano e a cada mudança de ajustes.
- `planTestRun(now, 5)` comprime um "dia" em 5 minutos para teste manual (ignora a janela mínima de propósito) e é somado ao plano real.
- Concluir um truque cancela a notificação dele e os adiamentos dele no mesmo dia.

## Respostas às notificações

- Payload `{ kind, dayKey, trickIndex }`. O listener JS o recebe em `content.data`; a tarefa headless do Android, em `content.dataString` (JSON em texto). `contentData` lê os dois, e `interpretResponse` converte ação + payload em intent (`open-trick`, `open-today`, `done`, `snooze`).
- Android: categoria com ações sem abrir o app; `expo-task-manager` executa `applyResponse` em background (marca feito no AsyncStorage ou agenda o adiamento). A tarefa é definida em `index.ts`, o entry do app, antes do `expo-router/entry`: com o app encerrado, o JS headless não avalia os arquivos de rota, então uma tarefa definida a partir do layout nunca seria registrada.
- iOS: a doc do SDK 58 não garante JS em background para ações de notificação local, então as ações abrem o app e o listener aplica o efeito.
- Com o app em segundo plano, o Android entrega a mesma ação à tarefa headless e ao listener. `applyResponse` aplica "Feito"/"Adiar" uma vez só por `identificador:ação`.

## Gamificação

- `computeStats` (`src/domain/gamification.ts`) percorre o histórico dia a dia e soma XP, sequência atual e melhor sequência, dias e semanas perfeitas.
- `progressFrom`/`progressOf` (`src/domain/achievements.ts`) derivam nível, faixa e medalhas. `rewardBetween` compara dois snapshots e gera a celebração.
- `AppStateProvider` expõe `progress`, que é derivado de `data`, e `reward`, preenchido em `completeTrick`. `RewardToast` é renderizado no layout raiz.

## Web / PWA

- `public/index.html` (modo `web.output: single`) liga `manifest.json`, ícones e `sw.js`, e guarda o `beforeinstallprompt` em `window.__habitusInstall` antes do React montar.
- No celular pelo navegador (`isMobileWeb() && !isStandalone()`), o layout raiz mostra só `InstallGate`: apresentação + "Instalar agora". O app em si roda no computador ou instalado.
- `useInstallPrompt` (`src/state`) decide o modo do cartão: `prompt` (Chrome/Edge/Android), `ios` (passo a passo), `manual` ou `hidden` (instalado/dispensado).
- `src/services/web-reminders.ts` substitui o `expo-notifications` na web. Ele arma timers para as próximas 24 h e mostra a notificação pelo service worker, e `sw.js` abre `/trick/i` ao tocar.
- `(tabs)/_layout.web.tsx` usa abas JS na parte de baixo, porque as abas nativas viram uma pílula no topo da página na web.

## Conta e sincronização

- `src/services/supabase.ts` cria o cliente com `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `EXPO_PUBLIC_SUPABASE_KEY`). Sem elas, `supabase` é `null` e o layout mostra "Configuração do servidor ausente". A sessão fica no AsyncStorage pelo adaptador `authStorage` de `storage.ts`.
- `AuthProvider` (`src/state/auth.tsx`): criar conta (`signUp` grava `terms_version` e `terms_accepted_at` nos metadados), confirmar com o código (`verifyOtp` tipo `email`), entrar, esqueci a senha (`resetPasswordForEmail` → `verifyOtp` tipo `recovery` → `updateUser`), sair e excluir conta (RPC `delete_my_account`). Erros viram português em `authErrorMessage` (`src/domain/auth-rules.ts`). Os e-mails levam código, não link: no iPhone o link abriria o Safari, fora do PWA instalado.
- Rotas (`src/app/_layout.tsx`): sem sessão (ou no meio da troca de senha, `recovering`) só `auth/*`; com sessão e sem onboarding, `onboarding`; senão as abas. `legal/*` abre em qualquer estado. O `AppStateProvider` é remontado por conta (`key = userId`).
- Sync (`src/services/sync.ts` + `AppStateProvider`): `pushMerged` lê o registro do servidor, aplica `mergeData` (`src/domain/sync.ts`) e grava. Roda ao abrir (sem esperar a rede, exceto num aparelho sem dados da conta, até 8 s), ao voltar ao primeiro plano e 2 s depois de cada mudança; sem internet fica pendente (`syncPending`). `mergeData` só soma: completions unidas por dia, gratidão e sono por dia com o local vencendo, `settings` pelo `settingsUpdatedAt` maior (hora de dormir diferente leva o `sleepLog` do lado vencedor, recomeçando o aprendizado), `onboarded` se qualquer lado for verdadeiro. "Resetar dados" grava `resetAt`; a cópia com o `resetAt` maior vence qualquer mesclagem, neste e nos outros aparelhos.
- Os dados locais levam `owner` (id da conta). `claimData` descarta dados de outra conta ao entrar; sem sessão o app usa dados vazios e não agenda lembretes.
- Sair envia o que falta (se não der, pede confirmação), apaga os dados locais e cancela as notificações.

## Dados

Uma chave AsyncStorage `habitus:data:v1` com `{ version, onboarded, settings, settingsUpdatedAt, resetAt, owner, completions, gratitude, sleepLog }`, o mesmo JSON guardado em `user_data.data`. O truque 6 concluído depois da meia-noite é gravado na noite anterior (`trickDayKey`). Tudo que é lido passa por `sanitizeData`, que descarta campos inválidos sem perder os válidos.

## Notas de plataforma

- Web é só preview visual: o serviço de notificações vira no-op e a permissão aparece como indisponível.
- Expo Go Android (58.0.5) não carrega o `expo-notifications` 58.x (falta `ExpoTopicSubscriptionModule`). No Android, use um development build.
- `android.permission.SCHEDULE_EXACT_ALARM` está declarada. Sem ela concedida, o Android 12+ usa alarmes inexatos com janela de até 1 h (medido no emulador). O Android 14+ começa negando, então Hoje e Ajustes mostram um aviso que abre a tela "Alarmes e lembretes" (`requestExactAlarmPermissionsAsync`). Depois da concessão, o plano é reagendado como exato.
- Permissão de notificação no Android 13+: antes do primeiro pedido, o sistema já informa `denied` com `canAskAgain: true`. `toPermissionState` trata isso como "ainda não perguntado".
