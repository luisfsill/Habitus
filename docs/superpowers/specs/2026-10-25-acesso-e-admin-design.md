# Acesso por plano e painel administrativo

Data: 2026-10-25. Status: rascunho para aprovação.

## Intenção

O Habitus passa a ser pago: 7 dias grátis e depois um plano por tempo. O dono do app precisa de um painel para achar uma pessoa pelo nome e liberar o acesso dela em segundos (hoje, depois de receber um Pix pelo WhatsApp), além de gerenciar as contas. O pagamento automático é um projeto separado, que vem depois deste e usa o que ele cria.

## Objetivos

- Cada conta tem uma validade de acesso. A conta nova ganha 7 dias grátis.
- Com o acesso vencido, a pessoa vê só a tela "Seu plano acabou" com os planos e um botão para renovar pelo WhatsApp.
- Painel `/admin` para administradores: buscar, liberar, editar, criar, excluir e trocar o cargo (administrador ou usuário comum).
- Planos e preços editáveis no painel.
- O cadastro passa a pedir o nome.

## Fora do escopo (projeto 3, depois)

- Pagamento automático (Mercado Pago, Pix, cartão) e liberação automática após o pagamento.
- Histórico de pagamentos, cupons, recibos.
- Planos com funcionalidades diferentes (todos liberam o app inteiro).

## Anti-objetivos

- Uma pessoa comum conseguir mudar a própria validade ou o próprio cargo, mesmo mexendo no app ou chamando a API do Supabase.
- A chave `secret`/`service_role` no app ou no repositório.
- Quem pagou ficar bloqueado por estar sem internet.
- O administrador conseguir tirar o próprio cargo ou excluir a própria conta e ficar trancado fora.
- Lembretes chegando para quem não consegue abrir o app.

## Planos (decididos)

| Plano | Dias | Preço |
|---|---|---|
| Teste grátis | 7 | R$ 0, uma vez por conta, automático no cadastro |
| Mensal | 30 | R$ 9,90 |
| Trimestral | 90 | R$ 24,90 |
| Anual | 365 | R$ 79,90, destacado como "Mais vantajoso" |

Os preços ficam no Supabase e são editados no painel. Liberar dias soma à validade atual se ela ainda não venceu; se venceu, conta a partir de agora.

## Cadastro

- Novo campo **Nome** (obrigatório, até 80 caracteres) acima do e-mail na aba "Criar conta".
- O nome vai nos metadados do cadastro e é copiado para o perfil.
- A tela Hoje cumprimenta pelo primeiro nome ("Boa noite, Maria!").

## Acesso no app

- Ao entrar, ao abrir o app e ao voltar ao primeiro plano, o app lê o próprio perfil (`role`, `access_until`, `unlimited`, `name`) e guarda uma cópia local.
- Tem acesso: `unlimited` ou `access_until` no futuro. Administradores têm acesso sempre.
- Sem internet, vale a última cópia local. Sem cópia local e sem internet, mostra erro de conexão (a primeira abertura já exige internet).
- Sem acesso: a rota única é a tela de renovação (`/renovar`), além de `legal/*`. Os lembretes são cancelados.
- Tela de renovação: título "Seu plano acabou" (ou "Seu teste grátis acabou"), os três planos com o anual destacado, botão "Renovar pelo WhatsApp" que abre `https://wa.me/5537999216351?text=` com a mensagem "Olá! Sou {nome} ({e-mail}) e quero renovar meu Habitus no plano {plano}.", link "Já paguei, atualizar" (relê o perfil) e "Sair". Mesmo visual escuro da tela de conta (fundo Horizonte, cobalto).
- No teste grátis, a tela Hoje mostra um aviso discreto quando faltam 3 dias ou menos: "Faltam N dias do seu teste grátis", com link para a tela de planos.
- A sincronização só grava no servidor com acesso ativo (regra no banco). Os dados locais continuam no aparelho.

## Painel `/admin`

Decidido com o usuário por mockups (`.superpowers/brainstorm/*/content/admin-layout.html` e `admin-account-menu.html`).

- **Onde:** uma quinta aba "Admin" na barra de baixo, visível só para administradores (celular e computador). O endereço `/admin` abre a mesma aba; quem não é administrador volta para o app.
- **Topo (computador/tablet):** marca "Habitus Admin", seções "Usuários" e "Planos e preços" e, à direita, iniciais, nome completo e e-mail completo do administrador. Um clique abre um menu: cabeçalho com nome, e-mail e etiqueta "Administrador"; "Voltar para o app"; "Meu perfil"; "Planos e preços"; "Termos e Privacidade"; separador; "Sair" em vermelho por último. No celular não há esse topo: a saída continua em Ajustes.
- **Usuários (tela principal):**
  - números no topo: contas, com plano ativo, em teste grátis, vencidos;
  - campo de busca já focado ao abrir, filtrando por nome ou e-mail enquanto digita (sem diferenciar maiúsculas e acentos);
  - filtros rápidos: Todos, Ativos, Teste, Vencidos, Admins;
  - cada linha: nome, e-mail, status (Ativo, Teste · N dias, Vencido, Ilimitado, etiqueta Admin) e validade;
  - ações na linha: +30, +90, +365 dias, ∞ (ilimitado) e ⋯; cada liberação mostra "Maria Silva liberada até DD/MM/AAAA" com "Desfazer" (volta ao valor anterior);
  - botão "Criar usuário".
