# Amigos: @usuário, busca, pedidos de amizade e ranking semanal

Data: 2026-10-27. Status: rascunho para aprovação.

## Intenção

Criar o primeiro passo social do Habitus: as pessoas se acharem pelo nome ou pelo @, virarem amigas (pedido e aceite, como no Facebook) e se compararem num ranking semanal só entre amigos. O objetivo é retenção: ver amigos praticando puxa a pessoa a praticar. Esta fase não tem texto livre entre usuários (sem chat, sem mural), então não exige moderação de conteúdo.

## Objetivos

- Cada conta tem um **@usuário único**.
- Buscar pessoas pelo nome ou pelo @, abrir o perfil e pedir amizade.
- Aceitar, recusar, cancelar pedido enviado, desfazer amizade e bloquear.
- Nova aba **Amigos** com o ranking da semana no topo, depois pedidos pendentes e a lista de amigos.
- Perfil de outra pessoa: nome, @, faixa e nível para todos; sequência de dias e conquistas só para amigos.
- Opção "Aparecer na busca" em Ajustes, ligada por padrão.

## Fora do escopo (fases seguintes)

- Incentivos prontos (reações), desafios em grupo, mural, chat.
- Foto de perfil.
- Push nativo (iOS/Android instalados pela loja): esta fase só avisa por Web Push, como os lembretes do PWA.
- XP calculado no servidor (ver "Confiança no XP").

## Anti-objetivos

- O e-mail de alguém aparecer para outro usuário, por qualquer caminho (tela ou API).
- Listar todos os usuários do app pela API (busca vazia, `%`, paginação sem fim).
- Um usuário comum achar um administrador na busca.
- Alguém escondido aparecer na busca, ou conseguir buscar.
- Uma pessoa bloqueada conseguir achar, ver o perfil ou mandar pedido para quem a bloqueou.
- Registrar @habitus, @admin ou parecidos.
- O cancelamento de lembretes apagar os avisos de amizade da fila de push.

## Decisões do usuário

1. **@usuário único**, mostrado embaixo do nome. A busca acha por nome ou por @.
2. **Visibilidade**: todos aparecem por padrão. Quem desmarca "Aparecer na busca" some da busca **e** não consegue buscar ninguém. Amizades existentes continuam (decisão confirmada).
3. **@ reservados**: @habitus e parecidos ficam restritos.
4. **Administradores**: não aparecem na busca de usuários comuns. Eles buscam e mandam pedidos normalmente. O perfil de um admin mostra um selo de equipe (texto provisório **"Fundador"**, fácil de trocar).
5. **Aba Amigos** com ranking da semana no topo. "Qualquer coisa a gente vai ajustando com o tempo."
6. Perfil público com nome, @, faixa e nível; sequência e conquistas só para amigos. E-mail nunca aparece.
7. **Plano vencido**: a conta some da busca e do ranking dos amigos até renovar; as amizades ficam guardadas. Na prática:
   - quem está sem acesso não chama as funções sociais, porque elas exigem `has_access()`, como a gravação de `user_data`, e de qualquer forma só vê a tela de renovação;
   - `search_users` exclui contas sem acesso;
   - `my_friends` continua listando o amigo vencido na lista de amigos, mas tira ele do ranking;
   - a gravação em `public_stats` também exige `has_access()`.

## Regras do @usuário

- 3 a 20 caracteres, `a-z`, `0-9`, `.` e `_`. Não começa nem termina com `.`, sem `..`. Guardado em minúsculas, sem o `@`.
- Único sem diferenciar maiúsculas (índice único).
- **Reservados**: depois de normalizar (minúsculas, `0→o`, `1→i`, `3→e`, `4→a`, `5→s`, `7→t`, remover `.` e `_`), recusa se **contém** `habitus` ou é igual a um da lista: `admin`, `administrador`, `suporte`, `support`, `moderador`, `staff`, `equipe`, `oficial`, `official`, `root`, `sistema`, `fundador`. Administradores podem usar reservados (o fundador pode querer `@habitus`).
- A regra vive em `src/domain/username.ts` (função pura com teste) **e** é repetida no SQL, que é a fonte da verdade. Os testes de domínio e a função SQL usam a mesma lista.
- **Sugestão**: a partir do nome (primeiro + último, sem acento, minúsculas, unidos por `.`), cortado a 20; se ocupado ou reservado, acrescenta dígitos (`joao.silva2`, `3`…). O servidor confere a disponibilidade.

## Contas existentes e novas

