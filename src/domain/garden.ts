/**
 * Sorria: a few seconds of smiling make the sun rise, and every day smiled plants a flower in the person's meadow;
 * each 7 flowers a new species starts. Counted from the completions, so nothing new is stored.
 */

import type { Completions } from "./history";

export const SMILE_TRICK = 0;
/** Smiling time that brings the sun all the way up (ms): "alguns segundos". */
export const SMILE_MS = 8000;
/** Smile score (0…1, from the camera) from which it counts as smiling. */
export const SMILE_SCORE = 0.45;
/** A flicker of the smile shorter than this still counts (ms). */
export const SMILE_HANG_MS = 250;
export const FLOWERS_PER_SPECIES = 7;
export const SPECIES = [
  { name: "Margarida", petals: "#FFFFFF", heart: "#F5C431" },
  { name: "Girassol", petals: "#F7B500", heart: "#6B3E12" },
  { name: "Lavanda", petals: "#A78BDA", heart: "#6E54A8" },
  { name: "Rosa", petals: "#F2668B", heart: "#B23A5C" },
  { name: "Tulipa", petals: "#FF8A3D", heart: "#D9541E" },
  { name: "Ipê", petals: "#F9D648", heart: "#E0A100" },
] as const;

/** Days smiled. */
export function flowersOf(completions: Completions): number {
  return Object.values(completions).filter((done) => done.includes(SMILE_TRICK)).length;
}

/** Species of the `i`-th flower (0-based); after the last species they come round again. */
export function speciesOf(i: number) {
  return SPECIES[Math.floor(i / FLOWERS_PER_SPECIES) % SPECIES.length];
}

/** "5 flores · Girassol em 2 dias", or the new species today's flower started. */
export function gardenLine(flowers: number, justPlanted: boolean): string {
  if (flowers === 0) return `Sua campina está esperando a primeira flor`;
  if (justPlanted && flowers % FLOWERS_PER_SPECIES === 1 && flowers > 1) return `Nova espécie na campina: ${speciesOf(flowers - 1).name}!`;
  // The next species starts with the flower at the next multiple of FLOWERS_PER_SPECIES (0-based).
  const next = Math.ceil(flowers / FLOWERS_PER_SPECIES) * FLOWERS_PER_SPECIES;
  const left = next - flowers + 1;
  const count = flowers === 1 ? "1 flor" : `${flowers} flores`;
  return `${count} · ${speciesOf(next).name} em ${left} ${left === 1 ? "dia" : "dias"}`;
}

export interface Smile {
  /** Smiling (or holding) time so far, in ms. */
  ms: number;
  /** Last moment with a smile, or -Infinity. */
  smiledAt: number;
  /** Previous step, or null before the first. */
  at: number | null;
}

export const initialSmile: Smile = { ms: 0, smiledAt: -Infinity, at: null };

/** One step at `now` (ms) with the camera's smile `score` (0 without one): time adds while smiling or holding. */
export function smileStep(state: Smile, now: number, score: number, holding: boolean): Smile {
  const smiledAt = score >= SMILE_SCORE ? now : state.smiledAt;
  const active = holding || now - smiledAt <= SMILE_HANG_MS;
  // Steps arrive ~10 times a second; a long gap (a tab in the background) adds no more than one step's worth.
  const dt = state.at === null ? 0 : Math.min(now - state.at, 250);
  return { ms: active ? state.ms + dt : state.ms, smiledAt, at: now };
}
