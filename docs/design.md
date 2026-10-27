# Design

## Origem

Design system gerado com a skill **ui-ux-pro-max** (plugin de projeto, v2.15.0):

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py "wellness habit reminder mindfulness app, Apple iOS style, minimal" --design-system -p "5 Truques" --json
```

No Windows, `python3` é só o alias da Microsoft Store; use `python`. Com o plugin instalado pelo marketplace, o script fica em `~/.claude/plugins/cache/ui-ux-pro-max-skill/ui-ux-pro-max/<versão>/src/ui-ux-pro-max/scripts/search.py`.

Resultado: categoria "Meditation & Mindfulness", paleta lavanda + verde, estilo neumórfico e fontes Lora/Raleway.

## O que foi adotado e o que foi adaptado

| Recomendação | Decisão | Motivo |
|---|---|---|
| Primária `#7C3AED`, verde `#059669` | Adotada como destaque e cor de "feito" | Calma, boa leitura; no escuro viram `#A78BFA` e `#34D399` |
| Neumorfismo | Trocado por materiais translúcidos (`expo-blur`) e sombras sutis | Briefing pede estilo Apple; neumorfismo tem risco alto de contraste |
| Lora / Raleway | Trocadas pela fonte do sistema (SF Pro no iOS, Roboto no Android) | HIG e Dynamic Type |
| Padrão de landing page (hero + depoimentos) | Não se aplica | É um app, não uma landing page |

Cores de apoio: verde (concluído) e âmbar `#B45309`/`#FBBF24` (sequência). Tokens em `src/theme/index.ts`.

## Aparência

Ajustes → Aparência: **Automático** (segue o aparelho, padrão), **Claro** ou **Escuro**. A escolha fica em `settings.theme`. `useTheme` lê a preferência por `ThemePreferenceContext`, fornecido no layout raiz. No iOS/Android, `Appearance.setColorScheme` também força os componentes nativos (seletor de horário, barra de abas, status bar). Na web, o contexto basta; o layout raiz também pinta o `body` e o `theme-color` com a cor de fundo do tema. No PWA do iPhone a barra de status é `black-translucent`: a página vai de ponta a ponta e o conteúdo passa por baixo do relógio (o iOS lê esse estilo ao adicionar à Tela de Início; mudou, reinstale). O iOS 26+ ignora `theme-color` e aplica o efeito Liquid Glass no topo: preenche a área da barra com a cor de uma caixa `position: fixed` opaca encostada no topo (mais de 10 px de altura, ≥90 % da largura, sem `pointer-events: none`) e desfoca em degradê uns 45 pt abaixo dela; sem a caixa, desfoca também a área da barra. A caixa é `#status-bar` em `public/index.html`, com `env(safe-area-inset-top)` de altura e `background-clip: text` (o WebKit lê a cor, ela não pinta nada). O layout raiz põe nela a cor de fundo do tema, ou preto nas telas de conta. O degradê abaixo da barra não tem como ser desligado (WebKit 301994). No mesmo modo, `#root` é `position: fixed` com `height: 100vh`, porque a viewport de layout é um inset mais baixa que a tela (793 px em 852) e `height: 100%` ou `bottom: 0` terminam antes do fim. O WebKit também corta a pintura da página nessa linha: abaixo dela só o fundo do `body` aparece, e só cor lisa, sem imagem; por isso o fundo do app é liso e o layout raiz pinta o `body` com a mesma cor (preto nas telas de conta), e `WebSafeAreaInsets` conta esses 59 px como inset de baixo, para a barra de abas ficar inteira acima do corte. O `SafeAreaProvider` web do Expo Router entrega insets zerados, e o do `react-native-safe-area-context` soma esses 59 px ao inset de baixo (ele compara com `innerHeight`); por isso `WebSafeAreaInsets` (`src/state/web-safe-area.tsx`) lê `env(safe-area-inset-*)` direto do CSS (59 px em cima e 34 embaixo no iPhone 14 Pro), para o título ficar abaixo do relógio e a barra de abas acima do indicador.

## Entrar e sair

