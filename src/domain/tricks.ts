export type TrickIndex = 0 | 1 | 2 | 3 | 4;
export type TrickKind = "simple" | "timer" | "affirmations" | "gratitude";

export interface Trick {
  index: TrickIndex;
  title: string;
  /** One-line summary shown in lists. */
  summary: string;
  /** Full instruction shown on the trick screen. */
  instruction: string;
  /** Notification body; the title is built by {@link notificationTitle}. */
  notificationBody: string;
  kind: TrickKind;
  /** Only for timer tricks. */
  durationSeconds?: number;
  symbol: { ios: string; android: string };
}

export const TRICKS: readonly Trick[] = [
  {
    index: 0,
    title: "Sorria",
    summary: "Sorria por alguns segundos.",
    instruction:
      "Sorria por alguns segundos, mesmo sem vontade. Relaxe os ombros, solte o rosto e deixe o sorriso aparecer.",
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
    notificationBody: "Vá até um espelho e diga suas metas em voz alta.",
    kind: "affirmations",
    symbol: { ios: "quote.bubble", android: "record_voice_over" },
  },
  {
    index: 3,
    title: "Foco total",
    summary: "Olhe fixamente para um objeto por 2 minutos.",
    instruction:
      "Escolha um objeto e concentre-se totalmente nele. Quando a mente se distrair, volte com gentileza ao objeto.",
    notificationBody: "Escolha um objeto e foque nele por 2 minutos.",
    kind: "timer",
    durationSeconds: 120,
    symbol: { ios: "scope", android: "center_focus_strong" },
  },
  {
    index: 4,
    title: "Gratidão antecipada",
    summary: "Agradeça pelo que ainda está por vir.",
    instruction:
      "Agradeça pelo que você ainda não tem, como se já estivesse aqui. Escreva uma frase curta, se quiser.",
    notificationBody: "Agradeça por algo que ainda está a caminho.",
    kind: "gratitude",
    symbol: { ios: "heart.text.square", android: "volunteer_activism" },
  },
];

export const TRICK_COUNT = TRICKS.length;

export const DEFAULT_AFFIRMATIONS: readonly string[] = [
  "Sou bem-sucedido.",
  "Sou saudável.",
  "Sou abundante.",
];

export function isTrickIndex(value: unknown): value is TrickIndex {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < TRICK_COUNT;
}

export function notificationTitle(trick: Trick): string {
  return `Hora do truque ${trick.index + 1}: ${trick.title}`;
}