- Conta sem @ (todas as atuais e as novas): ao entrar no app com acesso ativo, aparece a tela **"Escolha seu @"** com a sugestão preenchida, conferência ao vivo ("disponível" / "já em uso" / motivo da recusa) e o botão Continuar. Não dá para pular: o @ é obrigatório para usar o app depois desta versão.
- Trocar o @ depois em **Ajustes > Conta**. Sem limite de trocas nesta fase (chamada do builder: se virar abuso, limitar).
- O cadastro não ganha campo novo; a escolha acontece na tela acima, logo após o primeiro login.

## Banco (novo arquivo `supabase/social.sql`, roda depois de `admin.sql`)

### `profiles` ganha colunas

- `username text unique` (null até escolher), `searchable boolean not null default true`.
- `profiles` continua sem leitura pública: a política atual (só o próprio perfil ou admin) **não muda**, porque a tabela tem e-mail, plano e validade.

### `public_stats` (uma linha por conta, escrita pelo próprio dono)

- `user_id` (PK, FK `auth.users`, cascade), `xp int`, `level int`, `streak int`, `badges text[]` (ids das conquistas liberadas), `week_start date` (domingo da semana local do usuário), `week_xp int`, `updated_at`.
- RLS: insert/update só da própria linha; **sem select direto** para ninguém. A leitura é só pelas funções abaixo.
- O app grava junto com cada sincronização (`pushMerged`), a partir de `computeStats`/`progressOf`.

### `friendships`

- `requester uuid`, `addressee uuid`, `status text check in ('pending','accepted')`, `created_at`, PK `(requester, addressee)`, `check (requester <> addressee)`. Índice único em `(least(a,b), greatest(a,b))` para impedir pedido duplicado nos dois sentidos.
- RLS: select só onde `auth.uid()` é uma das pontas; sem insert/update/delete direto (só pelas funções).

### `blocks`

- `blocker uuid`, `blocked uuid`, PK dos dois. Bloquear apaga a amizade/pedido entre os dois. RLS: o bloqueador lê os próprios; mudanças só pela função.

### Funções (todas `security definer`, `set search_path = ''`, só `authenticated`)

| Função | O que faz |
|---|---|
| `set_my_username(name text)` | Valida formato e reservados (exceto admin), grava. Erro em português com `errcode 42501`, como o resto. |
| `username_available(name text) → boolean` | Conferência ao vivo na tela "Escolha seu @". |
| `set_my_searchable(on boolean)` | Liga/desliga "Aparecer na busca". |
| `search_users(q text)` | Recusa se quem busca está escondido. Exige 3+ caracteres (sem contar `@`). Busca sem acento (`unaccent`) por prefixo do @ ou por nome contendo o termo. Exclui: a própria conta, contas escondidas, contas sem @, quem bloqueou ou foi bloqueado por quem busca, e **administradores quando quem busca não é admin**. Máximo 20, ordem: @ exato, depois prefixo, depois nome. Devolve só `id, name, username, level, is_admin, relation`. |
| `get_user_profile(uid uuid)` | Recusa se há bloqueio entre os dois, ou se a conta é invisível para quem pede (regra abaixo). Devolve nome, @, nível, `is_admin`, `relation`; e `streak`, `badges` só se forem amigos. |
| `send_friend_request(uid uuid)` | Recusa: a si mesmo, bloqueio, pedido ou amizade já existente, alvo invisível para quem pede **a menos que** já haja um pedido dele para mim (aí aceita), e os limites de "Pedidos repetidos". Enfileira um Web Push para o alvo. |
| `respond_friend_request(uid uuid, accept boolean)` | Aceitar vira `accepted` (e avisa quem pediu); recusar apaga a linha em silêncio. |
| `cancel_friend_request(uid)` / `remove_friend(uid)` | Apagam a linha. |
| `block_user(uid)` / `unblock_user(uid)` | Bloqueio descrito acima. Desbloquear não refaz a amizade. |
| `my_friends()` | Amigos aceitos com nome, @, nível, `is_admin`, e `week_xp` (0 se `week_start` não é a semana atual do amigo). Pedidos recebidos e enviados pendentes. |

`relation` ∈ `none`, `outgoing`, `incoming`, `friends`.

### Quem é "invisível" para quem

Uma conta é **invisível para um visitante** quando ela está escondida (`searchable = false`) ou quando é admin e o visitante não é admin. Isso segue as palavras do usuário: quem se esconde "não aparece para ninguém", e os admins "não são rastreados". Para um visitante, uma conta invisível:

- não aparece em `search_users`;
- em `get_user_profile`, só é lida se já houver amizade ou pedido pendente entre os dois (em qualquer sentido); senão a função responde como "não encontrado";
- em `send_friend_request`, só aceita pedido se ela já pediu o visitante (aí vira aceite). Consequência: um usuário comum nunca começa uma amizade com um admin; só o admin começa.

