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

- `computeSchedule(start, end, days, bedtime?)` (`src/domain/schedule.ts`) valida e devolve os minutos de abertura, das 5 dicas do dia e da 6ª (hora de dormir, em "minutos noturnos": 00:30 = 24:30).
- `estimateBedtime` (`src/domain/bedtime.ts`) aprende a hora de dormir a partir de `settings.bedtime` (resposta do usuário) e de `sleepLog` (noite → horário em que a dica 6 foi concluída, gravado por `withCompletion`). `scheduleFor(data, now)` junta tudo e é usado pela tela Hoje e pelo reagendamento.
- `planNotifications(schedule, now, { completed })` (`src/domain/notification-plan.ts`) gera as notificações futuras dos próximos 7 dias, com ids estáveis (`AAAA-MM-DD:trick:i`), pulando dicas já concluídas, com teto de 60.
- `rescheduleAll(data)` (`src/services/notifications.ts`) cancela as notificações do plano e agenda o plano de novo, com gatilhos `DATE`. Adiamentos (`…:snooze:…`) e testes (`test:…`) são preservados (`isOneOffId`). Roda ao iniciar, quando o app volta ao primeiro plano e a cada mudança de ajustes.
- `planTestRun(now, 5)` comprime um "dia" em 5 minutos para teste manual (ignora a janela mínima de propósito) e é somado ao plano real.
- Concluir uma dica cancela a notificação dela e os adiamentos dela no mesmo dia.
- Água (`src/domain/water.ts`): `waterMinutes(start, end, every, trickMinutes)` dá os horários do dia, pulando os que caem a menos de 10 min de uma dica. `planNotifications(..., { water })` acrescenta notificações `kind: "water"` (ids `AAAA-MM-DD:water:minutos`) nos dias em que a meta ainda não foi batida e, com a água ligada, usa horizonte de 3 dias (`WATER_HORIZON_DAYS`). `addWater` (estado) reagenda quando a contagem cruza a meta. Tocar no lembrete abre a tela Hoje.

### Lembretes pessoais