Ao entrar (login, código confirmado ou nova senha) e ao sair, uma cortina cobre o app (`src/components/transition-screen.tsx`): o mesmo céu noturno do login, um anel azul girando com o contador de passos ("1/3"), o título ("Preparando o aplicativo" / "Saindo da conta") e uma lista em que o passo atual tem um spinner pequeno, os seguintes ficam apagados e os concluídos viram um check verde. No fim o anel vira um círculo verde com check, o título muda para "Tudo pronto" / "Até a próxima" e o aparelho vibra (sucesso). Sem emoji; com "reduzir movimento" os spinners ficam parados. A cortina sobe quando a conta muda de estado (ou antes, ao tocar em Sair, para cobrir a sincronização) e desce com um fade só depois que a animação terminou e o app já está no estado novo (`TransitionProvider`, `src/state/transition.tsx`). Nunca aparece ao abrir o app com sessão salva.

## Menu da conta

O botão de conta (`AccountMenu`: avatar com iniciais, nome e e-mail) é o mesmo na barra do admin e na tela Hoje, à direita da data e da saudação. Todo item do menu tem ícone. O botão e o menu (largura ajustada ao conteúdo, até 280 pt) usam o mesmo fundo do app (`backdrops`), sem borda azul.

- Hoje: interruptor **Claro/Escuro** (`ThemeToggle`, porte para Reanimated do "cinematic theme switcher" do shadcn, com cerca de metade do tamanho original (56 × 32 pt): trilho em baixo-relevo com gradiente e sombras internas, bolinha que desliza com mola e solta um brilho ao trocar, sol e lua; grava `settings.theme`), **Renovar plano** (`/renovar`) e **Sair**.
- Admin: Voltar para o app, Meu perfil, Planos e preços, Termos e Privacidade e Sair, com a etiqueta ADMINISTRADOR.
- Sair usa `useSignOut` nos dois lugares: pergunta antes de descartar mudanças não enviadas.

## Interruptores

Som das notificações (Ajustes) usa `ToggleSwitch`: trilho cinza `#ddd` que fica verde `#05c46b` ao ligar e bolinha branca que desliza em 300 ms (ease-in-out), 48 × 24 pt. Os interruptores do admin (planos e usuário) ainda são o `Switch` nativo.

## Horários

`TimeField` (Início, Fim e Hora de dormir, em Ajustes e no onboarding) usa uma roleta de horas e minutos. No iOS é o `DateTimePicker` compacto e no Android o diálogo do sistema. Na web, tocar no horário abre logo abaixo da linha duas rodas que giram com o dedo, com inércia e em loop (`WheelTime`, sobre `@ncdai/react-wheel-picker`), com uma faixa só marcando a hora escolhida, como no iPhone; tocar de novo fecha. O teclado numérico do iPhone não tem a tecla ":", por isso nada de campo digitado. Cores e fonte vêm do tema por variáveis CSS (`wheel-time.css`).

## Aparência em Ajustes

`ThemeTabs`: porte para React Native da variante "tabs" do seletor de tema do designali (shadcn). Três abas com ícone e nome (Claro, Escuro, Automático) que ocupa a largura toda da seção (abas iguais de 38 pt, ícone 18); a pílula da aba ativa desliza com mola (stiffness 500, damping 30) e o balanço fica preso dentro do trilho. Só em Ajustes; o menu da conta na Hoje continua com o interruptor.

## Admin: página do usuário

A engrenagem na linha do usuário abre a página dele, no mesmo estilo de Ajustes: números no topo (`StatColumns`: status, validade, cargo); **Acesso** com atalhos +30/+90/+365 dias, campos "Somar dias" e "Válido até" (DD/MM/AAAA, com botão Aplicar), interruptor de acesso ilimitado (`ToggleSwitch`) e Remover acesso; **Dados** com nome e e-mail editáveis na própria linha (salvam ao sair do campo); **Cargo** com interruptor de Administrador; **Conta** com nova senha provisória e Excluir conta.

## Landing page (computador, sem login)

