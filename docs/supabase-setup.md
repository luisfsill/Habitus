# Configurar o Supabase do Habitus

Passo a passo para deixar o login e a sincronização funcionando. Faça na ordem. Os nomes dos menus podem mudar um pouco no painel do Supabase; procure pelo nome mais parecido.

## 1. Chaves no app

Em **Project Settings**, copie a **Project URL** (Data API) e a chave **publishable** (API Keys) para:

- `.env.local` na raiz do projeto (fica fora do git);
- **Vercel → Settings → Environment Variables** (Production e Preview), seguido de um Redeploy.

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Nunca use a chave `secret` (ou `service_role`) no app, na Vercel ou no repositório.

## 2. Banco de dados

1. Abra **SQL Editor → New query**.
2. Cole todo o conteúdo de [`supabase/schema.sql`](../supabase/schema.sql) e clique em **Run**.

Isso cria a tabela `user_data` (uma linha por conta, com o progresso), as regras que deixam cada pessoa ver só os próprios dados (RLS) e a função usada por "Excluir conta".

## 3. E-mail com código de 6 dígitos

Em **Authentication → Sign In / Providers → Email**:

- **Confirm email**: ligado.
- **Email OTP Length**: `6`.
- **Email OTP Expiration**: `3600` (1 hora) está bom.

Em **Authentication → URL Configuration**, troque o **Site URL** de `http://localhost:3000` para `https://habitushub.vercel.app`. É para lá que o Supabase manda quem clicar em algum link antigo.

Em **Authentication → Emails → Templates**, troque o conteúdo de dois modelos. O app usa o código, não o link: no iPhone, um link abriria o Safari em vez do app instalado.

Os modelos ficam em [`supabase/email/`](../supabase/email), com as cores do app. Abra o arquivo, copie tudo e cole na aba **Source** do modelo, apagando o que estava lá:

| Modelo no Supabase | Assunto | Arquivo |
|---|---|---|
| **Confirm signup** | `Seu código do Habitus` | [`confirm-signup.html`](../supabase/email/confirm-signup.html) |
| **Reset password** | `Código para redefinir sua senha` | [`reset-password.html`](../supabase/email/reset-password.html) |

Clique em **Save changes** em cada modelo. Se chegar um e-mail em inglês "Confirm your email address" com um link em vez do código, o modelo não foi salvo: volte aqui. O Supabase só deixa editar os modelos com SMTP próprio ligado ("Set up custom SMTP to edit templates"): faça antes o passo 4 e depois volte.

## 4. Envio de e-mails pelo Gmail

O envio padrão do Supabase só entrega para os e-mails da equipe do projeto, e poucos por hora. Serve para testar com o seu próprio e-mail. Para outras pessoas r?eceberem o código, configure um Gmail só do Habitus.

