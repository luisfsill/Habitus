# Habitus — produto

## Problema e público

Pessoas que querem criar o hábito de pequenas práticas mentais ao longo do dia, mas esquecem de fazê-las. O Habitus distribui 5 práticas pelo horário ativo do usuário e lembra de cada uma na hora certa.

## Os 6 truques

1. **Sorria** — sorrir por alguns segundos, mesmo sem vontade.
2. **Postura de poder (2 min)** — em pé, firme, peito aberto, respirando fundo. Timer de 120 s.
3. **Metas em voz alta** — dizer as metas no presente, diante do espelho. Afirmações editáveis.
4. **Foco total (2 min)** — olhar fixamente para um objeto. Timer de 120 s.
5. **Gratidão antecipada** — agradecer pelo que ainda não chegou. Frase curta opcional.

6. **Antes de dormir** — já deitado, dizer: "Deus, universo, vida: me surpreenda positivamente amanhã." Chega na hora de dormir aprendida.

São apresentados como práticas de bem-estar. O app não faz afirmações médicas ou científicas.

## Regras

- Janela padrão 08:00–16:00, todos os dias. Fim depois do início, janela mínima de 1 h, ao menos um dia ativo.
- Truque `i` (0–4) no centro da sua fatia: `início + (i + 0,5) × D / 5`, arredondado ao minuto. 08:00–16:00 → 08:48, 10:24, 12:00, 13:36, 15:12.
- O 6º truque vai na hora de dormir: mediana das últimas 7 noites em que foi concluído (começa pela hora informada, padrão 23:00); −10 min por noite recente sem resposta (máx. −30); nunca antes de fim da janela + 30 min. Concluir até 06:00 conta para a noite anterior.
- Notificação de abertura no início da janela, com o horário do primeiro truque.
- Só os próximos 7 dias são agendados (máx. 49 + adiamentos, abaixo do limite de ~64 do iOS). Tudo é cancelado e reagendado ao mudar ajustes e sempre que o app volta ao primeiro plano.
- Truque concluído antes da hora não é mais notificado.
- Ações na notificação: "Feito" e "Adiar 10 min". Tocar abre a tela do truque.

## Gamificação

- XP: 10 por truque; 25 por dia perfeito (6 de 6) + 5 por dia de sequência (máx. +50); 150 por semana perfeita (todos os dias ativos, domingo a sábado).
- Nível n → n+1 custa 100 + 50 × (n − 1) XP.
- Patentes são faixas: Branca 1, Amarela 3, Laranja 5, Verde 8, Azul 12, Roxa 16, Marrom 21, Preta 27.
- 11 medalhas com progresso visível (`src/domain/achievements.ts`).
- XP e medalhas são recalculados do histórico; não há estado próprio salvo.
- Fora de escopo por exigir servidor: ligas e ranking entre usuários.

## Fluxos críticos

1. Onboarding: apresentação → janela com prévia ao vivo → permissão (explicada antes do pedido do sistema; se negada, aviso com atalho para Ajustes).
2. Hoje: anel de progresso 0/6–6/6, linha do tempo, próximo truque com contagem regressiva.
3. Truque: instrução, timer (2 e 4), afirmações (3), campo de gratidão (5), frase da noite (6), "Concluir".
4. Histórico: sequência de dias, calendário mensal, percentual da semana.
5. Ajustes: horários, hora de dormir, dias, afirmações, som, testes de notificação, aparência (automático/claro/escuro), reset.
6. Conquistas: nível, faixa, estatísticas, medalhas e regras de XP.
7. Web/PWA: cartão "Instale o Habitus" com "Instalar agora" na tela inicial.

## Fora de escopo

Login, sincronização entre aparelhos, push remoto (por isso o PWA só lembra com o app aberto), backend, janelas que atravessam a meia-noite.
