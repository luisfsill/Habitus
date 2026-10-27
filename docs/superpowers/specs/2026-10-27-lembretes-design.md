# Lembretes pessoais — design

Data: 27/10/2026. Mockups aprovados em `.superpowers/brainstorm/16-1793073519/content/` (`today-section.html` opção B, `form-v2.html`, `all-reminders.html`).

## Intenção

Hoje o Habitus só lembra das 6 dicas e da água. O dono do app quer um **lembrete universal**: "estudar às 17h", "ler um livro", "comprar pão", "renovar a CNH". A pessoa escreve o que é, escolhe data e hora exatas, pede avisos antecipados livres e uma repetição livre. Tem que ser completo e com design impecável, moderno e coerente com o resto do app ([design.md](../../design.md)).

## Metas

- Criar, editar, concluir, desfazer e apagar lembretes com título, descrição, data, hora, antecipações e repetição.
- Notificação na hora exata, mais uma notificação para cada antecipação, inclusive com o app fechado (nativo e PWA com Web Push).
- Ações na notificação: **Feito** e **Adiar** no aviso da hora; **Ok** e **Adiar** no aviso antecipado.
- Lembretes sincronizados entre aparelhos pela conta, como o resto dos dados.
- Seção na aba Hoje e uma tela "Lembretes" com Próximos e Concluídos.

## Não-metas

- Nenhuma aba nova na barra de navegação.
- Lembretes **não** dão XP, sequência, medalhas nem entram no histórico das dicas.
- Sem listas compartilhadas, categorias, cores por lembrete, anexos, localização ou integração com calendário do sistema.
- Sem mudança no banco do Supabase: tudo vive no JSON de `user_data.data`.

## Anti-metas (falha mesmo funcionando)

- Visual genérico ou fora do padrão do app (cards, sombras pesadas, cores fora do tema).
- Lembrete apagado que "ressuscita" depois da sincronização com outro aparelho.
- Aviso que não chega, ou chega duplicado no mesmo aparelho, por causa de repetição ou do teto de notificações. (Entre aparelhos diferentes da mesma conta, o comportamento é o mesmo das dicas hoje: cada aparelho agenda a sua cópia. Decisão minha; coordenar aparelhos fica fora deste trabalho.)
- Notificações das dicas deixando de ser agendadas porque os lembretes ocuparam o espaço.

## Onde fica

- **Aba Hoje → seção "LEMBRETES"** (opção B do mockup): rótulo em caixa alta com o link "Ver todos" à direita. O **próximo** lembrete aparece em destaque, com "Próximo · hoje às 17:00", o título grande, uma contagem regressiva grande na cor de destaque e uma barra fina de progresso. Abaixo vêm **os 2 seguintes** em linhas (hora em cima e dia embaixo à esquerda, título, seta) e uma linha "+ Novo lembrete". Sem nenhum lembrete pendente, a seção mostra só "+ Novo lembrete" com uma frase curta.
- **Tela "Lembretes"** (rota empilhada, sem aba), aberta por "Ver todos":
  - No topo, um controle segmentado **Próximos | Concluídos** e "＋" no cabeçalho.
  - **Próximos:** agrupados por Hoje, Amanhã e depois por mês. Cada linha tem a hora, o dia (quando não é hoje nem amanhã), o título e um resumo ("↻ toda semana · antecipa 1 h 30"). Tocar abre a edição; deslizar mostra **Feito** e **Apagar**. Botão fixo "+ Novo lembrete" no rodapé (`pinned`).
  - **Concluídos:** agrupados por mês da conclusão, com o título apagado (riscado) e "Feito em 25 out, 10:12". Cada item pode ser **reaberto** ("Desfazer feito"). "Selecionar" liga a seleção com círculos, "Selecionar todos" e uma barra flutuante "N selecionados · Apagar". Apagar pede confirmação (`confirm` de `src/state`).
- **Tela "Novo lembrete" / "Editar lembrete"** (modal ou rota empilhada; Cancelar e Salvar no topo):
  - Título (obrigatório) e Descrição (opcional, várias linhas).
  - **Quando:** Data e Hora. Usa os seletores que já existem (`TimeField`/`WheelTime` para a hora; para a data, o equivalente nativo e uma roleta de dia/mês/ano na web).
  - **Antecipar:** uma lista de antecipações. Cada linha mostra o valor ("1 dia antes") e pode ser removida. "+ Adicionar antecipação" abre **roletas dias · horas · minutos** no mesmo estilo do `WheelTime`. Embaixo, uma nota de rodapé lista todos os avisos: "Você recebe 3 avisos: seg 16:00, ter 15:30 e ter 17:00".
  - **Repetir:** interruptor (`ToggleSwitch`) e "A cada N **dias | semanas | meses | anos**", escolhido na mesma roleta. Embaixo, as próximas 3 datas.
  - Em edição: ações no fim, **Marcar como feito** e **Apagar lembrete** (vermelho), como `ActionRow`.

## Regras (todas em `src/domain`, puras e testadas)

