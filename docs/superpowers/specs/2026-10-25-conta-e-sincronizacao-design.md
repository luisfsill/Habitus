# Conta, login e sincronização com Supabase

Data: 2026-10-25. Status: rascunho para aprovação.

## Intenção

O Habitus vai cobrar uma mensalidade baixa (cerca de R$ 10) no futuro. Para isso, cada pessoa precisa de uma conta, e o progresso precisa morar no servidor, não só no aparelho. Este trabalho cria a conta (e-mail e senha), a sincronização com o Supabase e as telas legais. A cobrança em si fica para depois.

Ninguém usa o app hoje: não há dados locais para migrar.

Junto vem uma troca de identidade visual: o roxo sai e entra um azul cobalto com brilho, no app inteiro.

## Objetivos

- Criar conta, entrar, sair, esquecer e redefinir senha, excluir conta.
- Aceite de Termos de uso e Política de privacidade no cadastro, com telas próprias no app.
- Progresso salvo no Supabase e restaurado em outro aparelho.
- O app continua funcionando sem internet; sincroniza quando a conexão volta.
- Tela de conta moderna e animada (ver "Tela de conta").
- Accent do app inteiro passa de roxo para cobalto.

## Fora do escopo

- Cobrança, planos, período de teste, paywall.
- Login com Google ou Apple, link mágico.
- APK do Android e publicação nas lojas.
- Editar e-mail da conta.

## Anti-objetivos (falha mesmo funcionando)

- A pessoa no iPhone criar a conta no Safari e cair deslogada no app instalado.
- Um link de e-mail que abre o Safari e deixa a pessoa perdida fora do app.
- Perder um truque marcado porque outro aparelho sincronizou por cima.
- A chave `secret`/`service_role` aparecer no app, no repositório ou na Vercel.
- Afirmações médicas ou científicas nos textos (regra do projeto).

## Fluxo

1. **Celular no navegador (não instalado):** continua a `InstallGate` atual, que explica o app e manda instalar. Não há criação de conta aqui, porque no iPhone o app instalado não compartilha sessão com o Safari. A tela ganha uma linha dizendo que a conta é criada depois de instalar.
2. **App instalado, app nativo ou computador, sem sessão:** tela de conta (abas "Criar conta" / "Entrar").
3. **Criar conta:** e-mail, senha, aceite dos Termos e da Política (checkbox obrigatório, com links). O Supabase envia um código de 6 dígitos; a pessoa digita o código no app e a conta é confirmada e logada.
4. **Entrar:** e-mail e senha. Se o e-mail ainda não foi confirmado, vai para a tela do código (com "Reenviar código").
5. **Esqueci minha senha:** e-mail, então código de 6 dígitos, então nova senha. Tudo dentro do app.
6. **Com sessão e sem onboarding:** o onboarding atual (3 passos). Com onboarding feito: as abas.
7. **Ajustes > Conta:** e-mail logado, "Sair", "Excluir conta" (confirmação dupla), links para Termos e Política.

Códigos em vez de links em todos os e-mails: no iPhone, um link abriria o Safari, fora do app instalado.

## Tela de conta

Decidido com o usuário por mockups:

- **Layout "Aurora":** título grande no alto, cartão de vidro (blur) na parte de baixo com abas "Criar conta / Entrar", campos, botão principal e o texto de aceite.
- **Fundo "Horizonte":** céu preto com poucas estrelas piscando devagar e um brilho azul nascendo de baixo, por trás do cartão. A tela de conta é sempre escura, independente do tema.
- **Título:** "Bora criar seu *Habitus*." com a palavra *Habitus* em gradiente cobalto/ciano com um brilho que percorre as letras. Na aba "Entrar": "Que bom te ver de novo no seu *Habitus*." (texto proposto por Claude, o usuário aprovou o fluxo).
- **Cor:** cobalto `#3D7BFF` com halo (glow) no botão principal e no campo em foco.
- **Interações e motion** (o usuário pediu criatividade; detalhes ficam com quem constrói):
  - entrada escalonada do título e do cartão;
  - troca de aba com o indicador deslizando e os campos se reorganizando com animação de layout;
  - campo em foco acende com borda e halo cobalto; rótulo flutua;
  - medidor de força da senha animado, com checklist ao vivo;
  - mostrar/ocultar senha;
  - botão com estado de carregamento, sucesso e erro (tremida curta no erro), com háptico no nativo;
  - código de 6 dígitos em caixas separadas, com colar automático e avanço de foco;
  - respeitar "Reduzir movimento" do sistema (desliga estrelas, brilho e tremidas).
