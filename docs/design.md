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

Ajustes → Aparência: **Automático** (segue o aparelho, padrão), **Claro** ou **Escuro**. A escolha fica em `settings.theme`. `useTheme` lê a preferência por `ThemePreferenceContext`, fornecido no layout raiz. No iOS/Android, `Appearance.setColorScheme` também força os componentes nativos (seletor de horário, barra de abas, status bar). Na web, o contexto basta; o layout raiz também pinta o `body` e o `theme-color` com a cor de fundo do tema. No PWA do iPhone, o iOS 26+ ignora `theme-color` e `apple-mobile-web-app-status-bar-style` e desfoca o topo da página (Liquid Glass). O WebKit só deixa de desfocar quando há uma caixa `position: fixed` opaca encostada no topo (≥6 px de altura, ≥80 % da largura): é a faixa `#status-bar` em `public/index.html`, com `max(env(safe-area-inset-top), 8px)` de altura. O layout raiz pinta a faixa com o fundo do tema (o mesmo gradiente, em `background-size: 100vw 100vh`, para não aparecer emenda) e com preto nas telas de conta.

## Entrar e sair

Ao entrar (login, código confirmado ou nova senha) e ao sair, uma cortina cobre o app (`src/components/transition-screen.tsx`): o mesmo céu noturno do login, um emoji grande que flutua, o título ("Preparando o aplicativo" / "Até logo") e passos que aparecem um a um e ganham o check verde (`checkmark.circle.fill`), com vibração de sucesso no último. A cortina sobe quando a conta muda de estado (ou antes, ao tocar em Sair, para cobrir a sincronização) e desce com um fade só depois que a animação terminou e o app já está no estado novo (`TransitionProvider`, `src/state/transition.tsx`). Nunca aparece ao abrir o app com sessão salva.

## Menu da conta

O botão de conta (`AccountMenu`: avatar com iniciais, nome e e-mail) é o mesmo na barra do admin e na tela Hoje, à direita da data e da saudação. Todo item do menu tem ícone. O botão e o menu (largura ajustada ao conteúdo, até 280 pt) usam o mesmo fundo do app (`backdrops`), sem borda azul.

- Hoje: interruptor **Claro/Escuro** (`ThemeToggle`, porte para Reanimated do "cinematic theme switcher" do shadcn, com cerca de metade do tamanho original (56 × 32 pt): trilho em baixo-relevo com gradiente e sombras internas, bolinha que desliza com mola e solta um brilho ao trocar, sol e lua; grava `settings.theme`), **Renovar plano** (`/renovar`) e **Sair**.
- Admin: Voltar para o app, Meu perfil, Planos e preços, Termos e Privacidade e Sair, com a etiqueta ADMINISTRADOR.
- Sair usa `useSignOut` nos dois lugares: pergunta antes de descartar mudanças não enviadas.

## Interruptores

Som das notificações (Ajustes) usa `ToggleSwitch`: trilho cinza `#ddd` que fica verde `#05c46b` ao ligar e bolinha branca que desliza em 300 ms (ease-in-out), 48 × 24 pt. Os interruptores do admin (planos e usuário) ainda são o `Switch` nativo.

## Aparência em Ajustes

`ThemeTabs`: porte para React Native da variante "tabs" do seletor de tema do designali (shadcn). Três abas com ícone e nome (Claro, Escuro, Automático) que ocupa a largura toda da seção (abas iguais de 38 pt, ícone 18); a pílula da aba ativa desliza com mola (stiffness 500, damping 30) e o balanço fica preso dentro do trilho. Só em Ajustes; o menu da conta na Hoje continua com o interruptor.

## Admin: página do usuário

A engrenagem na linha do usuário abre a página dele, no mesmo estilo de Ajustes: números no topo (`StatColumns`: status, validade, cargo); **Acesso** com atalhos +30/+90/+365 dias, campos "Somar dias" e "Válido até" (DD/MM/AAAA, com botão Aplicar), interruptor de acesso ilimitado (`ToggleSwitch`) e Remover acesso; **Dados** com nome e e-mail editáveis na própria linha (salvam ao sair do campo); **Cargo** com interruptor de Administrador; **Conta** com nova senha provisória e Excluir conta.