- Domínio em `src/domain/reminders.ts` (`Reminder`: `at` local `AAAA-MM-DDTHH:MM` como âncora, `leads` em minutos antes, `repeat` `{ every, unit }` ou `null`, `doneAt` no lembrete único, `doneThrough` na repetição, `updatedAt`, `deletedAt`). A n-ésima ocorrência é somada à âncora, nunca encadeada; mês e ano limitam o dia ao fim do mês. Textos em `reminder-text.ts`.
- `planReminderNotifications(reminders, now, { slots, until })` (`notification-plan.ts`) gera os alertas das ocorrências dos próximos 60 dias (`REMINDER_HORIZON_DAYS`): um por antecipação mais um na hora (`lead` 0), do mais próximo ao mais distante. Ids `rem:<id>:<ocorrência>:<lead>` (`reminderAlert`); adiamentos `rem:<id>:<ocorrência>:snooze:<ms>` (`reminderSnooze`, 10 min, com título e texto refeitos para a nova hora: um adiamento que cai na hora ou depois diz "Agora"), preservados por `isOneOffId` e cancelados junto com a ocorrência.
- Vagas: `planAll` (`notification-plan.ts`, chamado por `rescheduleAll`) planeja as dicas primeiro e dá aos lembretes só o que sobra do teto de 60 (`slots = MAX_PENDING_NOTIFICATIONS - dicas`). Como o app replaneja ao abrir, os alertas mais distantes entram à medida que as vagas liberam. Hora inválida das dicas não bloqueia os lembretes.
- Ações: categoria `reminder` (alerta na hora: "Feito" e "Adiar 10 min") e `reminder-lead` (antecipação: "Ok" e "Adiar 10 min"). `interpretResponse` devolve `open-reminder`, `reminder-done`, `reminder-snooze` ou `dismiss`; tocar abre `/lembretes/<id>?occ=<ocorrência>&lead=<min>` (`reminderUrl`; `open-reminder` leva `occurrence` e `lead`). Nessa tela, "Marcar como feito" conclui aquela ocorrência (não a próxima) e, se ela ainda não foi feita, há "Adiar 10 min" (`snoozeReminder`), o único caminho de adiar na web. `applyResponse` (`notification-responses.ts`) grava o "Feito" no AsyncStorage (`markReminderDoneInStorage`) e cancela os alertas daquela ocorrência (`cancelReminderOccurrence`); o adiamento relê o texto dos dados (`scheduleReminderSnooze`).
- Estado em `src/state/use-reminders.ts` (`saveReminder`, `completeReminder`, `reopenReminder`, `deleteReminders`): cada ação monta o próximo `AppData` e confirma com `commit`, que salva, reagenda e sincroniza. Editar um lembrete existente, concluir e apagar cancelam antes os alertas dele (`cancelReminder`); criar não precisa. Apagar grava lápide (`deletedAt`); as lápides com mais de 30 dias (`TOMBSTONE_DAYS`) saem em `sanitizeReminders`.

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
- Carregamento rápido: `vercel.json` marca `/_expo/static/*` e `/assets/*` (nomes com hash) como `immutable` por um ano. O `sw.js` serve esses arquivos do cache primeiro; páginas vão à rede primeiro e, se a rede passar de 3 s, usam a cópia em cache. Pedidos com `Range` (vídeos) e os bundles do servidor de dev (`*.bundle`) não passam pelo service worker, para o dev nunca receber um bundle antigo do cache.
- `metro.config.js` tira `.claude/` (worktrees de agentes, cada um com seu `node_modules`) e `.superpowers/` do Metro. Sem isso, o servidor de dev do checkout principal varria e vigiava essas cópias e levava mais de um minuto para servir a página.
- Ícones na web: `src/components/icon.web.tsx` usa `assets/fonts/icons.ttf`, um subconjunto dos Material Symbols (~19 KB em vez de ~970 KB). Ícone novo: rode `node scripts/build-icon-font.mjs` (precisa de `pip install fonttools`); o teste `icon-glyphs.test.ts` acusa quando falta.
- O boot não espera `rescheduleAll` (na web ele fala com o servidor de push); as chamadas a `rescheduleAll` rodam uma de cada vez, na ordem.
- No celular pelo navegador (`isMobileWeb() && !isStandalone()`), o layout raiz mostra `InstallGate`: a mesma `LandingPage` do computador, mas "Entrar" e "Começar" abrem um aviso para instalar o app, o botão principal da barra do topo é "Instalar app" e uma barra fixa embaixo traz "Instalar o app". Não dá para entrar pelo navegador do celular; o app em si roda no computador ou instalado. As páginas `/legal/*` abertas pela landing passam direto. Em desenvolvimento (`__DEV__`, ou seja `npm run dev` no localhost ou no IP da rede), a tela de instalação aparece só em "/" sem login, e ali "Entrar" e "Começar" abrem o login em modal, para testar tanto a instalação quanto o app no navegador do celular. As outras rotas (como "/auth") abrem direto.
- No computador, sem login e em `/`, o layout raiz mostra `LandingPage` no lugar do Stack (sem o redirecionamento para `/auth`). "Entrar" e "Começar grátis" abrem um diálogo (`DesktopLanding` e `LoginFrame` em `src/components/landing-modal.tsx`) com a própria tela de login num `iframe` (`/auth`, marcado com `data-login`). O diálogo fica montado e escondido (`visibility: hidden`) desde que a página abre, então o login já está carregado no primeiro clique e o diálogo abre e fecha sem animação; o botão clicado escreve a aba em `data-mode` no `iframe` e avisa a tela por `postMessage` (`onLoginModalMode`). Dentro dele (`inLoginModal`), o endereço da janela não acompanha o app, e ao entrar o `iframe` recarrega a janela (`leaveLoginModal`), que com a sessão salva abre o app na moldura de celular. Os links legais fazem navegação completa para `/legal/*`. Logado, `/` continua sendo a tela Hoje.
- `useInstallPrompt` (`src/state`) decide o modo do cartão: `prompt` (Chrome/Edge/Android), `ios` (passo a passo), `manual` ou `hidden` (instalado/dispensado).
- Na web, os lembretes vão por Web Push quando possível (`src/services/web-push.ts`): com permissão concedida, `rescheduleAll` inscreve o navegador (chave pública `EXPO_PUBLIC_VAPID_PUBLIC_KEY`) e salva a inscrição em `push_subscriptions`; o plano vira linhas de `push_queue` (`pushRow`, mesmos ids do plano) e cancelar apaga as linhas. A Edge Function `push-send`, chamada de minuto em minuto pelo `pg_cron` (`supabase/push.sql`), envia as linhas vencidas e as apaga; atrasadas mais de 15 min são descartadas; inscrições que respondem 404/410 são removidas. `sw.js` mostra o push e abre a `url` da linha ao tocar (`/trick/i`, `/` ou `/lembretes/<id>?occ=…&lead=…`). Ao sair da conta, o navegador é desinscrito (`forgetPushDevice`).
- Sem Web Push (sem chave, sem service worker ou navegador sem suporte), `src/services/web-reminders.ts` arma timers para as próximas 24 h e mostra a notificação pelo service worker; só funciona com o app aberto ou minimizado há pouco.
- `(tabs)/_layout.web.tsx` usa as abas headless do `expo-router/ui` (`Tabs`, `TabSlot`, `TabList` escondida com um `TabTrigger` por aba) e desenha a `LiquidNavbar` (`src/components/ui`, só DOM), porque as abas nativas viram uma pílula no topo da página na web e as abas do React Navigation cortam o conteúdo (`overflow: hidden`), o que impediria a página de rolar como documento.

