# Pix automático pelo PagBank, com escolha manual/automático no Admin

Data: 2026-10-28. Status: aguardando aprovação. Revisado por um construtor; decisões do Claude marcadas.

## Intenção

Hoje a renovação é por Pix estático. O app gera o QR com a chave do dono, o valor do plano e um código de pedido. A pessoa paga, manda o comprovante pelo WhatsApp e o dono confere o extrato e libera no Admin. Isso funciona e deve continuar.

O dono quer um segundo modo, **automático**. Nele, cada compra gera uma cobrança Pix pela API de Pedidos do PagBank, e o plano é liberado sozinho quando o Pix é pago, sem comprovante. Em **Admin > Método de pagamento**, o dono escolhe qual dos dois modos o app usa. Assim, se o automático falhar, ele volta para o manual com um toque.

## Objetivos

1. **Configuração global** `payment_mode`, com valor `manual` ou `automatic`. Padrão `manual`. Só admin muda; qualquer conta logada lê.
2. **Admin > Método de pagamento:** a escolha entre Manual e Automático e o ambiente do PagBank (Teste ou Produção).
3. **Modo manual:** exatamente a tela atual (Pix estático e comprovante pelo WhatsApp).
4. **Modo automático:**
   - "Assinar <plano>" cria a cobrança no servidor, que fala com o PagBank.
   - A tela mostra o QR e o "copia e cola" devolvidos pelo PagBank.
   - Quando o pagamento é confirmado, os dias do plano são somados à conta e a tela mostra "Pagamento confirmado", liberando o app.
5. **Fallback:** se o automático falhar ao criar a cobrança (PagBank fora do ar, token ausente ou inválido), a tela mostra o Pix manual, com a mensagem "Não deu para gerar o Pix automático agora. Pague por este Pix e envie o comprovante."
6. **O token do PagBank** fica só nos segredos do Supabase. Nunca entra no código, no app nem no banco.

## Fora do escopo

- Cartão, boleto e assinatura recorrente: cada compra é avulsa.
- Estorno e reembolso pelo app. O dono faz isso pelo PagBank.
- Histórico de pagamentos para o usuário. Para o admin, o pagamento aparece só como linha no banco por enquanto. Decisão do Claude.

## Anti-objetivos (se acontecer, falhou)

- Liberar acesso sem o PagBank confirmar o pagamento, por exemplo confiando no corpo do webhook ou no app.
- Liberar o mesmo pagamento duas vezes, quando o webhook chega repetido.
- Cobrar um valor diferente do preço do plano no servidor.
- O app quebrar ou travar no modo automático quando o PagBank falha, sem cair no manual.

## Banco (`supabase/payments.sql`, novo; roda depois de `admin.sql`)

**`app_config` (key text pk, value text)**
- Linhas `payment_mode` (`manual` | `automatic`) e `pagbank_env` (`sandbox` | `production`).
- RLS: leitura por `authenticated`; escrita só pela RPC `admin_set_config(key, value)`, que valida a chave e o valor e exige `require_admin()`.

**`payments`**

| Coluna | Tipo e regra |
| --- | --- |
| `id` | uuid pk default `gen_random_uuid()` |
| `user_id` | references `auth.users` on delete cascade |
| `plan_id` | text references `plans` |
| `amount_cents` | int |
| `days` | int |
| `env` | text |
| `pagbank_order_id` | text unique |
| `status` | text: `pending`, `paid`, `expired` ou `failed` |
| `created_at` | timestamptz |
| `paid_at` | timestamptz |

- RLS: cada um lê só as próprias linhas; ninguém escreve direto.
- `amount_cents` e `days` são copiados do plano na hora da compra, então mudar o preço depois não afeta cobranças abertas.

**`grant_payment(payment_id uuid)`** (security definer, só `service_role`)
- Se o pagamento já está `paid`, não faz nada.
- Senão marca `paid` e `paid_at = now()` e soma `days` à validade da conta, com a mesma regra de `extendAccess`: a partir da validade atual se ela ainda corre, senão a partir de agora. Também põe `plan = 'paid'`.
- Tudo numa transação, com `select ... for update` na linha do pagamento.

## Edge Functions (Deno, como `admin-users`)