- Mockups de referência: `.superpowers/brainstorm/*/content/login-background.html` (opção 2) e `blue-accent.html` (opção 3).

## Cor do app

- Roxo sai do app inteiro: `src/theme/index.ts`, `theme-color` em `public/index.html`, `public/manifest.json`, `app.json` (splash/ícone adaptativo se tiverem cor), e qualquer roxo fixo no código.
- Escuro: accent `#3D7BFF`, texto branco sobre o accent.
- Claro: um cobalto mais escuro para manter contraste AA (4.5:1) em texto; quem constrói escolhe o tom exato.
- O comentário da paleta em `src/theme/index.ts` deixa de citar "lavender".

## Dados e sincronização

- Tabela `public.user_data`: `user_id uuid primary key references auth.users on delete cascade`, `data jsonb not null`, `updated_at timestamptz not null`.
- RLS ligado: cada pessoa só lê, insere e altera a própria linha (`auth.uid() = user_id`).
- `data` guarda o `AppData` atual inteiro (o mesmo que vai para o AsyncStorage). Sempre passa por `sanitizeData` ao ler.
- `AppData` ganha `settingsUpdatedAt` (número, ms; ausente vira 0 no `sanitizeData`), atualizado a cada mudança de `settings`. Não há outros carimbos de tempo.
- **Mesclagem (função pura em `src/domain`, com teste), `merge(local, remote)`:**
  - `completions`: união por dia (um truque feito em qualquer aparelho fica feito).
  - `gratitude` e `sleepLog`: união por dia; no mesmo dia, vence o local (é o que a pessoa está vendo).
  - `settings`: vence o lado com `settingsUpdatedAt` maior; empate fica com o local.
  - `onboarded`: `true` se qualquer lado for `true`.
- **Envio:** lê o registro do servidor, mescla com o local e grava o resultado (ler-mesclar-gravar), para não apagar o que outro aparelho enviou.
- **Apagar dados (limite aceito):** a mesclagem só soma, então apagar a gratidão de um dia pode voltar se outro aparelho ainda a tiver. Sem marcadores de exclusão nesta versão. "Resetar dados", com conta, sobrescreve o registro do servidor em vez de mesclar.
- **Ações das notificações em segundo plano (Android):** continuam gravando só local (`markDoneInStorage`); o envio acontece na próxima abertura do app.
- **Quando sincroniza:** ao entrar, ao abrir o app, ao voltar para o primeiro plano, e depois de cada mudança (agrupando mudanças seguidas em um envio só). Sem internet, guarda local e tenta de novo depois.
- **Ao entrar:** baixa o registro do servidor, mescla com o local e reagenda as notificações.
- **Ao sair:** tenta enviar o que falta; se não conseguir (sem internet), avisa que as mudanças não enviadas serão perdidas e só sai se a pessoa confirmar. Depois apaga os dados locais e cancela as notificações (o aparelho pode ser compartilhado).
- **Conta obrigatória:** não há modo sem conta. A primeira abertura precisa de internet para criar a conta ou entrar; depois disso o app funciona sem internet.
- **Alvos:** o PWA (Vercel) é o principal e deve ser testado de ponta a ponta. O app nativo precisa compilar e funcionar com a mesma lógica (sessão guardada pelo adaptador do AsyncStorage), sem build de loja.
- **Excluir conta:** função SQL `delete_my_account()` com `security definer` que apaga `auth.users` da própria pessoa; a linha de `user_data` cai em cascata. Depois, o app faz o mesmo que "Sair".
- O aceite fica registrado nos metadados do usuário no cadastro: versão dos Termos e data/hora.

