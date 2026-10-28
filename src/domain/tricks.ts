export type TrickIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type TrickKind = "simple" | "timer" | "affirmations" | "gratitude" | "phrase";

export interface Trick {
  index: TrickIndex;
  title: string;
  /** One-line summary shown in lists. */
  summary: string;
  /** Full instruction shown on the trick screen. */
  instruction: string;
  /** "A ideia por trás": the idea behind the tip, told as an idea, never as a proven effect (AGENTS.md). */
  why?: string;
  /** Notification body; the title is built by {@link notificationTitle}. */
  notificationBody: string;
  kind: TrickKind;
  /** Only for timer tricks. */
  durationSeconds?: number;
  /** Only for phrase tricks: the words to say. */
  phrase?: string;
  symbol: { ios: string; android: string };
}

export const TRICKS: readonly Trick[] = [
  {
    index: 0,
    title: "Sorria",
    summary: "Sorria por alguns segundos.",
    instruction:
      "Sorria por alguns segundos, mesmo sem vontade. Relaxe os ombros, solte o rosto e deixe o sorriso aparecer.",
    why: "Seu cérebro lê o sorriso como sinal de que está tudo bem e entra no clima, mesmo que você tenha começado sem vontade.",
    notificationBody: "Pare um instante e sorria por alguns segundos.",
    kind: "simple",
    symbol: { ios: "face.smiling", android: "sentiment_satisfied" },
  },
  {
    index: 1,
    title: "Postura de poder",
    summary: "Fique em pé, firme, por 2 minutos.",
    instruction:
      "Fique em pé, firme, abra o peito e respire profundamente. Mantenha a postura até o fim do timer.",
    why: "O corpo ensina a mente. Em 120 segundos de postura aberta e respiração funda, você troca a tensão pela sensação de força.",
    notificationBody: "Levante-se e abra o peito por 2 minutos.",
    kind: "timer",
    durationSeconds: 120,
    symbol: { ios: "figure.stand", android: "accessibility_new" },
  },
  {
    index: 2,
    title: "Metas em voz alta",
    summary: "Diga suas metas no presente.",
    instruction:
      "Na frente do espelho, diga suas metas em voz alta, no presente, como se já fossem reais.",
    why: "Dita no presente (“sou saudável, sou abundante”), a meta soa como uma ordem para o cérebro, que passa a buscar caminhos para cumpri-la.",
    notificationBody: "Vá até um espelho e diga suas metas em voz alta.",
    kind: "affirmations",
    symbol: { ios: "quote.bubble", android: "record_voice_over" },
  },
  {
    index: 3,
    title: "Foco total",
    summary: "Olhe para a fogueira por 2 minutos.",
    instruction:
      "Fixe o olhar na fogueira e acompanhe as chamas. Quando a mente se distrair, volte com gentileza para o fogo. No fim, sopre para apagar.",
    why: "Fixar o olhar em um só ponto acalma o ruído da mente e coloca você em modo de concentração, quase sem perceber.",
    notificationBody: "Acenda a fogueira e foque nela por 2 minutos.",
    kind: "timer",
    durationSeconds: 120,
    symbol: { ios: "scope", android: "center_focus_strong" },
  },
  {
    index: 4,
    title: "Gratidão antecipada",
    summary: "Agradeça pelo que ainda está por vir.",
    instruction:
      "Agradeça pelo que você ainda não tem, como se já estivesse aqui. Escreva uma frase curta: ela vira uma estrela no seu céu.",
    why: "Agradecer pelo que está por vir, como se já estivesse aqui, cria uma ordem interna que muda suas decisões, seu comportamento e seu destino.",
    notificationBody: "Agradeça por algo que ainda está a caminho.",
    kind: "gratitude",
    symbol: { ios: "heart.text.square", android: "volunteer_activism" },
  },
  {
    index: 5,
    title: "Antes de dormir",
    summary: "Peça um amanhã que surpreenda.",
    instruction: "Já deitado, antes de dormir, diga com calma a frase abaixo.",
    notificationBody: "Antes de dormir, diga: Deus, universo, vida, me surpreenda positivamente amanhã.",
    kind: "phrase",
    phrase: "Deus, universo, vida: me surpreenda positivamente amanhã.",
    symbol: { ios: "moon.stars.fill", android: "bedtime" },
  },
];

export const TRICK_COUNT = TRICKS.length;
/** The first five are spread over the day window; the last one fires at bedtime. */
export const DAY_TRICK_COUNT = 5;
export const BEDTIME_TRICK: TrickIndex = 5;

export const DEFAULT_AFFIRMATIONS: readonly string[] = [
  "Sou bem-sucedido.",
  "Sou saudável.",
  "Sou abundante.",
];

export function isTrickIndex(value: unknown): value is TrickIndex {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < TRICK_COUNT;
}

export function notificationTitle(trick: Trick): string {
  return `Hora da dica ${trick.index + 1}: ${trick.title}`;
}
