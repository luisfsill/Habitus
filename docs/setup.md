# Setup e evidências

## Origem e contexto

- Data: 24/10/2026. Toolkit: `soumatheusgomes/vibe-coding-toolkit`, revisão única `790a895304e0c08b70a5b215c9d334f1c86b816c` (18/10/2026), clonada fora do projeto.
- Cliente: Claude Code (app desktop, Windows 11, Git Bash + PowerShell). Modelo principal preservado; nenhum provedor, proxy ou cobrança de API foi alterado.
- Projeto criado do zero com `create-expo-app` (template default, Expo SDK 58). O prompt 11 (bootstrap Next.js) **não** foi usado por ser incompatível com app nativo. Foi aplicado o prompt 12 (projeto existente), preservando Expo/React Native.
- Brainstorming (Superpowers): o briefing já trazia regras, telas e critérios fechados, então o design foi tratado como "trabalho delimitado", com as decisões registradas aqui e em [architecture.md](architecture.md), sem rodada extra de perguntas.

## Matriz de cobertura

| Componente | Ação e motivo | Escopo | Estado e evidência |
|---|---|---|---|
| AGENTS.md / CLAUDE.md | AGENTS.md do template Expo reescrito com comandos, camadas e acordos; CLAUDE.md importa AGENTS.md | Projeto | Feito |
| PRODUCT, README, docs/* | 9 destinos do manifesto criados com conteúdo do projeto | Projeto | Feito |
| ESLint quality gates (prompt 08, MAX_LINES=350) | `eslint-rules/*.cjs` copiados byte a byte; config adaptada às camadas reais; nível tipado separado | Projeto | `lint:rules` 3× ok; 0 erros e 0 avisos |
| Superpowers, Ponytail, Caveman | Já existiam em escopo de projeto (outro repo); instalados em escopo de usuário | Usuário (Claude Code) | `claude plugin list`: habilitados |
| Context7 | MCP HTTP adicionado em escopo de usuário | Usuário | `claude mcp list`: conectado |
| RTK | Já instalado (0.43.0) e com hook ativo | Usuário | Comandos reescritos via hook observados nesta sessão |
| Graphify | Já instalado (0.9.93). Grafo do projeto não gerado: projeto pequeno e novo, sem benefício agora | Usuário | Reavaliar quando passar de ~50 arquivos |
| Vercel skills | `vercel-react-native-skills`, `vercel-react-best-practices`, `vercel-composition-patterns`, `writing-guidelines`, `find-skills` com `--copy` (Windows) para codex + claude-code | Projeto | `.agents/skills`, `.claude/skills`, `skills-lock.json` |
| Vercel web/deploy (`web-design-guidelines`, `view-transitions`, `vercel-optimize`, `deploy-to-vercel`, `cli-with-tokens`) | Não aplicável: app nativo, sem deploy na Vercel | — | Decisão |
| ui-ux-pro-max | Plugin do marketplace `nextlevelbuilder/ui-ux-pro-max-skill` | Projeto | Design system gerado ([design.md](design.md)) |
| Next dev-loop / bundle optimizer, shadcn | Não aplicável (não é Next.js nem web) | — | Decisão |
| PostgreSQL skills, Sentry MCP | Não aplicável (sem banco, sem serviço de erros escolhido) | — | Decisão |
| gh-fix-ci | Não aplicável por enquanto: sem repositório remoto nem CI | — | Reavaliar ao criar CI |
| Security review | Bloco do prompt 13 copiado para `docs/prompts/security-review.md` | Projeto | Não executado (projeto recém-criado) |
| Harness2 (método nativo) | Sem falha observada para comparar; o procedimento fica disponível via prompt 15 do toolkit | — | Smoke: `npm run check` verde |
| agent-browser / Chrome DevTools MCP | Reutilizado o navegador embutido do app + Chrome headless (puppeteer-core fora do projeto) para as capturas | Sessão | Capturas em `docs/screenshots/` |
| Memória | Memória nativa do Claude Code + docs versionados. Sem vault externo | — | Decisão |

## Verificações

| Item | Estado | Evidência |
|---|---|---|
| `npm run check` | Validado | lint 0, lint:typed 0, rules 3× ok, tsc ok, Jest 51/51 |
| `npx expo-doctor` | Validado | 20/20 checks |
| Telas no preview web (claro e escuro) | Validado | `docs/screenshots/*.png` |
| Agendamento real (janela 20:30–21:30) | Validado no emulador Android 15 | `dumpsys alarm`: 42 alarmes, 7 dias × (20:30, 20:36, 20:48, 21:00, 21:12, 21:24) |
| Entrega no horário | Validado | Com alarme exato: 21:00:00.069, 21:12:01.1, 21:24:01.1, adiamento +11 ms. Sem alarme exato: 20:36 → 20:38:55 |
| Toque na notificação → tela do truque | Validado | Com o app encerrado (cold start), abriu "Foco total" |
| "Feito" em segundo plano | Validado | Tarefa headless gravou a conclusão; Hoje passou para 1/5 |
| "Adiar 10 min" com app encerrado | Validado (dev e release) | Alarme exato +10 min; sobreviveu à reabertura do app; entregue |
| Timer de 2 min + háptico | Validado | 120 s; `dumpsys vibrator_manager` registrou o efeito de sucesso |
| Onboarding, validação ao vivo, permissão | Validado | Pedido do sistema aparece depois da explicação (Android 13+) |
| iOS (Expo Go / simulador) | **Não verificado** | Sem Mac nesta máquina |
| `npm audit` | Registrado | 6 high em `@expo/cli` (ver [quality.md](quality.md)) |

## Pendências e próxima entrega

1. **Testar no iOS.** Sem Mac nesta máquina, nada do iOS foi executado (ações que abrem o app, materiais translúcidos, SF Symbols).
2. Ambiente Android local: SDK, JDK 17 e AVD `habitus` em `D:\Android`. Esta máquina tem pouca memória livre: emulador (~4,7 GB) + Metro + build não cabem juntos. Para builds, desligue o emulador.
3. Antes da Play Store, confirmar que o uso de `SCHEDULE_EXACT_ALARM` está dentro da política (lembretes definidos pelo usuário).
4. Trocar `com.habitus.app` e os ícones padrão do template pelo identificador e pela arte finais.
5. Para repetir este setup, rode de novo o prompt 12 apontando para esta revisão ou para uma mais nova: ele detecta o que já existe, e as customizações acima devem ser preservadas.
