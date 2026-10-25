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

Ajustes → Aparência: **Automático** (segue o aparelho, padrão), **Claro** ou **Escuro**. A escolha fica em `settings.theme`. `useTheme` lê a preferência por `ThemePreferenceContext`, fornecido no layout raiz. No iOS/Android, `Appearance.setColorScheme` também força os componentes nativos (seletor de horário, barra de abas, status bar). Na web, o contexto basta.

## Regras visuais

- Tipografia nos estilos de texto do iOS (largeTitle 34, title1 28 … caption 12). O texto acompanha o tamanho de fonte do sistema, com `maxFontSizeMultiplier` para títulos grandes não quebrarem o layout.
- Fundo agrupado (`#F2F2F7` / preto), cards com cantos de 22 pt, seções no estilo do app Ajustes.
- Alvos de toque de no mínimo 44 pt (os dias da semana têm 40 pt visíveis + `hitSlop`).
- Contraste AA nos textos: secundário `#5B5B66` sobre `#F2F2F7` ≈ 6:1; branco sobre `#7C3AED` ≈ 5,7:1; verde de texto `#047857` sobre branco ≈ 5,5:1.
- Movimento: spring curto nos botões (escala 0,97), anel que se preenche em 900 ms com ease-out, fade entre passos do onboarding, háptico leve na seleção e de sucesso ao concluir.
- Ícones: SF Symbols no iOS, Material Symbols no Android/web (`src/components/icon.tsx`). São decorativos e ficam ocultos para leitores de tela.

## Acessibilidade

Todo controle tem `accessibilityLabel` em português; anel e timer expõem `progressbar` com valor; erros de horário usam `accessibilityRole="alert"` e live region; títulos de tela e de seção são `header`.
