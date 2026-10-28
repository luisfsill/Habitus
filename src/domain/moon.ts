/**
 * The moon of Antes de dormir: every night the tip is done fills it one step, and 8 nights make a full moon. Then a
 * new cycle starts from a thin crescent. Like the gratitude sky it only grows: a skipped night just does not add.
 * The phrase lights up word by word while the person speaks (or holds the moon), at the pace of calm speech.
 */

import { BEDTIME_TRICK } from "./tricks";

/** Nights from a thin crescent to the full moon. */
export const MOON_NIGHTS = 8;

export interface Moon {
  /** Nights the bedtime tip was done, ever. */
  nights: number;
  /** Cycle the last night belongs to (1 for the first, also before any night). */
  cycle: number;
  /** Nights into that cycle: 0 before the first night, MOON_NIGHTS on a full moon. */
  phase: number;
  /** Full moons completed. */
  fullMoons: number;
}

/** The moon from the completions (keyed by night for the bedtime tip, see bedtime.ts). */
export function moonOf(completions: Readonly<Record<string, readonly number[]>>): Moon {
  const nights = Object.values(completions).filter((done) => done.includes(BEDTIME_TRICK)).length;
  if (nights === 0) return { nights, cycle: 1, phase: 0, fullMoons: 0 };
  return { nights, cycle: Math.ceil(nights / MOON_NIGHTS), phase: ((nights - 1) % MOON_NIGHTS) + 1, fullMoons: Math.floor(nights / MOON_NIGHTS) };
}

/** The moon after one more night: what tonight's phrase fills it to. */
export function nextNight(moon: Moon): Moon {
  const nights = moon.nights + 1;
  return { nights, cycle: Math.ceil(nights / MOON_NIGHTS), phase: ((nights - 1) % MOON_NIGHTS) + 1, fullMoons: Math.floor(nights / MOON_NIGHTS) };
}

/** Lit part of the disc (0 new … 1 full) for a phase. */
export function litFraction(phase: number): number {
  return phase / MOON_NIGHTS;
}

/** The moon tonight's phrase starts from: after a full moon, the dark start of the next cycle. */
export function beforeTonight(moon: Moon): Moon {
  return moon.phase === MOON_NIGHTS ? { ...moon, cycle: moon.cycle + 1, phase: 0 } : moon;
}

/** "Lua 2 · noite 5 de 8", or the full moon line. */
export function moonLine(moon: Moon): string {
  if (moon.phase === MOON_NIGHTS) return moon.fullMoons === 1 ? "Lua cheia! Sua primeira lua completa." : `Lua cheia! Você completou ${moon.fullMoons} luas.`;
  if (moon.phase === 0) return `Lua ${moon.cycle} · ${MOON_NIGHTS} noites até a lua cheia`;
  return `Lua ${moon.cycle} · noite ${moon.phase} de ${MOON_NIGHTS}`;
}

// Calm speech: a base per word, more for longer words, and a breath after a comma or colon.
const WORD_MS = 160;
const LETTER_MS = 45;
const PAUSE_MS = 220;

/** Each word of the phrase and how much speaking time (ms) lights it up, counted from the start. */
export function wordTimeline(phrase: string): { word: string; endMs: number }[] {
  let t = 0;
  return phrase
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const letters = word.replace(/[^\p{L}]/gu, "").length;
      t += WORD_MS + LETTER_MS * letters + (/[,:;]$/.test(word) ? PAUSE_MS : 0);
      return { word, endMs: t };
    });
}

/** How many words are lit after `ms` of speaking. */
export function litWords(timeline: readonly { endMs: number }[], ms: number): number {
  return timeline.filter((w) => w.endMs <= ms).length;
}

/** Microphone level (0…1) from which it counts as speaking. */
export const VOICE_LEVEL = 0.08;
/** A gap between syllables shorter than this still counts as speaking (ms). */
export const VOICE_HANG_MS = 300;

export interface Speech {
  /** Speaking (or holding) time so far, in ms. */
  ms: number;
  /** Last moment with voice, or -Infinity. */
  voiceAt: number;
  /** Previous step, or null before the first. */
  at: number | null;
}

export const initialSpeech: Speech = { ms: 0, voiceAt: -Infinity, at: null };

/**
 * One step of the phrase lighting up, at time `now` (ms). Time adds up while there is voice (with a short hang over
 * the gaps between syllables) or the moon is held; silence only pauses it, it never goes back.
 */
export function speechStep(state: Speech, now: number, level: number, holding: boolean): Speech {
  const voiceAt = level >= VOICE_LEVEL ? now : state.voiceAt;
  const active = holding || now - voiceAt <= VOICE_HANG_MS;
  // Steps arrive ~30 times a second; a long gap (a tab in the background) adds no more than one step's worth.
  const dt = state.at === null ? 0 : Math.min(now - state.at, 100);
  return { ms: active ? state.ms + dt : state.ms, voiceAt, at: now };
}
