# Qualidade

## Comandos

| Comando | O que prova |
|---|---|
| `npm run lint` | Preset `eslint-config-expo` (React, hooks, React Compiler) + `typescript-eslint` strict + quality gates + fronteiras de camada |
| `npm run lint:typed` | Regras com tipos: promessas soltas/mal usadas, `no-unsafe-*`, `await-thenable` etc. Tudo em `error` (baseline zero) |
| `npm run lint:rules` | Self-check (`RuleTester`) das regras `quality/*` copiadas do toolkit |
| `npm run typecheck` | `tsc --noEmit` em modo strict |
| `npm test` | Jest (`jest-expo`) com fuso fixo `America/New_York`, para testar a troca de horário de verão de forma determinística |
| `npm run check` | Todos os anteriores, em sequência |
| `npx expo-doctor` | Config e versões compatíveis com o SDK |

## Regras de base

- TypeScript strict. Limite de **350 linhas** por arquivo (`quality/max-lines`, em `error`).
- `console` só em `src/services/log.ts` (`quality/no-direct-console`). Nunca registre texto escrito pelo usuário.
- AsyncStorage só via `src/services/storage.ts` (`quality/no-direct-data-access` nas camadas `app`, `components` e `state`).
- Fronteiras de camada por `import-x/no-restricted-paths` (ver [architecture.md](architecture.md)).
- Orçamentos de complexidade (`complexity` 12, `max-statements` 20, `max-params` 4…) em `warn`. Baseline atual: **0 avisos**.
- `import/namespace`, `import/named`, `import/default` e `import/no-named-as-default-member` ficam desligados em `.ts/.tsx`, porque o compilador já cobre e o plugin interpreta mal enums reexportados (`expo-notifications`).

## Estratégia de testes

- Toda regra de negócio fica em `src/domain` como função pura, testada sem mocks: `computeSchedule`, `planNotifications`, `planTestRun`, `snoozeNotification`, `currentStreak`, `weekPercent`, `monthGrid`, `trickStatuses`, `sanitizeData`, `withCompletion`, `interpretResponse`, `formatCountdown`.
- Os serviços (`expo-notifications`, AsyncStorage) são cascas finas sobre o domínio e são verificados manualmente no aparelho (roteiro no [README](../README.md#como-testar-as-notificações)).
- Não há suíte E2E. As telas foram verificadas visualmente no preview web, com capturas em `docs/screenshots/`.

## Revisão

Escolha o escopo da revisão pelo risco do diff. Mudanças em agendamento ou notificações pedem teste novo em `src/domain` e o roteiro manual de notificações no aparelho. Revisores trabalham somente leitura e reportam achados com cenário concreto de falha.

## Segurança

O prompt reutilizável está em [prompts/security-review.md](prompts/security-review.md) (toolkit, revisão `790a895`). Rode-o em modo repositório (baseline) ou para um intervalo de diff, guardando o relatório fora do repositório. A superfície do app é pequena: não há rede, contas nem segredos. Os riscos relevantes são dados locais malformados (tratados por `sanitizeData`) e payloads de notificação (validados por `interpretResponse`).

## Dependências

Rode `npm audit` antes de publicar. Estado em 24/10/2026: 6 avisos *high*, todos na cadeia `expo` → `@expo/cli` (`node-forge`, `zod`, `@expo/code-signing-certificates`). É ferramenta de linha de comando executada na máquina de desenvolvimento e não entra no bundle do app. O `npm audit fix --force` "corrigiria" rebaixando para o Expo 44, o que quebraria tudo, então não foi aplicado. Reavalie quando sair um patch do SDK 58 (`npx expo install --fix`).
