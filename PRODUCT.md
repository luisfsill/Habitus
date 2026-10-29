# Habitus — produto

## Problema e público

Pessoas que querem criar o hábito de pequenas práticas mentais ao longo do dia, mas esquecem de fazê-las. O Habitus distribui 5 práticas pelo horário ativo do usuário e lembra de cada uma na hora certa.

## As 6 dicas

1. **Sorria** — sorrir por alguns segundos, mesmo sem vontade. A câmera percebe o sorriso (ou segura-se o sol) e o sol nasce; cada dia planta uma flor na campina.
2. **Postura de poder (2 min)** — em pé, firme, peito aberto, respirando fundo. Timer de 120 s com guia de respiração; parado, a bandeira sobe a montanha, e cada sessão soma 300 m rumo aos picos.
3. **Metas em voz alta** — dizer as metas no presente, diante do espelho. Afirmações editáveis. Cada palavra dita acende e abre a névoa do lago; selos aos 7, 21 e 66 dias.
4. **Foco total (2 min)** — olhar fixamente para a fogueira e, no fim, soprar para apagar. Timer de 120 s.
5. **Gratidão antecipada** — agradecer pelo que ainda não chegou. A frase vira uma estrela no céu de gratidão da pessoa (365 por ano, uma constelação a cada 7 estrelas, uma por semana).

6. **Antes de dormir** — já deitado, dizer: "Deus, universo, vida: me surpreenda positivamente amanhã." Chega na hora de dormir aprendida. As palavras acendem com a voz (ou segurando a lua) e cada noite enche a lua uma fase; 8 noites fazem uma lua cheia.

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
- Na aba Meu dia da tela Hoje, a água ocupa uma linha: "N/M copos · faltam X", os botões −1 🥛 e +1 🥛 e uma barra fina.
- Sem metas "de saúde" (ex.: 2 litros): quem define a meta é a pessoa.

## Lembretes pessoais

- Além das dicas, a pessoa cria lembretes próprios (título, notas, data e hora), com antecipações (até 5, de 1 min a 7 dias) e repetição opcional (a cada N dias, semanas, meses ou anos).
- Ações na notificação: "Feito" e "Adiar 10 min". Concluídos ficam numa aba à parte; apagar não tem volta.
- Notificações dos próximos 60 dias, nas vagas que as dicas deixam livres no limite do sistema. Sincronizados pela conta.

## Gamificação

- XP: 10 por dica; 25 por dia perfeito (6 de 6) + 5 por dia de sequência (máx. +50); 150 por semana perfeita (todos os dias ativos, domingo a sábado); 15 por dia com a meta de água batida; 50 por lua cheia (8 noites de Antes de dormir).
- Nível n → n+1 custa 100 + 50 × (n − 1) XP.
- Patentes são faixas: Branca 1, Amarela 3, Laranja 5, Verde 8, Azul 12, Roxa 16, Marrom 21, Preta 27.
- 11 medalhas com progresso visível (`src/domain/achievements.ts`).
- XP e medalhas são recalculados do histórico; não há estado próprio salvo.
- Fora de escopo: ligas e ranking global.

## Amigos

- Cada conta tem um @ único (escolhido na tela "Escolha seu @"; troca em Ajustes > Conta). A busca acha por nome ou por @.
- Pedido de amizade com aceite, recusa, cancelamento, desfazer amizade e bloqueio. Aba Perfil sem ranking: o número de amigos no card (como seguidores) abre a lista, com pedidos e busca para adicionar mais. Pedidos pendentes também aparecem na tela Hoje.
- Perfil: nome, @, faixa e nível para todos; sequência e conquistas só para amigos. O e-mail nunca aparece. Administradores têm o selo dourado "Founder" (borda furta-cor no cartão) e não aparecem na busca de usuários comuns.
- "Aparecer na busca" em Ajustes > Conta: desligado, a pessoa some da busca e também não consegue buscar. Plano vencido sai da busca e do ranking, mas mantém as amizades.
- Avisos de pedido por Web Push, quando ativo. Avisos de depoimento também, quando ativo.
- Mural e depoimentos: no perfil de um amigo, os botões pequenos Amigos (menu com Desfazer amizade e Bloquear), Direct (abre a conversa) e Depoimento ficam lado a lado. O depoimento fica no Mural do perfil, que qualquer pessoa que abre o perfil lê. O Mural (no perfil de qualquer pessoa e na aba Perfil) mostra só os depoimentos recebidos. Publicar é no Feed: a tela Hoje tem duas abas, Meu dia (os hábitos) e Feed, e sempre abre em Meu dia. Quando alguém publica, a aba Feed ganha uma bolinha vermelha até a pessoa abri-la. O Feed tem a caixa "No que você está pensando?" (texto, foto ou os dois) no topo. O feed mostra o que os amigos publicaram e os depoimentos que receberam ("Ana recebeu um depoimento de Bia"). Quem escreveu ou o dono do mural apaga a publicação; quem escreveu também edita o texto pelo lápis ao lado da lixeira, e ela passa a mostrar "editado". Na caixa de publicar, a foto escolhida aparece como miniatura no canto e o texto ocupa o resto.

## Conversas

