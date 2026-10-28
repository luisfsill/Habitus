/**
 * Ideas for the Gratidão antecipada phrase, by area of life: tapping them builds the phrase ("Obrigado porque já
 * acordo com energia, tenho as contas em dia e moro na casa que sonhei."). Written in the present, as if already
 * true, and without words that change with gender, so they fit anyone.
 */

import { MAX_TEXT_LENGTH } from "./app-data";

export interface GratitudeArea {
  name: string;
  symbol: { ios: string; android: string };
  ideas: readonly string[];
}

/** How many ideas one phrase can take. */
export const MAX_PARTS = 5;
export const PHRASE_START = "Obrigado porque já";

export const GRATITUDE_AREAS: readonly GratitudeArea[] = [
  {
    name: "Saúde",
    symbol: { ios: "figure.run", android: "directions_run" },
    ideas: ["acordo com energia", "durmo bem todas as noites", "meu corpo está forte", "cuido bem de mim", "me movimento com prazer", "me sinto leve"],
  },
  {
    name: "Família",
    symbol: { ios: "figure.2.and.child.holdinghands", android: "family_restroom" },
    ideas: ["minha família está unida", "tenho tempo com quem amo", "meus pais estão bem", "vejo meus filhos felizes", "a paz mora na minha casa", "celebramos juntos"],
  },
  {
    name: "Amor",
    symbol: { ios: "heart.fill", android: "favorite" },
    ideas: ["vivo um amor leve", "recebo amor do jeito que sou", "tenho alguém para dividir a vida", "meu relacionamento é parceria", "me trato com carinho", "o afeto é diário"],
  },
  {
    name: "Trabalho",
    symbol: { ios: "briefcase.fill", android: "work" },
    ideas: ["faço o que amo", "meu trabalho é reconhecido", "conquistei a vaga que eu queria", "meu negócio cresce", "tenho clientes que me valorizam", "trabalho com propósito"],
  },
  {
    name: "Dinheiro",
    symbol: { ios: "banknote.fill", android: "payments" },
    ideas: ["tenho as contas em dia", "ganho bem pelo que faço", "tenho uma reserva tranquila", "vivo livre de dívidas", "posso ajudar quem eu amo", "o dinheiro chega com facilidade"],
  },
  {
    name: "Casa",
    symbol: { ios: "house.fill", android: "house" },
    ideas: ["moro na casa que sonhei", "meu lar é aconchegante", "tenho meu cantinho do meu jeito", "conquistei meu carro", "moro onde quero", "minha casa recebe bem os amigos"],
  },
  {
    name: "Paz",
    symbol: { ios: "leaf.fill", android: "spa" },
    ideas: ["tenho calma nos dias difíceis", "minha mente está tranquila", "confio no meu caminho", "tenho tempo para mim", "vivo um dia de cada vez", "acordo em paz"],
  },
  {
    name: "Viagens",
    symbol: { ios: "airplane", android: "flight" },
    ideas: ["conheci o lugar dos meus sonhos", "viajo com quem amo", "tenho histórias para contar", "vi o mar de pertinho", "conheço outro país", "faço uma viagem por ano"],
  },
];

/** The phrase from the chosen ideas, in order: "a", "a e b", "a, b e c". Empty with none. */
export function gratitudePhrase(parts: readonly string[]): string {
  if (parts.length === 0) return "";
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
  return `${PHRASE_START} ${list}.`;
}

/** Adds or removes an idea. Adding is refused (same list back) past MAX_PARTS or the saved text's length limit. */
export function toggleIdea(parts: readonly string[], idea: string): readonly string[] {
  if (parts.includes(idea)) return parts.filter((p) => p !== idea);
  const next = [...parts, idea];
  return next.length > MAX_PARTS || gratitudePhrase(next).length > MAX_TEXT_LENGTH ? parts : next;
}