Segredos no Supabase: `PAGBANK_TOKEN_SANDBOX` e `PAGBANK_TOKEN_PRODUCTION`. O ambiente vem de `app_config.pagbank_env`, e com ele a URL base: `https://sandbox.api.pagseguro.com` ou `https://api.pagseguro.com`. Cabeçalho `Authorization: Bearer <token>`.

**`pix-checkout`** (chamada pelo app com o JWT do usuário)
1. Lê o usuário do JWT e exige acesso à conta (`require_access` não vale aqui, porque a conta pode estar vencida; basta estar logado). Lê `payment_mode`. Se não for `automatic`, responde `{ mode: "manual" }`.
2. Lê o plano ativo por `plan_id` no banco (preço do servidor) e cria `payments` com `pending`.
3. Faz `POST /orders` no PagBank:
   - `reference_id` = id do pagamento;
   - `customer` com o nome e o e-mail da conta;
   - `items` com 1 item: o nome do plano e o valor;
   - `qr_codes`: `[{ amount: { value: amount_cents }, expiration_date: agora + 30 min }]`;
   - `notification_urls`: `[<URL da função pagbank-webhook>]`.
4. Grava `pagbank_order_id` e devolve `{ mode: "automatic", paymentId, qrText, expiresAt }`.
5. Em qualquer erro do PagBank, marca `failed` e devolve `{ mode: "fallback" }`. A função nunca repassa a resposta crua do PagBank ao app.

**`pagbank-webhook`** (público, `verify_jwt = false`)
1. Lê do corpo só o `id` do pedido (`ORDE_...`) e o `reference_id`. Não confia em mais nada.
2. Faz `GET /orders/{id}` no PagBank com o token do ambiente do pagamento.
3. Confere três coisas:
   - o `reference_id` bate com um `payments` existente;
   - `order.id` bate com `pagbank_order_id`;
   - alguma `charge` tem `status` `PAID` com `amount.value` igual a `amount_cents`.

   Só então chama `grant_payment`.
4. Sempre responde 200 rápido, mesmo quando ignora o aviso, para o PagBank não ficar repetindo. Registra o motivo no log da função.

## App

- `src/services/payments.ts`:
  - `startPixCheckout(planId)` chama a função e devolve o resultado tipado (`manual`, `fallback` ou `automatic`);
  - `paymentStatus(id)` lê a própria linha em `payments`;
  - `getPaymentConfig()` e `setPaymentConfig()` cuidam do Admin.
- `renovar.tsx`, no passo do Pix:
  - **manual ou fallback:** a tela atual. No fallback aparece a mensagem do objetivo 5.
  - **automático:**
    - QR (`PixQr` com `qrText`), "Copiar Pix copia e cola" e "Aguardando pagamento…" com um contador até expirar.
    - A tela consulta `paymentStatus` a cada 5 s. Com `paid`: "Pagamento confirmado", `refresh()` e vai para Hoje. Com `expired` (passou o prazo): "O Pix expirou" e o botão "Gerar outro Pix".
    - O rodapé tem "Falar com a gente" (WhatsApp, mensagem genérica com o código do pedido) e "Trocar plano".
- **Admin:**
  - Item novo "Método de pagamento" no menu e na barra de seções (`AdminSection` ganha `payment`).
  - A tela tem duas linhas de rádio, Manual e Automático, e uma linha "Ambiente do PagBank: Teste / Produção".
  - No modo automático, um aviso explica que os tokens precisam estar nos segredos do Supabase.
  - Salvar chama `admin_set_config`.

## Documentação

- `docs/supabase-setup.md`:
  - rodar `payments.sql`;
  - publicar as 2 funções, com `pagbank-webhook` em `--no-verify-jwt`;
  - cadastrar os 2 segredos, passo a passo no Dashboard;
  - testar no sandbox e trocar para produção.
- `docs/architecture.md`: o fluxo, e por que o webhook consulta o pedido em vez de confiar no corpo.
- `docs/design.md`: a tela do Admin e os estados do passo automático.

## Critério de aceite

- `npm run check` passa. Os testes de domínio cobrem:
  - a regra de soma de dias, comparada com `extendAccess`;
  - o parser da resposta de `pix-checkout`.