1. Crie a conta Gmail do Habitus.
2. Em [myaccount.google.com/security](https://myaccount.google.com/security), ligue a **Verificação em duas etapas**.
3. Em [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), crie uma **senha de app** com o nome "Supabase". O Google mostra 16 letras: copie (sem os espaços).
4. No Supabase, **Authentication → Emails → SMTP Settings**, ligue **Enable custom SMTP** e preencha:
   - **Sender email**: o Gmail do Habitus
   - **Sender name**: `Habitus`
   - **Host**: `smtp.gmail.com`
   - **Port**: `465`
   - **Username**: o Gmail do Habitus
   - **Password**: a senha de app do passo 3
5. Salve. Em **Authentication → Rate Limits**, ajuste "emails sent per hour" para algo como `100`.

A senha de app é só sua: ela fica no painel do Supabase e nunca entra no código. O Gmail permite cerca de 500 e-mails por dia. Quando o Habitus tiver usuários, compre um domínio e troque para um serviço como o Resend.

## 5. Conferir

- **Authentication → Users**: as contas criadas aparecem aqui.
- **Table Editor → user_data**: uma linha por conta depois do primeiro uso.

## 6. Planos e administração

**Rode antes de publicar esta versão do app.** Sem estas tabelas, o app não consegue ler o plano da conta e mostra "Sem conexão".

1. Abra **SQL Editor → New query**.
2. Cole todo o conteúdo de [`supabase/admin.sql`](../supabase/admin.sql) e clique em **Run**.

Isso cria os perfis (nome, cargo, validade do acesso), os planos com os preços iniciais (Mensal R$ 9,90, Trimestral R$ 24,90, Anual R$ 79,90) e as funções do painel. Contas que já existiam ganham 7 dias de teste a partir de agora. Também cria os convites (`invites`): sem rodar a versão atual do arquivo, o botão **Gerar convite** do painel falha.

Se um dia você rodar `schema.sql` de novo, rode `admin.sql` logo depois: ele reaplica a regra de que só quem tem acesso ativo sincroniza.

## 7. Amigos

**Rode antes de publicar esta versão do app.** Sem estas tabelas e funções, a aba Amigos e a tela "Escolha seu @" não funcionam.

Cria o @usuário, a busca, os pedidos de amizade e o ranking da semana. Rode **depois** de `admin.sql` (passo 6). O Web Push (passo 9) é opcional: os avisos de pedido e de amizade aceita só começam a chegar quando `push.sql` estiver instalado, e os pedidos aparecem na aba Amigos de qualquer forma.

1. Abra **SQL Editor → New query**.
2. Cole todo o conteúdo de [`supabase/social.sql`](../supabase/social.sql) e clique em **Run**. Ele também cria a coluna `avatar_url`, o bucket público `avatars` do Storage (1 MB, só JPEG; cada conta grava e apaga só a própria pasta) e a função `set_my_avatar`.

Isso liga a extensão `unaccent` (busca sem acento), acrescenta `username` e `searchable` aos perfis e cria `public_stats`, `friendships`, `blocks` e `friend_request_log`. Os perfis continuam sem leitura pública: uma conta só vê outra pelas funções do arquivo, que nunca devolvem e-mail, plano ou validade. Se aparecer erro dizendo que `extensions.unaccent` não existe, a extensão foi ligada antes em outro esquema: em **Database → Extensions**, desligue `unaccent` e rode o arquivo de novo.

O roteiro para conferir está no fim desta página, em "Conferir os amigos".

### Ranking global

Rode **depois** de `social.sql` (e de novo sempre que `social.sql` mudar, porque ele recria funções que o ranking usa): abra **SQL Editor → New query**, cole todo o conteúdo de [`supabase/ranking.sql`](../supabase/ranking.sql) e clique em **Run**. Pode rodar de novo. Cria o registro do servidor (`ranking_tricks`, `ranking_water`, `ranking_settings`), o trigger em `user_data`, copia o que já existe e cria `global_ranking`, que calcula o XP da semana no servidor.

Para conferir, cole [`supabase/tests/ranking.sql`](../supabase/tests/ranking.sql) em outra query e rode. Esperado: `ranking ok` (e `ranking_ingest ok`, se houver algum usuário) nas mensagens. O script não deixa linhas no banco.

### Pagamentos

Rode **depois** de `admin.sql` e `social.sql`: abra **SQL Editor → New query**, cole todo o conteúdo de [`supabase/payments.sql`](../supabase/payments.sql) e clique em **Run**. Pode rodar de novo.

Cria:

- `app_config`, com `payment_mode = manual` e `pagbank_env = sandbox`;
- `payments`, o histórico de pedidos manuais e automáticos;
- `billing_info`, o CPF de quem paga pelo Pix automático. Nenhuma função de amigos, ranking ou admin devolve o CPF.

Também cria as funções da área **Admin > Pagamentos** e as que só as Edge Functions do PagBank chamam (`grant_payment` e as demais, só para `service_role`).

Para conferir, cole [`supabase/tests/payments.sql`](../supabase/tests/payments.sql) em outra query e rode. Esperado: `payments ok` nas mensagens. Ele precisa de pelo menos uma conta com perfil e não deixa linhas no banco.

## 8. Publicar a função `admin-users`

Criar usuários, trocar e-mail e gerar senha pelo painel usam uma pequena função que roda no Supabase.

**Pelo painel (mais fácil):**

1. **Edge Functions → Deploy a new function → Via Editor**.
2. Nome: `admin-users` (exatamente assim).
3. Apague o exemplo, cole todo o conteúdo de [`supabase/functions/admin-users/index.ts`](../supabase/functions/admin-users/index.ts) e clique em **Deploy**.

**Pela linha de comando (alternativa):** com a [Supabase CLI](https://supabase.com/docs/guides/cli) instalada e logada:

```bash
npx supabase functions deploy admin-users --project-ref SEU_PROJECT_REF
```

A função usa a chave secreta que o próprio Supabase fornece a ela. Você não precisa copiar nenhuma chave.

## 9. Lembretes com o app fechado (Web Push)

Sem este passo, no iPhone e no navegador os lembretes só chegam com o Habitus aberto. Faça uma vez:

1. **Gere as chaves.** Na pasta do projeto, rode o comando abaixo. Ele mostra duas linhas, `VAPID_PUBLIC_KEY=…` e `VAPID_PRIVATE_KEY=…`. Guarde as duas; a privada é segredo.

   ```bash
   node scripts/vapid-keys.mjs
   ```

2. **Chave pública no app.** Em `.env.local` e na **Vercel → Settings → Environment Variables**, crie `EXPO_PUBLIC_VAPID_PUBLIC_KEY` com o valor de `VAPID_PUBLIC_KEY`. Na Vercel, faça um Redeploy. Só a chave pública vai aqui: a `VAPID_PRIVATE_KEY` nunca entra no `.env.local` nem no app (só é lida pela Edge Function no passo 3).
3. **Segredos da função.** Em **Edge Functions → Secrets**, crie:
   - `VAPID_PUBLIC_KEY`: a chave pública;
   - `VAPID_PRIVATE_KEY`: a chave privada;
   - `VAPID_SUBJECT`: `mailto:` seguido do seu e-mail (ex.: `mailto:seu_email@gmail.com`).
4. **Publique a função.** **Edge Functions → Deploy a new function → Via Editor**, nome `push-send` (exatamente assim), cole todo o conteúdo de [`supabase/functions/push-send/index.ts`](../supabase/functions/push-send/index.ts) e clique em **Deploy**. Depois, nos detalhes da função, **desligue "Verify JWT"** (ou "Enforce JWT verification"): quem chama é o agendador do banco, sem login. Ela só envia lembretes que já venceram, então isso não abre brecha.
5. **Banco e agendador.** Abra [`supabase/push.sql`](../supabase/push.sql), troque `SEU_PROJECT_REF` pelo **Reference ID** do projeto (**Project Settings → General**), cole no **SQL Editor** e clique em **Run**. Se aparecer erro de permissão nas extensões, ligue `pg_cron` e `pg_net` em **Database → Extensions** e rode de novo.
6. **No iPhone.** Abra o Habitus instalado, permita as notificações e use o app por alguns segundos. Em **Table Editor → push_subscriptions** deve aparecer uma linha, e em **push_queue** os próximos lembretes. Feche o app e espere o horário da próxima dica.

Para conferir o agendador: **Integrations → Cron** (ou `select * from cron.job_run_details order by start_time desc limit 5;`) mostra uma execução por minuto. Os registros da função ficam em **Edge Functions → push-send → Logs**.

## 10. Virar administrador

Crie sua conta no app normalmente. Depois, no **SQL Editor**, rode (com o seu e-mail):

```sql
update public.profiles set role = 'admin', unlimited = true where email = 'seu_email@gmail.com';
```

Feche e abra o app: a aba **Admin** aparece na barra de baixo.

## 11. Pix automático (PagBank)

Só é preciso para o modo **Automático** de **Admin > Pagamentos**. O modo **Manual** (Pix estático e comprovante pelo WhatsApp) funciona sem nada disto. Antes, rode `payments.sql` (seção "Pagamentos" do passo 2).

1. **Tokens do PagBank.** Gere um token de sandbox (no portal de desenvolvedores do PagBank) e um de produção (na sua conta PagBank).
2. **Segredos.** No Supabase, abra **Edge Functions → Secrets** e crie:
   - `PAGBANK_TOKEN_SANDBOX`: o token de sandbox;
   - `PAGBANK_TOKEN_PRODUCTION`: o token de produção.

   Os tokens ficam só aqui. Nunca vão para o código, o app, o `.env.local` nem o banco.
3. **Publique as funções** pela linha de comando, porque as duas usam o arquivo compartilhado `supabase/functions/_shared/pagbank.ts`:

   ```bash
   npx supabase functions deploy pix-checkout --project-ref SEU_PROJECT_REF
   npx supabase functions deploy pagbank-webhook --no-verify-jwt --project-ref SEU_PROJECT_REF
   ```

   `pagbank-webhook` fica sem verificação de JWT porque o PagBank chama sem login. Ela não confia no corpo do aviso: reconsulta o pedido no PagBank antes de liberar qualquer coisa.
4. **Teste no sandbox.**
   1. Em **Admin > Pagamentos**, deixe **Ambiente do PagBank: Teste** e escolha **Automático**.
   2. Com uma conta de teste, toque em **Assinar** num plano, informe um CPF válido e confira se o QR aparece. Use um e-mail diferente do e-mail da conta PagBank: o PagBank pode recusar comprador e vendedor iguais.
   3. Simule o pagamento do pedido (`ORDE_...`) como a documentação de sandbox do PagBank indicar. Em até 10 s depois do aviso, a tela mostra "Pagamento confirmado" e a conta ganha os dias do plano.
   4. Se o aviso não chegar, toque em **Consultar no PagBank** no detalhe do pagamento. Os motivos de cada aviso ignorado ficam em **Edge Functions → pagbank-webhook → Logs**.
   5. Para conferir a queda para o manual, apague `PAGBANK_TOKEN_SANDBOX` e toque em **Assinar** de novo: deve aparecer o Pix manual com o aviso. Depois, crie o segredo de novo.
5. **Produção.** Com o sandbox funcionando, troque para **Ambiente do PagBank: Produção**. Faça uma compra real de valor baixo para conferir. Os pagamentos de teste continuam no histórico com a etiqueta "Teste" e nunca entram no faturamento.

Se algo der errado, volte para **Manual** em **Admin > Pagamentos**: o app passa a usar o Pix estático na hora.

## Conferir os amigos

Depois do passo 7, use duas contas de teste (A e B), cada uma num navegador ou aparelho:

1. Crie as duas contas e escolha um @ para cada uma na tela "Escolha seu @".
2. Em A, abra **Amigos → Buscar amigos** e busque `%` e depois `ab`. Nenhuma das duas buscas deve listar alguém.
3. Em A, busque o @ de B. B aparece.
4. Em B, desligue **Ajustes → Conta → Aparecer na busca**. Em A, busque o @ de B de novo: B some. Em B, abra a busca: aparece o aviso de que B está fora da busca e nenhuma busca é feita. Ligue de novo em B.
5. Em A, abra o perfil de B e toque em **Pedir amizade**. Em B, o pedido aparece em **Pedidos** na aba Amigos.
6. Em B, toque em **Recusar**. Em A, o perfil de B mostra "Tente de novo mais tarde" no lugar de "Pedir amizade".
7. Torne uma terceira conta administradora (passo 10). Em A, busque o @ dela: ela não aparece.