## Supabase: o que o usuário configura no painel

Quem constrói escreve um passo a passo em `docs/`, com o SQL pronto para colar no SQL Editor:

- tabela, RLS e a função de excluir conta;
- Authentication > Email: confirmar e-mail ligado; tamanho do código em 6;
- modelos de e-mail "Confirm signup" e "Reset password" em português, mostrando `{{ .Token }}` em vez de link;
- SMTP próprio (ver Perguntas em aberto).

## Variáveis e chaves

- `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em `.env.local` (fora do git) e na Vercel (já configuradas pelo usuário).
- Só a chave publishable no app. Nunca a `secret`.
- Faltando as variáveis, o app mostra um erro claro em vez de travar.

## Termos de uso e Política de privacidade

- Telas no app, em português, linguagem simples, cobrindo LGPD: quais dados (e-mail, horários, truques feitos, gratidões, afirmações, horário de sono), para quê, onde ficam (Supabase), por quanto tempo, como excluir, contato.
- Versionados (ex.: `2026-10-25`) para registrar qual versão foi aceita.
- Claude escreve um rascunho; o usuário deve revisar com quem entenda de direito antes de cobrar.

## Restrições do projeto

- Camadas do ESLint: `src/domain` puro; `src/components` sem `services`; `src/services` sem UI e sem `state`; AsyncStorage só em `src/services/storage.ts` (o cliente Supabase recebe o adaptador de armazenamento exportado de lá); `console` só em `src/services/log.ts`; arquivos com até 350 linhas.
- Dependências com `npx expo install`; consultar a documentação do SDK 58 antes de usar API Expo/RN.
- `npm run check` passando ao fim. Regras novas de domínio com teste.
- Atualizar `PRODUCT.md`, `AGENTS.md` (deixa de ser "sem login, sem backend") e `docs/architecture.md`.

## Decisões de Claude (o usuário pode mudar)

- Código de 6 dígitos em vez de link nos e-mails.
- Tela de conta sempre escura.
- Título da aba "Entrar".
- Sair apaga os dados locais.
- Uma linha por pessoa com o `AppData` em JSON, em vez de tabelas por tipo de dado.
- Mesclagem só soma (sem marcadores de exclusão); no mesmo dia vence o local; `settings` por `settingsUpdatedAt`.
- Sair sem internet avisa e pede confirmação antes de perder mudanças não enviadas.
- PWA testado de ponta a ponta; nativo compila e roda, sem build de loja.

## Fica com quem constrói

- Estrutura de componentes, nomes de arquivos e rotas.
- Detalhes de animação, tempos e curvas.
- Tom exato de cobalto no tema claro.
- Intervalo de agrupamento dos envios e estratégia de nova tentativa.
- Mensagens de erro (em português, sem jargão).

## E-mail (SMTP)

- Não há domínio próprio ainda (o app roda em `habitushub.vercel.app`).
- Desenvolvimento: SMTP padrão do Supabase, testando com o e-mail do dono do projeto.
- Antes de abrir ao público: SMTP do Gmail (`smtp.gmail.com`, porta 465, senha de app do Google) com uma conta Gmail criada só para o Habitus. O usuário configura a senha no painel; ela nunca entra no repositório.
- Depois, com usuários: comprar domínio e migrar para Resend.
- O guia em `docs/` cobre o SMTP do Gmail passo a passo.

## Perguntas em aberto

- Responsável pelos dados e e-mail de contato nos Termos e na Política: ficam numa constante única, com marcador visível, até o usuário informar. A conta Gmail do Habitus deve virar o contato.
- Retenção (proposta de Claude): enquanto a conta existir; tudo apagado ao excluir a conta.
- Ícone do app continua como está nesta entrega; recolorir em cobalto fica para depois.