### Pedidos repetidos (chamada do builder)

- Tabela `friend_request_log` (`requester`, `addressee`, `sent_at`, `declined_at`), só lida pelas funções.
- Limite de 30 pedidos por dia contado nesse log, então mandar e cancelar em sequência também conta.
- Mesmo par: no máximo um aviso de push a cada 7 dias.
- Depois de uma recusa, quem pediu não consegue pedir de novo à mesma pessoa por 30 dias. A tela mostra "Pedir amizade" desativado com "Tente de novo mais tarde", sem dizer que houve recusa.

Extensões: `unaccent` (e `pg_trgm` se a busca por nome contendo ficar lenta; índice por `lower(username)` já cobre o prefixo).

### Push

- Avisos de amizade entram em `push_queue` com id `social:<tipo>:<uuid>` e `send_at = now()`, inseridos pela função (security definer).
- **Mudança obrigatória**: `src/services/notifications.ts` linha ~202 cancela tudo que não é avulso (`!isOneOffId(id)`), o que apagaria esses avisos da fila. Os predicados de cancelamento do Web Push devem ignorar ids `social:`.
- Textos: "{nome} quer ser seu amigo no Habitus" e "{nome} aceitou seu pedido de amizade". URL `/amigos`.
- Quem não usa Web Push vê os pedidos ao abrir a aba (badge com a contagem na aba Amigos).

## Ranking da semana

- Semana do app: **domingo a sábado**, a mesma de `weekDays` e do bônus de semana perfeita (chamada do builder; antes, na conversa, falei "segunda a domingo").
- `week_xp` = XP total agora − XP total calculado até o fim do sábado anterior (mesmo `computeStats`, com `today` = sábado anterior). Função pura nova em `src/domain/gamification.ts`, com teste.
- Ranking = eu + amigos aceitos, ordenado por `week_xp` (empate: nome). Mostra posição, nome, @, faixa e XP da semana; minha linha destacada. Amigo com `week_start` antigo conta 0.
- Ordenação e "semana atual" são função pura em `src/domain/friends.ts`, com teste.

## Confiança no XP

O XP é calculado no aparelho e publicado pelo próprio app; alguém mexendo na API pode inflar o próprio número. Aceito nesta fase porque o ranking é só entre amigos. Marcar no código como `shortcut:` e, se o ranking virar global, recalcular no servidor a partir de `user_data`.

## Telas

- **Aba Amigos** (`src/app/(tabs)/friends.tsx`, rota `/amigos` no web), 5ª aba entre Conquistas e Ajustes: ranking da semana, "Pedidos" (aceitar/recusar), lista de amigos e botão "Buscar amigos". Estado vazio convida a buscar.
- **Buscar amigos**: campo com busca após 3 letras (atraso de ~300 ms), lista com nome, @ e faixa; tocar abre o perfil. Se a pessoa está escondida: aviso "Você está fora da busca" com atalho para ligar em Ajustes.
- **Perfil** (`/amigos/[id]`): nome, @, selo da faixa, nível, selo "Fundador" se admin; sequência e conquistas se amigo; botão conforme a relação (Pedir amizade / Pedido enviado — cancelar / Aceitar e Recusar / Amigos — menu com Desfazer amizade e Bloquear). Bloquear pede confirmação.
- **Escolha seu @**: tela cheia, visual das telas de conta.
- **Ajustes > Conta**: mostra o @ (editável) e o interruptor "Aparecer na busca", com a explicação "Se desligar, ninguém acha você e você também não pode buscar ninguém."
- Seguir `docs/design.md` e os componentes existentes (`Glass`, `AppText`, `Icon`, `ActionRow`).

## Termos e privacidade

- Atualizar `src/domain/legal.ts`: nome, @, nível, faixa, sequência e conquistas ficam visíveis a outros usuários conforme as regras acima; como se esconder; bloqueio. Subir `TERMS_VERSION` (o fluxo de aceite existente pede o novo aceite).

## Camadas e arquivos (previsão)

- `src/domain/username.ts`, `src/domain/friends.ts` (+ testes); `gamification.ts` ganha o XP da semana.
- `src/services/social.ts`: chamadas RPC e gravação de `public_stats`.
- `src/state`: provedor ou hook da aba Amigos (contagem de pedidos para o badge).
- `supabase/social.sql` e o passo novo em `docs/supabase-setup.md`; `docs/architecture.md` atualizado.

## Deixado para o builder

- Formato exato das respostas das funções SQL e tipos TS correspondentes.
- Visual fino das telas dentro do design existente.
- Quando atualizar a aba (ao focar, puxar para atualizar).
