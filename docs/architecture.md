# Arquitetura

## Visão geral

Tudo roda no aparelho. Não há servidor, conta nem rede.

```
src/app (rotas Expo Router) ─┐
src/components (UI pura) ────┼─► src/state (contexto React) ─► src/services (efeitos) ─► AsyncStorage / expo-notifications
                             └─────────────────────────────────► src/domain (funções puras, testadas)
```

| Camada | Responsabilidade | Pode importar |
|---|---|---|
| `src/domain` | Regras: agendamento, plano de notificações, histórico, sanitização dos dados, intents de resposta | nada do app |
| `src/services` | AsyncStorage, `expo-notifications`, tarefa em background, log | `domain` |
| `src/state` | `AppStateProvider` (dados + ações), roteamento de notificações, relógio | `domain`, `services` |
| `src/components` | Peças visuais sem efeitos colaterais de dados | `domain` (tipos/formatadores), `theme` |
| `src/app` | Telas e navegação | todas acima |

As fronteiras são verificadas por `import-x/no-restricted-paths` e `quality/no-direct-data-access` em `eslint.config.mjs`.

## Agendamento

- `computeSchedule(start, end, days)` (`src/domain/schedule.ts`) valida e devolve os minutos de abertura e dos 5 truques.
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
- `useInstallPrompt` (`src/state`) decide o modo do cartão: `prompt` (Chrome/Edge/Android), `ios` (passo a passo), `manual` ou `hidden` (instalado/dispensado).
- `src/services/web-reminders.ts` substitui o `expo-notifications` na web. Ele arma timers para as próximas 24 h e mostra a notificação pelo service worker, e `sw.js` abre `/trick/i` ao tocar.
- `(tabs)/_layout.web.tsx` usa abas JS na parte de baixo, porque as abas nativas viram uma pílula no topo da página na web.

## Dados

Uma chave AsyncStorage `habitus:data:v1` com `{ version, onboarded, settings, completions, gratitude }`. Tudo que é lido passa por `sanitizeData`, que descarta campos inválidos sem perder os válidos.

## Notas de plataforma

- Web é só preview visual: o serviço de notificações vira no-op e a permissão aparece como indisponível.
- Expo Go Android (58.0.5) não carrega o `expo-notifications` 58.x (falta `ExpoTopicSubscriptionModule`). No Android, use um development build.
- `android.permission.SCHEDULE_EXACT_ALARM` está declarada. Sem ela concedida, o Android 12+ usa alarmes inexatos com janela de até 1 h (medido no emulador). O Android 14+ começa negando, então Hoje e Ajustes mostram um aviso que abre a tela "Alarmes e lembretes" (`requestExactAlarmPermissionsAsync`). Depois da concessão, o plano é reagendado como exato.
- Permissão de notificação no Android 13+: antes do primeiro pedido, o sistema já informa `denied` com `canAskAgain: true`. `toPermissionState` trata isso como "ainda não perguntado".
