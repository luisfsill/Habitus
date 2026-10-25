# Habitus

App mobile (iOS e Android) que lembra o usuário de praticar 5 truques de bem-estar ao longo do dia, com notificações locais. Conta obrigatória (e-mail e senha) e progresso sincronizado pelo Supabase; sem backend próprio. Interface 100% em português do Brasil.

## Produto e stack

- Expo SDK 58 + React Native 0.88 + TypeScript (strict) + Expo Router (`src/app`).
- `expo-notifications` (local), `expo-task-manager` (ações em background no Android), AsyncStorage, `expo-haptics`, Reanimated 4, `react-native-svg`, `expo-blur`, `expo-symbols`.
- Detalhes: [PRODUCT.md](PRODUCT.md), [docs/architecture.md](docs/architecture.md), [docs/design.md](docs/design.md).

## Comandos canônicos

```bash
npm start              # expo start (Expo Go / dev build)
npm run dev            # app no navegador / PWA (http://localhost:8081)
npm run lint           # ESLint rápido (preset Expo + quality gates)
npm run lint:typed     # ESLint com informação de tipos
npm run lint:rules     # self-check das regras quality/*
npm run typecheck      # tsc --noEmit
npm test               # Jest (jest-expo), fuso fixo America/New_York
npm run check          # tudo acima em sequência
npx expo install <pkg> # SEMPRE use para dependências (versões do SDK)
npx expo-doctor        # diagnóstico de config/dependências
```

Rode `npm run check` antes de declarar qualquer tarefa pronta.

## Acordos de trabalho

- Leia as instruções e o código relevante antes de agir. Separe observação, suposição, decisão e evidência.
- Defina critério de aceite e comando de verificação antes de implementar. Correções trazem reprodução e teste de regressão quando viável.
- Toda regra de agendamento vive em `src/domain` como função pura com teste. Mudou a regra, mudou o teste.
- Atualize o documento responsável junto com a mudança (comportamento, comandos, configuração).
- Expo muda a cada SDK: consulte `https://docs.expo.dev/versions/v58.0.0/` (ou Context7) antes de usar uma API Expo/RN; não confie em memória.
- Nunca crie ou edite `ios/` e `android/` à mão (CNG). Configure via `app.json` e config plugins.
- Não faça afirmações médicas ou científicas no conteúdo do app.

## Camadas (verificadas pelo ESLint)

- `src/domain` é puro: não importa de `app`, `components`, `services` nem `state`.
- `src/components` é apresentacional: não importa `services` nem `app`.
- `src/services` não importa UI nem `state`. AsyncStorage só em `src/services/storage.ts`.
- `console` só em `src/services/log.ts`. Arquivos com no máximo 350 linhas.
- Banco e servidor ficam em `supabase/` (SQL para colar no Supabase e a Edge Function `admin-users`, em Deno, fora do lint/tsc do app). Passo a passo: [docs/supabase-setup.md](docs/supabase-setup.md).

## Ferramentas e skills

- Skills do projeto em `.agents/skills` (cópias em `.claude/skills`, instaladas com `--copy` por ser Windows): `vercel-react-native-skills`, `vercel-react-best-practices`, `vercel-composition-patterns`, `writing-guidelines`, `find-skills`. Plugin de projeto: `ui-ux-pro-max`.
- Superpowers para design/planos proporcionais, Ponytail para a menor mudança completa, Caveman para conversa concisa (código, docs e commits em texto normal), Context7 para documentação atual.
- Revisão de segurança reutilizável: [docs/prompts/security-review.md](docs/prompts/security-review.md).

## Delegação e revisão

Delegue só trabalho independente, com escopo e critério de aceite claros; o coordenador confere o diff e roda `npm run check`. Revisores são somente leitura. Política completa em [docs/quality.md](docs/quality.md).

## Git

Não há hooks nem bloqueios de branch. Commit e push só quando o usuário pedir.