- **Ficha (⋯):** editar nome e e-mail; "Adicionar N dias" (qualquer número ≥ 1); "Válido até" com calendário; ilimitado liga/desliga; "Remover acesso" (vence agora); cargo Administrador ou Usuário comum; "Gerar nova senha provisória"; "Excluir conta" com confirmação dupla; data de criação da conta.
- **Criar usuário:** nome e e-mail; o servidor gera uma senha provisória, a conta já nasce confirmada e com 7 dias de teste; a senha aparece uma única vez com "Copiar" e "Enviar pelo WhatsApp" (sem número fixo, o administrador escolhe o contato).
- **Planos e preços:** editar nome, dias, preço e destaque de cada plano; ativar ou ocultar um plano.
- **Proteções:** o administrador não pode tirar o próprio cargo nem excluir a própria conta pelo painel.

## Arquitetura (decidida por Claude)

- `public.profiles`: `id` (= `auth.users.id`, cascata), `name`, `email` (cópia para busca), `role` (`user` | `admin`), `access_until timestamptz`, `unlimited boolean`, `created_at`.
- Gatilho no cadastro (`auth.users` insert) cria o perfil com o nome dos metadados e `access_until = now() + 7 dias`. A migração cria perfis para contas que já existem, com 7 dias a partir da migração.
- RLS: cada pessoa lê só o próprio perfil; administradores leem todos. Ninguém altera `profiles` direto: as mudanças passam por funções SQL `security definer` que checam `is_admin()` (liberar dias, definir data, ilimitado, cargo, nome, excluir), e a pessoa comum só pode mudar o próprio nome.
- `public.plans`: `id`, `name`, `days`, `price_cents`, `highlight`, `active`, `sort`. Leitura por qualquer conta logada; escrita só por administradores.
- O que exige a API de administração do Supabase (criar usuário com senha, trocar e-mail, gerar nova senha) roda numa Edge Function `admin-users`, que confere se quem chama é administrador antes de agir. A chave `service_role` só existe dentro do Supabase.
- `user_data`: as regras de inserir e alterar passam a exigir acesso ativo.
- O primeiro administrador é promovido por um comando SQL no guia de configuração (com o e-mail do dono).

## Restrições do projeto

- As mesmas da entrega anterior (camadas, 350 linhas, `npx expo install`, `npm run check`, português, sem afirmações de saúde).
- Regras de acesso (tem acesso? quantos dias faltam? somar dias, status da linha, busca sem acento) são funções puras em `src/domain` com teste.
- Guia em `docs/` para: rodar o SQL novo, publicar a Edge Function (pelo painel do Supabase ou pela CLI) e virar administrador.

## Decisões de Claude (o usuário pode mudar)

- Administradores têm acesso sempre.
- Sem internet, vale a última validade conhecida.
- Aviso de teste grátis a partir de 3 dias antes.
- Lembretes cancelados com o acesso vencido.
- Senha provisória gerada pelo servidor ao criar usuário.
- Liberar dias soma à validade se ainda não venceu.
- 5 abas no celular; "Conquistas" pode ser encurtado se não couber.
- O relógio do aparelho decide o vencimento no app; o banco usa o relógio do servidor para gravar no `user_data`.

## Fica com quem constrói

- Estrutura de arquivos e componentes; detalhes visuais seguindo os mockups e o estilo cobalto.
- Paginação/limite da lista (até alguns milhares de contas cabe numa busca no servidor por texto).
- Textos de erro e de confirmação.

## Respostas da revisão (decisões de Claude)

- **Lojas:** esta entrega vale para o PWA (principal) e o build nativo de desenvolvimento. Publicar na App Store/Play Store está em espera; antes disso, a tela de renovação precisará esconder preços e WhatsApp nas lojas (regras de pagamento da Apple e do Google). A tela de renovação ganha "Excluir conta" para quem está bloqueado.
- **Teste x plano pago:** `profiles.plan` (`trial` | `paid`). O cadastro grava `trial`; qualquer liberação pelo administrador (dias, data, ilimitado) grava `paid`; "Remover acesso" mantém o valor. "Desfazer" restaura `access_until`, `unlimited` e `plan` anteriores. Status: Admin/Ilimitado > Vencido > Teste · N dias (`trial`) > Ativo (`paid`).
- **Contas sem nome:** a saudação e a mensagem do WhatsApp usam a parte do e-mail antes do `@` quando o nome está vazio. Ajustes > Conta ganha o campo "Nome" (função `update_my_name`).
- **"Meu perfil":** abre Ajustes > Conta.
- **Trocar e-mail pelo painel:** vale na hora (a Edge Function marca o novo e-mail como confirmado) e atualiza `profiles.email`.
- **Lembretes:** só são agendados até a validade guardada no aparelho; depois de renovar, voltam na próxima abertura.
- **"Válido até":** fim daquele dia no horário de São Paulo.
- **Teste grátis:** 7 dias fixos no gatilho do cadastro, fora da tabela `plans`.