- **Lembrete**: `{ id, title, notes, at (data/hora local da próxima ocorrência), leads: minutos[] , repeat: { every: N, unit: "day"|"week"|"month"|"year" } | null, doneAt: ISO | null, updatedAt, deletedAt: ISO | null }`. O formato exato fica a critério do construtor.
- **Antecipação**: de **1 minuto a 7 dias** (decisão minha, não discutida; o pedido original falava em "até 1 dia", mas "1 dia antes" foi citado como exemplo comum e 7 dias cobre "renovar a CNH"). Sem duplicatas; no máximo 5 por lembrete (decisão minha). Uma antecipação que já passou na hora de salvar é ignorada para aquela ocorrência.
- **Repetição**: de 1 dia a 1 ano (dias 1–365, semanas 1–52, meses 1–12, anos 1). Mensal no dia 31 cai no último dia dos meses curtos, e 29/02 anual cai em 28/02 nos anos comuns (decisão minha), sem "escorregar" a data base.
- **Feito**:
  - Sem repetição: grava `doneAt`; o lembrete vai para Concluídos e os avisos pendentes são cancelados.
  - Com repetição: avança `at` para a próxima ocorrência futura. *Não* vai para Concluídos (decisão minha: só lembretes únicos entram lá).
  - Desfazer feito volta para Próximos. Se a data já passou, ele aparece como **atrasado** (rótulo vermelho "Atrasado") até ser feito, editado ou apagado.
- **Ocorrência que passou sem "Feito"**:
  - Sem repetição: fica em Próximos como atrasado.
  - Com repetição: a próxima ocorrência é **calculada na hora** a partir de `at` e da regra; `at` pode ficar no passado no armazenamento e só é gravado de novo em Feito ou edição (decisão minha: evita gravações e conflitos de sincronização a cada reagendamento).
- **Adiar**: 10 minutos (`SNOOZE_MINUTES`, o mesmo das dicas), tanto no aviso antecipado quanto no da hora.
- **Textos da notificação**:
  - Antecipada: título "Daqui a 1 h 30: Estudar inglês" (ou "Amanhã às 17:00: …" e "Ter, 3 nov às 17:00: …" quando faltar mais de 1 dia) e corpo com o horário.
  - Da hora: título "Agora: Estudar inglês" e corpo com a descrição (ou o horário, se não houver descrição).
  - Formatadores puros e testados.

## Notificações

- Entram em `planNotifications` como `kind: "reminder"`, com ids estáveis por ocorrência e antecipação (ex.: `rem:<id>:<ocorrênciaISO>:<leadMin>`), para cancelar e reagendar sem duplicar.
- **Teto**: o plano tem teto de 60 (`MAX_PENDING_NOTIFICATIONS`; o iOS aceita 64). Os lembretes ganham uma **cota própria** (sugestão: até 20, as mais próximas primeiro), e as dicas e a água continuam com o restante. Assim os lembretes nunca derrubam as dicas. Lembretes distantes entram no plano conforme se aproximam, porque `rescheduleAll` roda ao abrir, ao voltar ao primeiro plano e a cada mudança. Horizonte: as próximas ocorrências dentro de ~60 dias (decisão do construtor).
- **Ações**: nova categoria com Feito/Adiar (hora) e Ok/Adiar (antecipada). `interpretResponse` ganha os intents de lembrete; o Android aplica em background pela tarefa headless (`applyResponse`), e o iOS abre o app, como já é feito hoje. Tocar na notificação abre a edição do lembrete.
- **Web/PWA**: o mesmo plano vira linhas de `push_queue` (`pushRow`), e o `sw.js` abre a tela do lembrete ao tocar. Na web a notificação **não tem botões** (igual às dicas hoje); Feito e Adiar ficam na tela que abre (decisão minha: botões no service worker exigiriam autenticação e gravação no servidor). O fallback `web-reminders.ts` (timers) também cobre os lembretes.
- **Acesso**: respeita `setAccessCutoff` como os outros avisos (sem acesso, nada é agendado depois de `access_until`).

## Sincronização

- Novo campo em `AppData`: `reminders: Record<id, Reminder>`, que passa por `sanitizeData`.
- `mergeData`: por id, vence o `updatedAt` maior. **Apagar grava `deletedAt` (lápide)** em vez de remover a chave, senão o outro aparelho traria o lembrete de volta. Lápides com mais de 30 dias são removidas na sanitização (decisão minha).
- "Resetar dados" apaga os lembretes também (já coberto por `resetAt`).

## Visual

- Segue [design.md](../../design.md): fundo liso, `Section` com rótulo em caixa alta e divisórias finas, sem cards, `ActionRow`, `ToggleSwitch`, cores do tema (`accent`, `accentText`, `danger`, `success`), tipografia nos estilos do iOS, alvos de 44 pt, háptico leve na seleção e de sucesso no "Feito", animação curta e nada com "reduzir movimento".
- A contagem regressiva do destaque reaproveita `useCountdown`/`useNow`.
- Ícones de `src/components/icon.tsx` (SF Symbols / Material Symbols). Sem emoji.
- Acessibilidade: todo controle tem `accessibilityLabel` em português; as roletas são ajustáveis por leitor de tela; a contagem fica fora da live region para não ficar falando.
- Claro e escuro conferidos nos dois temas.

## Deixado para o construtor

- Formato exato dos tipos, ids e nomes de arquivos; respeitando 350 linhas por arquivo e as camadas do ESLint.
- Modal ou rota empilhada para o formulário; gesto de deslizar no nativo e na web.
- Roleta de data na web (pode reaproveitar `@ncdai/react-wheel-picker`).
- Horizonte e cota exatos do plano, desde que dicas e água nunca percam espaço.

## Verificação

- Testes em `src/domain` para:
  - próxima ocorrência (dia, semana, mês com dia 31, ano com 29/02);
  - horários dos avisos com antecipações;
  - plano com cota e teto;
  - textos das notificações;
  - `mergeData` com edição concorrente e lápide;
  - `sanitizeData` dos lembretes.
- `npm run check` limpo.
- Conferência visual na web (claro e escuro, celular e computador) e notificação de teste disparando com Feito/Adiar.
- `docs/architecture.md` e `docs/design.md` atualizados.
