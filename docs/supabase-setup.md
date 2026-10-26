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

Isso cria os perfis (nome, cargo, validade do acesso), os planos com os preços iniciais (Mensal R$ 9,90, Trimestral R$ 24,90, Anual R$ 79,90) e as funções do painel. Contas que já existiam ganham 7 dias de teste a partir de agora.

Se um dia você rodar `schema.sql` de novo, rode `admin.sql` logo depois: ele reaplica a regra de que só quem tem acesso ativo sincroniza.

## 7. Publicar a função `admin-users`

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

## 8. Virar administrador

Crie sua conta no app normalmente. Depois, no **SQL Editor**, rode (com o seu e-mail):

```sql
update public.profiles set role = 'admin', unlimited = true where email = 'seu_email@gmail.com';
```

Feche e abra o app: a aba **Admin** aparece na barra de baixo.
