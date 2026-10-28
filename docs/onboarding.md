# Onboarding de desenvolvimento

1. Node 24 LTS (o projeto respeita `fnm` com `--use-on-cd`) e npm.
2. `npm install`
3. `npm run check` — deve terminar sem erros.
4. `npm start` e abra no Expo Go (QR code) ou num emulador/simulador.

## Onde mexer

| Quero mudar… | Arquivo |
|---|---|
| Regra de horários / validação | `src/domain/schedule.ts` + `src/domain/__tests__/schedule.test.ts` |
| Texto das dicas e notificações | `src/domain/tricks.ts` |
| Quais notificações são agendadas | `src/domain/notification-plan.ts` |
| Como são agendadas no aparelho | `src/services/notifications.ts` |
| "Feito"/"Adiar" | `src/domain/notification-actions.ts`, `src/services/notification-responses.ts` |
| Cores, tipografia, espaçamentos | `src/theme/index.ts` |
| Telas | `src/app/` |

## Testar notificações rapidamente

Ajustes → Notificações → "Testar uma notificação agora" dispara uma em 3 s. Detalhes no [README](../README.md).

## Armadilhas conhecidas

- Não nomeie componentes com nomes de globais (`Symbol`, `Map`, …): o React Compiler gera `Symbol.for(...)` e quebra em tempo de execução.
- TypeScript 6 usa `types: []` por padrão; os globais do Jest vêm de `"types": ["jest"]` no `tsconfig.json`.
- Em shared values do Reanimated use `.get()`/`.set()`: o lint do React Compiler reprova `.value =` em handlers.
- Código que precisa rodar com o app encerrado (tarefa headless do Android) deve ser importado em `index.ts`, não a partir de rotas.
- Android 13+ informa `denied` antes do primeiro pedido de notificação; use `canAskAgain` (ver `toPermissionState`).
- No Windows, o build nativo precisa do CMake 3.31+ do SDK (ninja ≥ 1.12) por causa de caminhos com mais de 260 caracteres: `cmake.dir` em `android/local.properties`.
