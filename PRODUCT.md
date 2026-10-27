# Habitus — produto

## Problema e público

Pessoas que querem criar o hábito de pequenas práticas mentais ao longo do dia, mas esquecem de fazê-las. O Habitus distribui 5 práticas pelo horário ativo do usuário e lembra de cada uma na hora certa.

## As 6 dicas

1. **Sorria** — sorrir por alguns segundos, mesmo sem vontade.
2. **Postura de poder (2 min)** — em pé, firme, peito aberto, respirando fundo. Timer de 120 s.
3. **Metas em voz alta** — dizer as metas no presente, diante do espelho. Afirmações editáveis.
4. **Foco total (2 min)** — olhar fixamente para a fogueira e, no fim, soprar para apagar. Timer de 120 s.
5. **Gratidão antecipada** — agradecer pelo que ainda não chegou. Frase curta opcional.

6. **Antes de dormir** — já deitado, dizer: "Deus, universo, vida: me surpreenda positivamente amanhã." Chega na hora de dormir aprendida.

São apresentados como práticas de bem-estar. O app não faz afirmações médicas ou científicas.

## Regras

- Janela padrão 08:00–16:00, todos os dias. Fim depois do início, janela mínima de 1 h, ao menos um dia ativo.
- Dica `i` (0–4) no centro da sua fatia: `início + (i + 0,5) × D / 5`, arredondado ao minuto. 08:00–16:00 → 08:48, 10:24, 12:00, 13:36, 15:12.
- A 6ª dica vai na hora de dormir: mediana das últimas 7 noites em que foi concluído (começa pela hora informada, padrão 23:00); −10 min por noite recente sem resposta (máx. −30); nunca antes de fim da janela + 30 min. Concluir até 06:00 conta para a noite anterior.
- Notificação de abertura no início da janela, com o horário da primeira dica.
- Só os próximos 7 dias são agendados (máx. 49 + adiamentos, abaixo do limite de ~64 do iOS). Tudo é cancelado e reagendado ao mudar ajustes e sempre que o app volta ao primeiro plano.
- Dica concluída antes da hora não é mais notificada.
- Ações na notificação: "Feita" e "Adiar 10 min". Tocar abre a tela da dica.

## Água (opcional)

- Desligada por padrão; a pessoa liga em Ajustes → Água. Meta do dia em copos (1–20, padrão 8) e intervalo dos lembretes (30 min a 4 h, padrão 1h30).
- Lembretes a cada intervalo depois do início do dia, até o fim do dia; um lembrete a menos de 10 min de uma dica é pulado. Param no dia em que a meta é batida.
- Com a água ligada, só os próximos 3 dias são agendados (em vez de 7), para caber no limite de ~64 do iOS. O app reagenda ao abrir.
- Na tela Hoje, a seção Água mostra "N de M copos", uma barra e os botões −1 🥛 e +1 🥛.
- Sem metas "de saúde" (ex.: 2 litros): quem define a meta é a pessoa.

## Lembretes pessoais

- Além das dicas, a pessoa cria lembretes próprios (título, notas, data e hora), com antecipações (até 5, de 1 min a 7 dias) e repetição opcional (a cada N dias, semanas, meses ou anos).
- Ações na notificação: "Feito" e "Adiar 10 min". Concluídos ficam numa aba à parte; apagar não tem volta.
- Notificações dos próximos 60 dias, nas vagas que as dicas deixam livres no limite do sistema. Sincronizados pela conta.

## Gamificação

- XP: 10 por dica; 25 por dia perfeito (6 de 6) + 5 por dia de sequência (máx. +50); 150 por semana perfeita (todos os dias ativos, domingo a sábado); 15 por dia com a meta de água batida.
- Nível n → n+1 custa 100 + 50 × (n − 1) XP.
- Patentes são faixas: Branca 1, Amarela 3, Laranja 5, Verde 8, Azul 12, Roxa 16, Marrom 21, Preta 27.
- 11 medalhas com progresso visível (`src/domain/achievements.ts`).
- XP e medalhas são recalculados do histórico; não há estado próprio salvo.
- Fora de escopo por exigir servidor: ligas e ranking entre usuários.

## Fluxos críticos

1. Onboarding: apresentação → janela com prévia ao vivo → permissão (explicada antes do pedido do sistema; se negada, aviso com atalho para Ajustes).
2. Hoje: anel de progresso 0/6–6/6, linha do tempo, próxima dica com contagem regressiva.
3. Dica: instrução, timer (2 e 4), afirmações (3), campo de gratidão (5), frase da noite (6), "Concluir".
4. Histórico: sequência de dias, calendário mensal, percentual da semana.
5. Ajustes: horários, hora de dormir, dias, afirmações, som, testes de notificação, água (ligar, meta, intervalo), aparência (auto/claro/escuro), conta (Termos, Política, sair, excluir conta), reset.
6. Conquistas: nível, faixa, estatísticas, medalhas e regras de XP.
7. Web/PWA: cartão "Instale o Habitus" com "Instalar agora" na tela inicial.
8. Conta: criar conta (nome, e-mail, senha) ou entrar, código de 6 dígitos por e-mail, esqueci minha senha, aceite dos Termos de uso e da Política de privacidade. No celular a conta é criada depois de instalar.
9. Acesso: 7 dias grátis no cadastro; depois, planos por tempo (Mensal R$ 9,90, Trimestral R$ 24,90, Anual R$ 79,90). Vencido, só a tela "Seu plano acabou" com renovação pelo WhatsApp. Aviso nos 3 últimos dias do teste.
10. Admin (aba e `/admin`, só administradores): busca por nome/e-mail, liberação +30/+90/+365/ilimitado com Desfazer, ficha com dados, validade exata, cargo, nova senha e exclusão, criação de usuário com senha provisória, planos e preços.

## Fora de escopo

Pagamento automático (Mercado Pago/Pix/cartão), login social, push remoto (por isso o PWA só lembra com o app aberto), backend próprio, janelas que atravessam a meia-noite.