No computador, quem abre `/` sem estar logado vê `LandingPage` (`src/components/landing-page.tsx` e `landing-sections.tsx`) em vez de ir para o login. Mesmo estilo do app: fundo liso, grades com divisórias finas, sem cards. Seções: navegação fixa no topo (Benefícios, Como funciona, Planos, Dúvidas, Entrar, Começar grátis); herói com título grande e um celular mostrando a tela Hoje com as dicas escondidas (cadeado), para manter a surpresa; Benefícios (os mesmos de `benefits.ts`); Como funciona em 3 passos; Recursos; Planos com os preços atuais e o teste de 7 dias; Dúvidas; chamada final e rodapé com Termos e Privacidade. "Começar grátis" abre `/auth?modo=criar` (criar conta) e "Entrar" abre `/auth`, que começa na aba Entrar. Os preços estão fixos no código porque a tabela `plans` só é lida por quem está logado.

## Renovação de plano

`/renovar` usa a `AuthShell` (céu noturno, como o login; o `body` também fica preto nessa rota). Título "Planos do Habitus" (com plano) ou "Seu teste grátis acabou"/"Seu plano acabou"; com plano, um botão redondo de voltar fica acima do título, não no rodapé. No cartão: os planos (`PlanCard`), "Renovar pelo WhatsApp" e, sem acesso, "Já paguei, atualizar". No rodapé só "Sair" e, sem acesso, "Excluir conta"; os links de termos e privacidade saíram (estão em Ajustes e na landing).

## Tela de instalação (celular no navegador)

`InstallGate` segue o estilo do app: fundo liso e listas com divisórias. Ícone, nome e uma frase; **Como funciona** em 3 passos numerados (conta com 7 dias grátis, horário, lembretes); **O que você ganha**, seis benefícios sem revelar as dicas (elas são surpresa dentro do app; o rodapé da seção avisa isso); **E mais** (XP e medalhas, histórico, progresso na conta). Rodapé fixo na parte de baixo da tela (`pinned`), visível sem rolar: "7 dias grátis · sem cartão · sem loja de apps" e o botão Instalar agora. Em desenvolvimento a tela só aparece com `?instalar` no endereço. Os benefícios falam do que a pessoa sente (leveza, confiança, foco, calma), sem promessa de saúde nem "comprovado pela ciência".

## Água

`Stepper` (− valor +) para a meta e o intervalo em Ajustes; `WaterRow` na tela Hoje: gota, "N de M copos", "Faltam X" ou "Meta de hoje batida!", botões −1 e "+1 copo" (cheio, na cor de destaque) e uma barra fina que fica verde ao bater a meta. A seção só aparece com a água ligada.

## Rolagem na web

Na web a página rola como documento, não dentro de uma lista: `Screen`, `AuthShell`, `InstallGate` e `LandingPage` usam `View` em vez de `ScrollView`, o `body` não tem `overflow: hidden` e as telas da pilha, que são absolutas, transbordam e esticam a área rolável. É o que faz o Safari do iPhone recolher a barra de endereço e deixar o conteúdo ir até as bordas, como em um site. O que precisa ficar parado usa `pinned` (`src/theme/index.ts`, `position: fixed` na web e `absolute` no app nativo): barra de abas, rodapé do `Screen` (com a cor de fundo, para o conteúdo passar por baixo), toasts, folha de instalação e cortina de transição. O `#root` (`public/index.html`) tem altura mínima de `100lvh + 1px`, então o documento sempre rola, mesmo numa aba curta ou no quadro em que a aba nova ainda não montou (primeira visita): no app instalado do iPhone, um documento que não rola é diagramado um inset do topo mais baixo, e a barra de abas fixa subia. Ao trocar de tela o layout raiz volta ao topo (`window.scrollTo(0, 0)`).

## Barra de abas

