# Habitus

App para iOS e Android que ajuda você a praticar **5 truques de bem-estar** ao longo do dia. Você escolhe o início e o fim do seu dia, e o Habitus distribui os truques de forma uniforme nessa janela e lembra de cada um com uma notificação local. Não tem login nem servidor, e os dados ficam no aparelho.

| Hoje | Notificação | Truque | Histórico |
|---|---|---|---|
| ![Hoje](docs/screenshots/android/a17-hoje-2de5.png) | ![Notificação com ações](docs/screenshots/android/a20-notificacao-icone.png) | ![Timer concluído](docs/screenshots/android/a16-timer-concluido.png) | ![Histórico](docs/screenshots/android/a18-historico.png) |

Capturas do emulador Android 15 em [`docs/screenshots/android/`](docs/screenshots/android/). As de [`docs/screenshots/`](docs/screenshots/) vêm do preview web (inclui modo escuro), onde a barra de abas aparece no topo.

## Requisitos

- Node.js 24 LTS e npm
- Para rodar no celular, o app **Expo Go** ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)), ou um simulador/emulador

## Como rodar

```bash
npm install
```

### No navegador

```bash
npm run dev
```

Abre o app em http://localhost:8081. É a versão web/PWA: tem tudo (onboarding, truques, histórico, conquistas, ajustes), e os lembretes funcionam enquanto a aba está aberta.

### No celular (app nativo)

```bash
npx expo start
```

No terminal do Expo, `a` abre no emulador Android e `i` abre no simulador iOS (só no macOS). Veja a observação sobre o Expo Go mais abaixo.

## Instalar como app pelo navegador (PWA)

O Habitus é um PWA: dá para instalar pelo navegador, sem loja, no Android e no iPhone. Ao abrir o app, a tela inicial mostra o cartão **Instale o Habitus** com o botão **Instalar agora**:

- **Android (Chrome, Edge, Samsung Internet):** o botão abre a mesma janela de instalação do navegador. É só confirmar.
- **iPhone/iPad (Safari):** a Apple não permite que um site abra essa janela. O botão mostra o passo a passo: Compartilhar → **Adicionar à Tela de Início** → Adicionar.
- **Já instalado:** o cartão some. O botão ✕ esconde o cartão até a próxima abertura.

Para instalar no celular, o app precisa estar publicado num endereço **HTTPS**, porque o celular não acessa o `localhost` do seu PC e os navegadores só instalam PWAs servidos com HTTPS. Para gerar os arquivos:

```bash
npx expo export -p web
```

A pasta `dist/` é um site estático. Publique-a em qualquer hospedagem com HTTPS: EAS Hosting (`npx eas-cli@latest deploy`), Netlify, Vercel, Cloudflare Pages ou GitHub Pages. Configure a hospedagem para responder `index.html` em qualquer rota (modo SPA).

**Vercel:** o `vercel.json` já define o build (`npx expo export -p web`), a pasta `dist` e o modo SPA. Importe o repositório na Vercel e faça o deploy, sem configuração extra.

**Limitação dos lembretes no PWA:** a web não tem como agendar uma notificação para disparar com o app fechado sem um servidor de push. No PWA, os lembretes chegam no horário enquanto o Habitus está aberto ou foi minimizado há pouco, e o toque abre o truque. No iPhone, as notificações só existem depois de instalar na Tela de Início (iOS 16.4+). As ações "Feito"/"Adiar" existem só no app nativo. Para lembretes confiáveis com o app fechado, use o app Android (APK, seção "Development build").

## Gamificação

A aba **Conquistas** junta mecânicas que já funcionam em outros apps:

- **XP e níveis (Duolingo):** +10 XP por truque, +25 por dia perfeito (5 de 5), +5 XP extra por dia de sequência (até +50) e +150 por semana perfeita (todos os dias ativos de domingo a sábado). Cada nível pede 50 XP a mais que o anterior (100, 150, 200…).
- **Patentes (faixas de artes marciais):** Branca → Amarela (nível 3) → Laranja (5) → Verde (8) → Azul (12) → Roxa (16) → Marrom (21) → Preta (27).
- **Medalhas com progresso (Apple Fitness):** 11 medalhas, como Primeiro passo, Dia perfeito, Em chamas (7 dias), Semana perfeita, Coração grato, Centena e Faixa Preta.
- **Celebração:** ao concluir um truque aparece "+10 XP". Subir de nível, ganhar faixa ou medalha mostra um destaque com vibração.

