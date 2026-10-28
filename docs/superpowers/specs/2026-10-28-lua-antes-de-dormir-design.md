# Antes de dormir: a lua que enche com a voz

## Intenção

A dica 6 ("Antes de dormir") é a única sem cena própria. As outras têm vídeo, som, efeito e
gamificação; essa mostra só a frase. Ela ganha a mesma linguagem, com identidade própria:
a Gratidão é o céu de estrelas, o Antes de dormir é a lua.

## O que a pessoa vê

1. **Cena:** vídeo em loop "Serene Night Sky Over Reflective Ocean", de Melike, na
   [Pexels](https://www.pexels.com/video/serene-night-sky-over-reflective-ocean-39289516/): câmera parada,
   lua alta com halo e o caminho de luz no mar. A lua do vídeo é sempre cheia, então a lua desenhada por
   código fica exatamente por cima dela, na fase atual (lado escuro na cor do céu, com um leve brilho de
   "luz cinérea"); o halo do vídeo continua em volta. O caminho de luz na água escurece um pouco nas
   fases finas. Tratamento do arquivo igual às outras cenas (retrato ~480×1024, ida e volta, sem som).
   Tema escuro, degradê atrás do texto.
2. **Frase:** "Deus, universo, vida: me surpreenda positivamente amanhã." aparece apagada, palavra
   por palavra, sobre a água.
3. **Voz acende as palavras:** enquanto há voz no microfone, as palavras acendem uma a uma, em prata,
   num ritmo de fala calma; sem voz, param. A lua enche de luz junto até a fase nova.
   O microfone só mede volume no aparelho, não grava nem reconhece o que foi dito
   (mesmo princípio do sopro da fogueira).
4. **Alternativa, segurar na lua:** enquanto o dedo está na lua, as palavras acendem no mesmo ritmo.
   Vale para quem não quer falar alto, negou o microfone ou está no app nativo (o microfone está
   desligado no `app.json`; lá só existe o segurar). Um texto curto avisa as duas formas.
5. **Fim:** na última palavra a fase se completa, o reflexo brilha, toca um som curto e a dica conta
   como feita. A pessoa fica olhando quanto quiser; o botão Concluir fecha (mesmo fluxo das outras).
   Aberta numa noite já feita, a tela mostra a lua na fase de hoje, já cheia de luz, e "Concluída".

Sem mecânica de virar o celular (rejeitada: a pessoa quer ver o que acontece).

## A lua (gamificação)

- Cada **noite** em que a dica foi feita avança uma fase. A noite é a de `trickDayKey` (madrugada conta
  para a noite anterior), já registrada em `completions`. Nada novo para guardar nem sincronizar.
- Ciclo de **8 noites**, enchendo: 1 crescente fina … 4 quarto crescente … 8 **lua cheia**.
  A lua cheia é o fim do ciclo e o grande momento; a noite seguinte começa um ciclo novo (crescente fina).
  (Decisão do Claude: "a voz enche a lua" pede que encher seja o objetivo; minguante não entra.)
- Só cresce: noite pulada não faz a lua voltar, ela só não avança (mesmo espírito do céu da Gratidão).
- Contador na tela: "Lua 3 · noite 5 de 8" e, na lua cheia, "Lua cheia! Você completou 3 luas."
- **Lua cheia:** som próprio, brilho maior, XP extra e conquista.
  - XP: `XP_RULES.fullMoon = 50` por ciclo completo (decisão do Claude; meia "semana perfeita").
  - Conquistas: "Lua cheia" (1 ciclo) e "Ciclos de lua" (4 ciclos). Ambas derivadas do histórico.

## Regras puras (`src/domain`, com teste)

- `moonOf(completions)` → `{ nights, cycle, phase (1…8), full }`, contando noites com a dica 6.
- Ritmo das palavras: quanto tempo de voz (ou dedo) acende cada palavra, proporcional ao tamanho dela.
  Pausas curtas de voz não apagam o que já acendeu.

## Som

Fica para depois: o dono do app vai escolher o som de fundo (o `night.mp3` já é da Gratidão).
Por enquanto a dica 6 não tem som de fundo; os sons curtos de fase/lua cheia reaproveitam
`star-born.mp3` e `constellation.mp3` até haver os próprios.

## Fora do escopo

- Reconhecimento de fala (saber se a frase foi dita certa).
- Fases minguantes, calendário lunar real, lua ligada à data.
- Mudança no lembrete/horário de dormir (o aprendizado do horário em `bedtime.ts` continua igual).

## Para o construtor decidir

Desenho da lua (SVG com terminador elíptico é suficiente), animação de encher, posição do contador,
limiar de voz (partir de `listenForBlow` sem o passa-baixa, já que voz não é sopro).