- **Manual:** no modo manual nada muda na tela de planos.
- **Automático no sandbox:** "Assinar" mostra o QR do PagBank. Um pagamento simulado no sandbox libera a conta em até 10 s depois do webhook.
- **Webhook repetido** não soma dias duas vezes.
- **Webhook falso** com status `PAID` no corpo, mas pedido não pago no PagBank, não libera nada.
- **Token ausente ou inválido:** "Assinar" cai no Pix manual com a mensagem do objetivo 5.

## Deixado ao construtor

- Texto exato dos estados e do aviso do Admin, dentro do tom do app.
- Ordem das tarefas. Sugestão: SQL, depois as funções, depois o app, e o Admin por último.
- Tempo de expiração do QR. Sugestão: 30 min.

## CPF (decisão do dono: pedir e guardar)

O PagBank exige `customer.tax_id` (CPF) para criar a cobrança.

- **Onde fica:** tabela `billing_info (user_id pk references auth.users on delete cascade, tax_id text not null, updated_at)`. RLS: cada conta lê só a própria linha; ninguém escreve direto.
- **Como é gravado:** pela RPC `set_my_tax_id(cpf text)`, que guarda só os 11 dígitos e valida os dígitos verificadores no SQL. A regra também existe em `src/domain/cpf.ts` (`isValidCpf`, `formatCpf`), com teste.
- **No app:** no modo automático, se a conta ainda não tem CPF, o passo do Pix pede "CPF de quem paga" antes de gerar o QR, com máscara `000.000.000-00` e erro "CPF inválido". Nas próximas compras o CPF já vem preenchido, com "Trocar" ao lado. O CPF aparece mascarado (`***.456.789-**`).
- **Uso:** só `pix-checkout` lê o CPF, para mandar ao PagBank. Ele nunca aparece em nenhuma função de amigos, ranking ou admin. O Admin não vê o CPF.
- **Privacidade:** a Política ganha um item: "CPF, se você pagar pelo Pix automático, guardado só para gerar a cobrança no PagBank". Excluir a conta apaga o CPF (cascade).

## Decisões do Claude depois da revisão

- **Formato do pedido:** a documentação marca o exemplo com `qr_codes` como "[Depreciado]". O construtor usa o formato atual que a documentação recomenda para Pix e confirma no sandbox. O webhook sempre reconsulta o pedido e aceita `charges` com `PAID` ou `qr_codes` pago.
- **Webhook:** o corpo serve só para achar a linha de `payments` (`reference_id`) e o pedido. O ambiente e o token vêm da linha. Se a documentação publicar a verificação SHA256 do cabeçalho, ela também é feita, sem dispensar a reconsulta.
- **Expiração:** a função define `expiration_date` (30 min) e devolve `expiresAt` calculado por ela. O status `expired` é marcado de forma preguiçosa: ao consultar `paymentStatus` ou ao criar outro checkout, um `pending` vencido vira `expired`. Se o PagBank disser `PAID` depois do prazo, o acesso é liberado, porque o dinheiro entrou.
- **Toques repetidos em "Assinar":** reaproveita um `pending` do mesmo plano ainda dentro do prazo. Limite de 5 cobranças por hora por conta; acima disso, cai no Pix manual.
- **Permissões:** `grant_payment` recebe `execute` só para `service_role` e fica fora do laço de `grant ... to authenticated` de `admin.sql`. `pix-checkout` só exige estar logado, não ter acesso ativo.
- **Teste da soma de dias:** `grant_payment` replica `extendAccess`. O SQL ganha um teste em `supabase/tests/payments.sql`, no padrão de `tests/ranking.sql`.
- **Repetição do webhook:** a documentação não diz como o PagBank repete avisos. Responder 200 e manter `grant_payment` idempotente cobre os dois casos.

## Pontos a confirmar na implementação

- O formato exato do corpo do webhook do PagBank para `qr_codes` (onde vêm `id` e `reference_id`). A função aceita os dois formatos documentados (pedido com `charges` e pedido com `qr_codes`) e sempre reconsulta o pedido.
- Como simular o pagamento de um QR no sandbox do PagBank.