## Landing page (computador, sem login)

No computador, quem abre `/` sem estar logado vê `LandingPage` (`src/components/landing-page.tsx` e `landing-sections.tsx`) em vez de ir para o login. Mesmo estilo do app: fundo em gradiente, grades com divisórias finas, sem cards. Seções: navegação fixa no topo (Benefícios, Como funciona, Planos, Dúvidas, Entrar, Começar grátis); herói com título grande e um celular mostrando a tela Hoje com as dicas escondidas (cadeado), para manter a surpresa; Benefícios (os mesmos de `benefits.ts`); Como funciona em 3 passos; Recursos; Planos com os preços atuais e o teste de 7 dias; Dúvidas; chamada final e rodapé com Termos e Privacidade. "Começar grátis" abre `/auth?modo=criar` (criar conta) e "Entrar" abre `/auth`, que começa na aba Entrar. Os preços estão fixos no código porque a tabela `plans` só é lida por quem está logado.

## Tela de instalação (celular no navegador)

`InstallGate` segue o estilo do app: fundo em gradiente e listas com divisórias. Ícone, nome e uma frase; **Como funciona** em 3 passos numerados (conta com 7 dias grátis, horário, lembretes); **O que você ganha**, seis benefícios sem revelar as dicas (elas são surpresa dentro do app; o rodapé da seção avisa isso); **E mais** (XP e medalhas, histórico, progresso na conta). Rodapé: "7 dias grátis · sem cartão · sem loja de apps" e o botão Instalar agora. Os benefícios falam do que a pessoa sente (leveza, confiança, foco, calma), sem promessa de saúde nem "comprovado pela ciência".

## Água

`Stepper` (− valor +) para a meta e o intervalo em Ajustes; `WaterRow` na tela Hoje: gota, "N de M copos", "Faltam X" ou "Meta de hoje batida!", botões −1 e "+1 copo" (cheio, na cor de destaque) e uma barra fina que fica verde ao bater a meta. A seção só aparece com a água ligada.

## Barra de abas

Na web/PWA, `FloatingTabBar`: barra flutuante e arredondada, da largura da coluna do conteúdo (`MAX_WIDTH`; no celular, quase de borda a borda), cinza-escuro bem transparente com desfoque (`expo-blur`), só com ícones (o nome de cada aba vai no `accessibilityLabel`). Uma pílula cinza desliza até a aba ativa em 260 ms, sem balanço (ease-out), e o ícone ativo fica na cor do texto. No iOS e no Android continuam as abas nativas (`NativeTabs`).

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
  - Fundo do app inteiro: gradiente radial a partir do canto superior esquerdo (`backdrops` em `src/theme/index.ts`), azul-ardósia `#1e293b → #0f172a → #020617` no escuro e `#ffffff → #f1f5f9 → #cbd5e1` no claro. É o mesmo do trilho do interruptor de tema, do botão de conta e do menu. `background` guarda a cor do meio, usada onde o gradiente não renderiza. Superfícies (`surface`) só no que flutua: menu da conta, barra de abas, toasts e folhas. As telas de login mantêm o cartão de vidro sobre o fundo estrelado.
- Alvos de toque de no mínimo 44 pt (os dias da semana têm 40 pt visíveis + `hitSlop`).
- Contraste AA nos textos: secundário `#5B5B66` sobre o gradiente claro ≈ 6:1 no centro (`#f1f5f9`) e ≈ 4,6:1 no canto mais escuro (`#cbd5e1`); `#A1A1AA` sobre o gradiente escuro ≥ 5,7:1; branco sobre `#7C3AED` ≈ 5,7:1; verde de texto `#047857` sobre branco ≈ 5,5:1.
- Movimento: spring curto nos botões (escala 0,97), anel que se preenche em 900 ms com ease-out, fade entre passos do onboarding, háptico leve na seleção e de sucesso ao concluir.
- Ícones: SF Symbols no iOS, Material Symbols no Android/web (`src/components/icon.tsx`). São decorativos e ficam ocultos para leitores de tela.

## Acessibilidade

Todo controle tem `accessibilityLabel` em português; anel e timer expõem `progressbar` com valor; erros de horário usam `accessibilityRole="alert"` e live region; títulos de tela e de seção são `header`.
