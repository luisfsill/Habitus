export interface Sticker { id: string; label: string }

export const STICKERS: readonly Sticker[] = [
  { id: "feliz", label: "Feliz" },
  { id: "rindo", label: "Rindo" },
  { id: "piscadinha", label: "Piscadinha" },
  { id: "triste", label: "Triste" },
  { id: "chorando", label: "Chorando" },
  { id: "bravo", label: "Bravo" },
  { id: "surpreso", label: "Surpreso" },
  { id: "apaixonado", label: "Apaixonado" },
  { id: "legal-oculos", label: "Legal, de óculos" },
  { id: "pensando", label: "Pensando" },
  { id: "sono", label: "Com sono" },
  { id: "beijo", label: "Beijo" },
  { id: "abraco", label: "Abraço" },
  { id: "joinha", label: "Joinha" },
  { id: "palmas", label: "Palmas" },
  { id: "festa", label: "Festa" },
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
  return STICKERS.find((s) => s.id === id)?.label ?? "Figurinha";
}
