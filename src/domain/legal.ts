import { TERMS_VERSION } from "./auth-rules";

// shortcut: placeholders until the owner provides them; replace before charging anyone.
export const LEGAL_OWNER = "[nome ou razão social e CNPJ do responsável]";
export const LEGAL_CONTACT = "[e-mail de contato]";

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  version: string;
  sections: LegalSection[];
}

export const TERMS: LegalDocument = {
  title: "Termos de uso",
  version: TERMS_VERSION,
  sections: [
    {
      title: "1. O que é o Habitus",
      paragraphs: [
        `O Habitus é um aplicativo que lembra você de praticar pequenos hábitos de bem-estar ao longo do dia. Ele é oferecido por ${LEGAL_OWNER}.`,
        "Ao criar uma conta, você concorda com estes termos. Se não concordar, não use o app.",
      ],
    },
    {
      title: "2. Sua conta",
      paragraphs: [
        "Você precisa de um e-mail válido e de uma senha para usar o Habitus. Mantenha sua senha em segredo: você responde pelo que for feito com a sua conta.",
        "Você pode excluir sua conta a qualquer momento em Ajustes > Conta.",
      ],
    },
    {
      title: "3. Uso permitido",
      paragraphs: [
        "Use o Habitus apenas para fins pessoais e de forma legal. Não tente acessar contas de outras pessoas, sobrecarregar o serviço ou copiar o app.",
      ],
    },
    {
      title: "4. Amigos e @usuário",
      paragraphs: [
        "Para usar o Habitus você escolhe um @ único. Não use um @ que se passe pela equipe do Habitus ou por outra pessoa. A equipe pode trocar um @ impróprio ou enganoso.",
        "Pedidos de amizade são pessoais: não envie pedidos em excesso nem para quem não quer receber. Você pode desfazer uma amizade ou bloquear alguém quando quiser.",
      ],
    },
    {
      title: "5. Conteúdo e saúde",
      paragraphs: [
        "As práticas sugeridas são hábitos simples do dia a dia. O Habitus não oferece orientação médica, psicológica ou de qualquer profissional de saúde e não substitui esse acompanhamento.",
        "Se alguma prática causar desconforto, pare e, se precisar, procure um profissional.",
      ],
    },
    {
      title: "6. Disponibilidade",
      paragraphs: [
        "Fazemos o possível para o app funcionar sempre, mas ele pode ficar fora do ar ou mudar. Lembretes dependem das permissões e das configurações do seu aparelho.",
      ],
    },
    {
      title: "7. Planos pagos",
      paragraphs: [
        "Hoje o Habitus é gratuito. Se no futuro houver recursos pagos, preço e condições serão mostrados antes de qualquer cobrança, e nada será cobrado sem a sua confirmação.",
      ],
    },
    {
      title: "8. Mudanças nestes termos",
      paragraphs: ["Se estes termos mudarem, avisaremos no app. Continuar usando o Habitus depois do aviso significa aceitar a nova versão."],
    },
    {
      title: "9. Contato",
      paragraphs: [`Dúvidas: ${LEGAL_CONTACT}. Estes termos seguem as leis do Brasil.`],
    },
  ],
};

export const PRIVACY: LegalDocument = {
  title: "Política de privacidade",
  version: TERMS_VERSION,
  sections: [
    {
      title: "1. Quem cuida dos seus dados",
      paragraphs: [`O responsável pelos seus dados é ${LEGAL_OWNER}. Contato para assuntos de privacidade: ${LEGAL_CONTACT}.`],
    },
    {
      title: "2. Quais dados guardamos",
      paragraphs: [
        "Seu e-mail e sua senha (guardada de forma protegida; nem nós conseguimos lê-la).",
        "Seu nome e seu @usuário, e, para o ranking, o seu XP da semana, nível, faixa, sequência de dias e conquistas.",
        "O que você registra no app: horários de início e fim do dia, dias da semana, horário de dormir, afirmações, frases de gratidão, dicas feitas e os horários em que você fez a dica antes de dormir.",
        "A data e a versão destes documentos quando você os aceitou.",
      ],
    },
    {
      title: "3. Para que usamos",
      paragraphs: [
        "Só para o app funcionar: entrar na sua conta, lembrar você nos horários certos e guardar seu progresso para que ele apareça em qualquer aparelho.",
        "Não vendemos seus dados, não mostramos anúncios e não os usamos para outra finalidade.",
      ],
    },
    {
      title: "4. Onde ficam",
      paragraphs: [
        "No seu aparelho e no Supabase, o serviço que hospeda as contas do Habitus. O acesso é protegido: cada conta só enxerga os próprios dados. Os servidores podem ficar fora do Brasil.",
        "Os lembretes são agendados no próprio aparelho.",
      ],
    },
    {
      title: "5. Amigos: o que outras pessoas veem",
      paragraphs: [
        "Qualquer pessoa com conta e plano ativo que encontrar você na busca vê seu nome, seu @, sua faixa e seu nível. Só os seus amigos veem também sua sequência de dias e suas conquistas, e o seu XP da semana no ranking entre amigos. Seu e-mail nunca aparece para ninguém.",
        "O XP da semana é calculado e publicado pelo próprio app, a partir do seu histórico.",
        "Para sair da busca, desligue \"Aparecer na busca\" em Ajustes > Conta. Nesse caso ninguém acha você e você também não pode buscar ninguém; amizades que já existem continuam.",
        "Quem você bloqueia não consegue achar você, ver seu perfil nem pedir amizade. A equipe do Habitus não aparece na busca de usuários comuns.",
        "Se o seu plano vencer, você sai da busca e do ranking até renovar; suas amizades ficam guardadas.",
        "Quando alguém pede amizade ou aceita o seu pedido, avisamos por notificação Web Push, se você ativou os lembretes no navegador.",
      ],
    },
    {
      title: "6. Por quanto tempo",
      paragraphs: ["Enquanto sua conta existir. Ao excluir a conta, apagamos seus dados da nuvem; os do aparelho são apagados ao sair."],
    },
    {
      title: "7. Seus direitos (LGPD)",
      paragraphs: [
        "Você pode ver e corrigir seus dados no próprio app, excluir a conta em Ajustes > Conta e pedir informações ou uma cópia dos seus dados pelo contato acima.",
      ],
    },
    {
      title: "8. Mudanças",
      paragraphs: ["Se esta política mudar, avisaremos no app antes de a mudança valer."],
    },
  ],
};