Na web/PWA, `LiquidNavbar` (`src/components/ui/liquid-glass-navbar.tsx`, adaptada do Nimbus UI "Waterline" de guglielmogiannattasio.it): uma pílula de vidro com uma gota de água sob a aba ativa. Ao trocar de aba a gota se estica até a nova, se parte em gotinhas nos saltos longos e se junta de novo com uma ondulação; cada ícone faz uma pequena animação ao toque (Hoje pula, Histórico gira, Conquistas salta, Ajustes balança). A água é um shader WebGL desenhado só dentro da pílula e pausado fora da tela; sem WebGL entra uma gota em CSS. Só ícones (o nome vai no `aria-label`), alvo de toque de 48 px, tom claro ou escuro conforme o tema, sem animação com "reduzir movimento". Fica fixa no rodapé, acima do indicador de início, quase de borda a borda no celular (12 pt de cada lado) e da largura da coluna do conteúdo (`MAX_WIDTH`) no computador; as abas dividem a largura em partes iguais. No iOS e no Android continuam as abas nativas (`NativeTabs`).

## Admin no computador

A barra do admin ocupa a largura da janela, mas o conteúdo (marca, seções e conta) fica na mesma coluna central do conteúdo (`MAX_WIDTH`, 640 pt).

## Regras visuais

- Tipografia nos estilos de texto do iOS (largeTitle 34, title1 28 … caption 12). O texto acompanha o tamanho de fonte do sistema, com `maxFontSizeMultiplier` para títulos grandes não quebrarem o layout.
- Sem cards: listas corridas de largura total, no estilo de tabela (direção "C", escolhida em outubro de 2026; os cards pareciam genéricos e a versão só com tipografia deixava a informação solta).
  - `Section`: rótulo pequeno em caixa alta, linhas separadas por divisórias finas (hairline) e uma divisória em cima e embaixo que vai de ponta a ponta da coluna. Nota de rodapé opcional.
  - Cada filho direto de `Section` é um grupo separado por divisória; agrupe linhas relacionadas numa `View` para não dividir cada uma. Ex.: Ajustes → Notificações tem o Som e, num só grupo, as três ações de teste; Conta tem Nome + E-mail, depois os links (Ver planos, Termos, Privacidade) e, por fim, Sair, Resetar dados e Excluir conta.
  - Ações e links dentro de seções usam `ActionRow` (ícone + texto, seta quando abre outra tela; vermelho nas destrutivas) em vez de botões cheios.
  - `StatColumns`: números lado a lado em colunas separadas por divisórias verticais (Hoje, Histórico, Conquistas e Admin). Com `columns`, quebra em grade (2×2 no celular).
  - Calendário do Histórico em grade com linhas entre os dias: dia completo com fundo verde suave, parcial com um ponto verde, hoje sublinhado na cor de destaque.
  - Linha do tempo como lista: horário, dica e, à direita, ✓ (feita), a contagem regressiva (próxima, em destaque) ou uma seta.
  - Fundo do app inteiro: uma cor lisa (`backdrops` em `src/theme/index.ts`), `#0f172a` no escuro e `#f1f5f9` no claro, a mesma de `background`. Lisa de propósito: no iPhone instalado a área do relógio e a faixa abaixo do corte da página são pintadas pelo sistema só com cor, e assim não aparece emenda. É o mesmo fundo do botão de conta e do menu; o trilho do interruptor de tema tem os próprios gradientes. Superfícies (`surface`) só no que flutua: menu da conta, barra de abas, toasts e folhas. As telas de login mantêm o cartão de vidro sobre o fundo estrelado.
- Alvos de toque de no mínimo 44 pt (os dias da semana têm 40 pt visíveis + `hitSlop`).
- Contraste AA nos textos: secundário `#5B5B66` sobre o fundo claro `#f1f5f9` ≈ 6:1; `#A1A1AA` sobre o fundo escuro `#0f172a` ≥ 5,7:1; branco sobre `#7C3AED` ≈ 5,7:1; verde de texto `#047857` sobre branco ≈ 5,5:1.
- Movimento: spring curto nos botões (escala 0,97), anel que se preenche em 900 ms com ease-out, fade entre passos do onboarding, háptico leve na seleção e de sucesso ao concluir.
- Ícones: SF Symbols no iOS, Material Symbols no Android/web (`src/components/icon.tsx`). São decorativos e ficam ocultos para leitores de tela.

## Acessibilidade

Todo controle tem `accessibilityLabel` em português; anel e timer expõem `progressbar` com valor; erros de horário usam `accessibilityRole="alert"` e live region; títulos de tela e de seção são `header`.