Tudo é calculado a partir do histórico já salvo, então quem já usava o app começa com o XP que merece.

## Verificar o código

```bash
npm run check
```

Esse comando roda o ESLint rápido, o ESLint com tipos, o self-check das regras de qualidade, o `tsc --noEmit` e os testes Jest. A lógica de agendamento tem testes em `src/domain/__tests__/`, incluindo casos-limite: janela de exatamente 1 h, 59 min, fim antes do início, horários inválidos, 00:00–23:59, arredondamento, troca de horário de verão, dias inativos e o teto de notificações do iOS.

## Como testar as notificações

1. Abra o app no aparelho (Expo Go ou development build), conclua o onboarding e **permita as notificações**.
2. Vá em **Ajustes**:
   - **Testar uma notificação agora**: dispara um lembrete do truque 2 em 3 segundos.
   - **Simular um dia em 5 minutos**: agenda a abertura em 10 s e os 5 truques nos centros de fatias de 1 minuto (40 s, 1 min 40 s, 2 min 40 s, 3 min 40 s e 4 min 40 s). Bloqueie a tela ou mande o app para segundo plano para ver os banners. O teste é somado ao horário normal, que continua agendado; reabrir o app não cancela nenhum dos dois.
   - **Ver notificações agendadas**: mostra quantas estão pendentes. Sem adiamentos nem testes, o número esperado é até 42 (6 por dia × 7 dias).
3. Toque numa notificação de truque: o app abre direto na tela daquele truque.
4. Use as ações **Feito** e **Adiar 10 min**. No Android elas rodam sem abrir o app, inclusive com o app encerrado. No iOS elas abrem o app para registrar a ação.

### Android: permita "Alarmes e lembretes"

Sem essa permissão, o Android trata os lembretes como alarmes aproximados e pode entregá-los até 1 hora depois do horário. No emulador, sem a permissão, um lembrete das 20:36 chegou às 20:38:55. Com ela, os lembretes chegaram com menos de 1,2 s de atraso. O Android 14+ começa com essa permissão negada, então o app mostra o aviso **Lembretes podem atrasar** com o botão **Permitir horário exato**, que abre a tela do sistema.

Para conferir os horários reais, defina em Ajustes uma janela que comece daqui a 1–2 minutos (ex.: agora 10:03 → 10:05–11:05). Os truques chegam às 10:11, 10:23, 10:35, 10:47 e 10:59.

> **Expo Go no Android não serve para este app.** O Expo Go Android mais recente para o SDK 58 (58.0.5) não traz o módulo nativo `ExpoTopicSubscriptionModule`, que o `expo-notifications` 58.x carrega ao iniciar. O app quebra com "Cannot find native module 'ExpoTopicSubscriptionModule'". No Android, use um development build (seção abaixo). No iOS, esse módulo é só um stub em JS, então o Expo Go deve funcionar, mas isso não foi verificado por falta de Mac.

### Development build no Android (sem conta EAS)

Requer o Android SDK (`ANDROID_HOME`) e o JDK 17.

```bash
npx expo prebuild -p android
```

```bash
cd android && ./gradlew assembleDebug -PreactNativeArchitectures=x86_64
```

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Depois, com o Metro rodando (`npx expo start`), abra o app "Habitus" no emulador. Num celular físico, troque `x86_64` por `arm64-v8a`, ou simplesmente rode `npx expo run:android` com o aparelho conectado.

## Gerar o build com EAS

```bash
npm install -g eas-cli
```

```bash
eas login
```

```bash
eas build:configure
```

Esse comando cria o `eas.json` com os perfis `development`, `preview` e `production`. Depois:

```bash
eas build --profile development --platform android
```

```bash
eas build --profile production --platform all
```

```bash
eas submit --platform ios
```

O build de iOS exige uma conta Apple Developer. O identificador do app é `com.habitus.app` (em `app.json`); troque pelo seu antes do primeiro build de produção.

## Estrutura

```
src/app         telas (Expo Router): onboarding, (tabs)/index|history|settings, trick/[id]
src/components  componentes visuais
src/domain      regras puras e testadas (agendamento, histórico, dados)
src/services    AsyncStorage, expo-notifications, tarefa em background
src/state       estado global e roteamento de notificações
src/theme       cores, tipografia e espaçamentos
```

Mais detalhes em [PRODUCT.md](PRODUCT.md), [docs/architecture.md](docs/architecture.md), [docs/design.md](docs/design.md) e [docs/quality.md](docs/quality.md).
