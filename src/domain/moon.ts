/**
 * The moon of Antes de dormir: every night the tip is done fills it one step, and 8 nights make a full moon. Then a
 * new cycle starts from a thin crescent. Like the gratitude sky it only grows: a skipped night just does not add.
 * The phrase lights up word by word: each word as the person says it (checked against the recognized text), or one
 * every few seconds while they hold the moon.
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

// Holding the moon lights one word at a time, slower than speech: time to read it and dwell on it. Short words
// ("Deus", "vida", "me") take HOLD_SHORT_MS, longer ones HOLD_LONG_MS.
export const HOLD_SHORT_MS = 1500;
export const HOLD_LONG_MS = 2000;
export const SHORT_WORD_LETTERS = 4;

/** How long holding takes to light `word` (ms). */
export function holdWordMs(word: string): number {
  return normalizeWord(word).length <= SHORT_WORD_LETTERS ? HOLD_SHORT_MS : HOLD_LONG_MS;
}

/** How fast holding advances the speaking time at `ms`, so the word being lit takes {@link holdWordMs}. */
export function holdRate(timeline: readonly { word: string; endMs: number }[], ms: number): number {
  const i = Math.min(litWords(timeline, ms), timeline.length - 1);
  if (i < 0) return 0;
  return (timeline[i].endMs - (i ? timeline[i - 1].endMs : 0)) / holdWordMs(timeline[i].word);
}

/** A word as it is compared: lower case, no accents or punctuation ("Amanhã." → "amanha"). */
export function normalizeWord(word: string): string {
  return word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/** Letters that may differ between the spoken and the expected word: the recognizer slips on long words. */
function slack(word: string): number {
  if (word.length >= 10) return 2;
  return word.length >= 5 ? 1 : 0;
}

/** Edit distance between two short words; past `max` length difference it only says "too far". */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

/** The heard word is the expected one, allowing a small slip on long words. */
export function sameWord(heard: string, expected: string): boolean {
  const h = normalizeWord(heard);
  const e = normalizeWord(expected);
  return h.length > 0 && distance(h, e, slack(e)) <= slack(e);
}

/**
 * How many words of the phrase were said, in order, in everything heard so far (`transcript`, the recognizer's
 * text): each heard word lights the next one only if it is that word; any other word ("azul" instead of "vida")
 * is skipped without lighting anything. One word the recognizer missed (a short word said softly, "sou" heard as
 * "só") does not block the rest: the word after it, once heard, lights both.
 */
export function spokenWords(timeline: readonly { word: string }[], transcript: string): number {
  const heard = transcript.split(/\s+/).filter(Boolean);
  // Heard words used up if heard[i] is `expected`: 1, 2 for a hyphenated word said in two ("bem sucedido"), or 0.
  const match = (i: number, expected: string) => {
    if (sameWord(heard[i], expected)) return 1;
    return i + 1 < heard.length && sameWord(heard[i] + heard[i + 1], expected) ? 2 : 0;
  };
  let lit = 0;
  for (let i = 0; i < heard.length && lit < timeline.length; i++) {
    const used = match(i, timeline[lit].word);
    const skipped = used || lit + 1 >= timeline.length ? 0 : match(i, timeline[lit + 1].word);
    if (used) lit += 1;
    else if (skipped) lit += 2;
    i += Math.max(used, skipped, 1) - 1;
  }
  return lit;
}

/** Speaking time that lights exactly the first `words` words. */
export function msForWords(timeline: readonly { endMs: number }[], words: number): number {
  return words > 0 ? timeline[Math.min(words, timeline.length) - 1].endMs : 0;
}

export interface Speech {
  /** Speaking time lit so far, in ms (see wordTimeline): from holding the moon, or set by the spoken words. */
  ms: number;
  /** Previous step, or null before the first. */
  at: number | null;
}

export const initialSpeech: Speech = { ms: 0, at: null };

/**
 * One step of holding the moon, at time `now` (ms), at `hold`, the {@link holdRate} (0 when not held). Letting
 * go only pauses it; it never goes back.
 */
export function holdStep(state: Speech, now: number, hold: number): Speech {
  // Steps arrive ~30 times a second; a long gap (a tab in the background) adds no more than one step's worth.
  const dt = state.at === null ? 0 : Math.min(now - state.at, 100);
  return { ms: state.ms + dt * hold, at: now };
}