## Conta e sincronização

- `src/services/supabase.ts` cria o cliente com `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `EXPO_PUBLIC_SUPABASE_KEY`). Sem elas, `supabase` é `null` e o layout mostra "Configuração do servidor ausente". A sessão fica no AsyncStorage pelo adaptador `authStorage` de `storage.ts`.
- `TransitionProvider` (`src/state/transition.tsx`): cortina animada ao entrar e sair. Observa a troca entre "sem sessão" e "com sessão" (ignorando a sessão temporária da recuperação de senha) e só tira a cortina depois que a animação tocou inteira, a troca aconteceu e o app remontado terminou de carregar (`useCurtainHold`, chamado no `RootStack`). A cortina sobe no mesmo render da troca, não num efeito: o app remontado não desenha nada enquanto carrega, e esse quadro vazio aparecia como um clarão do fundo claro. `useSignOut` chama `begin("out")` antes de sincronizar e `cancel()` se a pessoa desistir.
- `AuthProvider` (`src/state/auth.tsx`): criar conta (`signUp` grava `terms_version` e `terms_accepted_at` nos metadados), confirmar com o código (`verifyOtp` tipo `email`), entrar, esqueci a senha (`resetPasswordForEmail` → `verifyOtp` tipo `recovery` → `updateUser`), sair e excluir conta (RPC `delete_my_account`). Erros viram português em `authErrorMessage` (`src/domain/auth-rules.ts`). Os e-mails levam código, não link: no iPhone o link abriria o Safari, fora do PWA instalado.
- Rotas (`src/app/_layout.tsx`): sem sessão (ou no meio da troca de senha, `recovering`) só `auth/*`; com sessão e sem onboarding, `onboarding`; senão as abas. `legal/*` abre em qualquer estado. O `AppStateProvider` é remontado por conta (`key = userId`).
- Sync (`src/services/sync.ts` + `AppStateProvider`): `pushMerged` lê o registro do servidor, aplica `mergeData` (`src/domain/sync.ts`) e grava. Roda ao abrir (sem esperar a rede, exceto num aparelho sem dados da conta, até 8 s), ao voltar ao primeiro plano e 2 s depois de cada mudança; sem internet fica pendente (`syncPending`). `mergeData` só soma: completions unidas por dia, gratidão e sono por dia com o local vencendo, `settings` pelo `settingsUpdatedAt` maior (hora de dormir diferente leva o `sleepLog` do lado vencedor, recomeçando o aprendizado), `onboarded` se qualquer lado for verdadeiro, `reminders` por id (`mergeReminders`: vence o `updatedAt` maior, edição ou lápide; empate fica com o local). "Resetar dados" grava `resetAt`; a cópia com o `resetAt` maior vence qualquer mesclagem, neste e nos outros aparelhos.
- Os dados locais levam `owner` (id da conta). `claimData` descarta dados de outra conta ao entrar; sem sessão o app usa dados vazios e não agenda lembretes.
- Sair envia o que falta (se não der, pede confirmação), apaga os dados locais e cancela as notificações. No navegador, a janela inteira (não só a moldura do computador) volta para `/`, onde aparece a landing (`leaveToLanding` em `src/state/desktop-frame.ts`); o app instalado fica na tela de login.

## Acesso e administração

- Banco (`supabase/admin.sql`): `profiles` (nome, e-mail, `role`, `plan` trial/paid, `access_until`, `unlimited`), criado por gatilho no cadastro com 7 dias (ou, com convite válido em `raw_user_meta_data.invite`, plano `paid` com os dias do convite ou ilimitado; o gatilho marca o convite como usado); `plans` com os preços. Clientes só leem (`profiles`: o próprio ou tudo se admin). Mudanças só por funções `security definer` que checam `is_admin()` (`admin_set_access`, `admin_set_role`, `admin_update_name`, `admin_delete_user`, `admin_save_plan`, `admin_create_invite`, `admin_delete_invite`) e `update_my_name`. `invites`: código de 10 caracteres, uso único, link válido por 7 dias; só admin lê; `check_invite` (também para `anon`) deixa a tela de cadastro conferir o código antes de criar a conta. `user_data` só aceita gravação com `has_access()`.
- Edge Function `supabase/functions/admin-users` (Deno): criar usuário com senha provisória, trocar e-mail, gerar nova senha. Confere `is_admin` com o token de quem chama; a `service_role` só existe no Supabase.
- Regras puras em `src/domain/access.ts` (tem acesso, status, dias restantes, somar dias, fim do dia em São Paulo, busca sem acento, URL do WhatsApp, preço).
- `AccessProvider` (`src/state/access.tsx`) lê o próprio perfil ao abrir e ao voltar ao primeiro plano e guarda cópia local (`habitus:profile:v1`). Sem cópia e sem rede: tela "Sem conexão". Sem acesso: só `/renovar` (e `legal/*`). Os lembretes são agendados só até `access_until` (`setAccessCutoff`).
- Painel: `src/app/(tabs)/admin/*` (lista, `user/[id]`, `plans`, `invites`), aba sempre escondida da barra (`hidden` no NativeTabs; fora da navbar na web), aberta pelo item "Área admin" do menu do avatar, que só aparece para `role = admin`; o layout do grupo redireciona quem não é admin.

## Amigos

- Banco (`supabase/social.sql`, rodar depois de `admin.sql`; `push.sql` é opcional): `@usuário` e "Aparecer na busca" em `profiles`, `public_stats` (XP da semana, nível, faixa, sequência e conquistas, gravada pelo app), `friendships`, `blocks` e `friend_request_log`. Clientes só leem o que é seu; todo o resto passa por funções `security definer` (`search_users`, `send_friend_request`, `respond_friend_request`, `cancel_friend_request`, `remove_friend`, `block_user`, `unblock_user`, `my_friends`, perfil de outra pessoa). Busca e ranking excluem administradores (para usuários comuns), contas escondidas, bloqueios nos dois sentidos e contas sem acesso (`has_access()`); o perfil por id e os pedidos continuam funcionando para relações já existentes; `my_friends` mantém o amigo vencido na lista, mas o tira do ranking. A regra do @ vive em `src/domain/username.ts` e é repetida no SQL, que é a fonte da verdade. O e-mail nunca sai por nenhuma função.
- Domínio puro: `src/domain/username.ts` (validar, normalizar, reservados, sugestão) e `src/domain/friends.ts` (relação, ordenação do ranking, XP da semana).
- `src/services/social.ts`: chamadas RPC e gravação de `public_stats`. `src/state/use-friends.ts` alimenta a aba e a contagem de pedidos do badge.
- Telas: `/arroba` ("Escolha seu @", obrigatória para contas sem @), aba Amigos (`(tabs)/amigos`: ranking da semana, pedidos, amigos, `buscar` e o perfil `[id]`) e, em Ajustes > Conta, o @ editável e "Aparecer na busca".
- Ajustes (`(tabs)/settings`) é uma lista única no estilo do Instagram, com Conta primeiro; cada item abre a própria tela: `[section]` (horario com hora de dormir, dias, afirmacoes, notificacoes, agua, aparencia), `conta` e `perfil` (nome e @).
- Avisos de pedido e aceite entram em `push_queue` com ids `social:<tipo>:<id>`. Esses ids só saem da fila pela `push-send`: `unqueuePush` (cancelamento de lembretes) nunca os apaga (`isSocialPushId`).
- shortcut: o XP da semana é calculado no aparelho e publicado em `public_stats`, então pode ser inflado pela API. Aceitável só para o ranking entre amigos; o ranking global não usa esse valor.
- Registro do ranking (`supabase/ranking.sql`, depois de `social.sql`): como o XP do aparelho pode ser forjado, o servidor guarda a própria cópia (`ranking_tricks`, `ranking_water`, `ranking_settings`), preenchida por um trigger em `user_data` (o app já sincroniza ali, sem chamada nova; marcar dica offline continua valendo). Só entram dias de hoje (UTC) - 2 a hoje + 1, com horário do servidor; dicas nunca são apagadas, e a meta de água fica congelada no primeiro registro do dia. Um `resetAt` maior limpa o registro. `global_ranking(today)` calcula o XP da semana a partir dessa cópia com `week_xp_of`, que espelha `weekXp` (`src/domain/ranking.ts`); os dois rodam os mesmos vetores. O trigger nunca falha a gravação de `user_data`.

## Dados

Uma chave AsyncStorage `habitus:data:v1` com `{ version, onboarded, settings, settingsUpdatedAt, resetAt, owner, completions, gratitude, sleepLog, water, reminders }` (`water`: dia → `{ cups, at }`; `settings.water`: `{ enabled, goal, everyMinutes }`; `reminders`: id → `Reminder`, com apagados guardados como lápide por 30 dias). Na sincronização, para cada dia vence a contagem alterada por último (`at`), para um "−1" não ser desfeito (`mergeWaterLog`), o mesmo JSON guardado em `user_data.data`. A dica 6 concluída depois da meia-noite é gravado na noite anterior (`trickDayKey`). Tudo que é lido passa por `sanitizeData`, que descarta campos inválidos sem perder os válidos.

## Notas de plataforma

- Web é só preview visual: o serviço de notificações vira no-op e a permissão aparece como indisponível.
- Expo Go Android (58.0.5) não carrega o `expo-notifications` 58.x (falta `ExpoTopicSubscriptionModule`). No Android, use um development build.
- `android.permission.SCHEDULE_EXACT_ALARM` está declarada. Sem ela concedida, o Android 12+ usa alarmes inexatos com janela de até 1 h (medido no emulador). O Android 14+ começa negando, então Hoje e Ajustes mostram um aviso que abre a tela "Alarmes e lembretes" (`requestExactAlarmPermissionsAsync`). Depois da concessão, o plano é reagendado como exato.
- Permissão de notificação no Android 13+: antes do primeiro pedido, o sistema já informa `denied` com `canAskAgain: true`. `toPermissionState` trata isso como "ainda não perguntado".
