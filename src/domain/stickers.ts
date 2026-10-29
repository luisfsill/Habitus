import type { Message } from "./chat";

export interface Sticker { id: string; label: string }

/** The animated stickers the picker offers: each dances big once, then stays small in the chat. */
export const STICKERS: readonly Sticker[] = [
  { id: "lingua", label: "Língua de fora" },
  { id: "festa", label: "Festa" },
  { id: "apaixonado", label: "Apaixonado" },
  { id: "beijo", label: "Beijo" },
  { id: "chorando", label: "Chorando" },
  { id: "coco", label: "Cocô" },
  { id: "fantasma", label: "Fantasma" },
  { id: "dormindo", label: "Dormindo" },
  { id: "palmas", label: "Palmas" },
  { id: "tchau", label: "Tchau" },
  { id: "explosao", label: "Explosão" },
  { id: "gota", label: "Gota d'água" },
];

/** The drawn stickers of earlier versions: no longer offered, but older messages still show them. */
export const RETIRED_STICKERS: readonly Sticker[] = [
  { id: "feliz", label: "Feliz" },
  { id: "rindo", label: "Rindo" },
  { id: "piscadinha", label: "Piscadinha" },
  { id: "triste", label: "Triste" },
  { id: "bravo", label: "Bravo" },
  { id: "surpreso", label: "Surpreso" },
  { id: "legal-oculos", label: "Legal, de óculos" },
  { id: "pensando", label: "Pensando" },
  { id: "sono", label: "Com sono" },
  { id: "abraco", label: "Abraço" },
  { id: "joinha", label: "Joinha" },
  { id: "coracao", label: "Coração" },
  { id: "flor", label: "Flor" },
  { id: "bebe-agua", label: "Bebe água!" },
  { id: "cade-sequencia", label: "Cadê sua sequência?" },
  { id: "bora-meditar", label: "Bora meditar?" },
  { id: "hora-de-dormir", label: "Hora de dormir" },
  { id: "mandou-bem", label: "Mandou bem!" },
  { id: "respira-fundo", label: "Respira fundo" },
];

export function stickerLabel(id: string): string {
  return [...STICKERS, ...RETIRED_STICKERS].find((s) => s.id === id)?.label ?? "Figurinha";
}

/**
 * The sticker message to dance now: the newest animated one (sent or received) after `seenAt`, the time
 * of the last one already danced in this chat. `seenAt` null means nothing was danced yet, so the history
 * never dances.
 */
export function stickerToDance(messages: readonly Message[], seenAt: string | null): Message | null {
  if (seenAt === null) return null;
  const after = new Date(seenAt).getTime();
  let newest: Message | null = null;
  for (const m of messages) {
    if (m.kind !== "sticker" || !STICKERS.some((s) => s.id === m.body)) continue;
    const t = new Date(m.createdAt).getTime();
    if (t > after && (!newest || t > new Date(newest.createdAt).getTime())) newest = m;
  }
  return newest;
}