- Chat 1:1 só entre amigos, liberado direto (sem plano à parte). Texto aceita tudo que o teclado oferece (até 2000 caracteres), mais 12 figurinhas animadas (emojis do Noto, do Google) com som: cada figurinha nova, enviada ou recebida, dança grande no meio da tela uma vez, com o som dela, e depois fica pequena na conversa. Quem recebe vê a dança ao abrir a conversa. O som segue a opção Efeitos sonoros.
- Chamar atenção: a conversa treme, vibra e toca um som; um por vez a cada 30 s por conversa.
- "Digitando…", "visto" e contagem de não lidas no selo da aba. Avisos de mensagem por Web Push no PWA, quando ativo.
- Desfazer amizade deixa a conversa só para leitura. Bloquear a faz sumir para os dois, sem apagar as mensagens. Toque longo numa mensagem denuncia.
- A lista mostra só as conversas já iniciadas; o "+" ao lado do título abre "Nova conversa", com os amigos e busca por nome ou @. A conversa abre em tela própria, sem a barra de abas: voltar, foto e nome (abre o perfil por cima) e um campo que cresce, com figurinhas e chamar atenção dentro dele enquanto vazio e o botão de enviar quando há texto. No PC, Enter envia.
- Status como no MSN: anel verde (Disponível), amarelo (Ausente) ou vermelho (offline, app fechado ou Invisível) na foto dos amigos. Cada um escolhe o seu tocando na própria foto no topo de Conversas (no Invisível, o próprio anel fica cinza claro); só amigos veem.

## Fluxos críticos

1. Onboarding: apresentação → janela com prévia ao vivo → permissão (explicada antes do pedido do sistema; se negada, aviso com atalho para Ajustes).
2. Hoje: abas Meu dia (sempre a primeira a abrir) e Feed (bolinha vermelha quando há publicação nova). Meu dia tem água, os três próximos lembretes e a linha do tempo com a próxima dica em contagem regressiva; sequência, dicas do dia e faixa ficam no card do Perfil.
3. Dica: instrução, timer (2 e 4), afirmações (3), céu de gratidão (5), frase da noite (6), "Concluir".
4. Histórico: sequência de dias, calendário mensal, percentual da semana; fica no último segmento de Conquistas (`/history` redireciona para lá).
5. Ajustes: uma lista no estilo do Instagram, cada item com a própria tela: Conta (editar perfil com nome e @, aparecer na busca, e-mail, resetar dados, excluir conta), Horário (começo, fim e hora de dormir, com a linha do tempo das 6 dicas), Dias da semana (resumo, atalhos e um dia por linha), Sons e notificações (sons da dock, só na web, e sons de efeito, cada um com interruptor próprio e um "?" que explica o que ele cala; som das notificações e teste), Água (ligar, meta, intervalo), Afirmações e Aparência (auto/claro/escuro). Termos, Privacidade, Renovar plano e Sair ficam no menu da conta (foto no topo).
6. Conquistas: segmentos Ranking (abre nele), Medalhas e Histórico; nível, faixa, estatísticas, medalhas e regras de XP. Abas: Hoje, Conquistas, Conversas, Perfil e Ajustes.
7. Conta: criar conta (nome, e-mail, senha) ou entrar, código de 6 dígitos por e-mail, esqueci minha senha, aceite dos Termos de uso e da Política de privacidade. No celular a conta é criada depois de instalar.
8. Acesso: 7 dias grátis no cadastro; depois, planos por tempo (Mensal R$ 9,90, Trimestral R$ 24,90, Anual R$ 79,90). Vencido, só a tela "Seu plano acabou" com renovação pelo WhatsApp. Aviso nos 3 últimos dias do teste. Por enquanto o app está liberado para todos: a chave "App liberado para todos" (Admin › Planos) dá acesso a qualquer conta, esconde o aviso de teste e o "Renovar plano"; desligada, volta a valer o plano de cada conta.
9. Admin (`/admin`, só administradores, pelo item "Área admin" do menu do avatar): busca por nome/e-mail, liberação +30/+90/+365/ilimitado com Desfazer, ficha com dados, validade exata, cargo, nova senha e exclusão, criação de usuário com senha provisória, planos e preços, e convites (30 dias, 6 meses, 1 ano, ilimitado ou dias personalizados, para quantas pessoas o admin quiser; lotadas as vagas, o código para de valer): mensagem pronta para copiar com o link do site (sem o código) e os passos de resgate; o código funciona como um vale-presente: a pessoa baixa o app, cria a conta e resgata em Gift Code, no menu da foto (abaixo de Renovar plano; os dois somem enquanto o App liberado para todos estiver ligado), ou na tela "Seu plano acabou" quando o acesso venceu, e os dias somam à validade; o resgate abre a tela "Parabéns!" com um presente animado (Lottie, `assets/animations/gift.json`) Também pode ser digitado em "Tenho um código de convite" no cadastro (links antigos com `&convite=CÓDIGO` ainda preenchem esse campo). O histórico de convites mostra uma linha por pessoa que resgatou (o mesmo código se repete), com nome e e-mail.

## Fora de escopo

Pagamento automático (Mercado Pago/Pix/cartão), login social, push remoto (por isso o PWA só lembra com o app aberto), backend próprio, janelas que atravessam a meia-noite.
