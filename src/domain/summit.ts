/**
 * Postura de poder: two minutes standing firm, breathing with a guide, climb a mountain. Every session adds altitude
 * and the peaks are conquered in turn, up to Everest. Counted from the completions, so nothing new is stored.
 */

import type { Completions } from "./history";

export const SUMMIT_TRICK = 1;
export const METERS_PER_SESSION = 300;
export const PEAKS = [
  { name: "Pão de Açúcar", meters: 396 },
  { name: "Pico da Neblina", meters: 2995 },
  { name: "Mont Blanc", meters: 4806 },
  { name: "Kilimanjaro", meters: 5895 },
  { name: "Aconcágua", meters: 6961 },
  { name: "Everest", meters: 8849 },
] as const;

/** Meters climbed in all the sessions so far. */
export function altitudeOf(completions: Completions): number {
  return Object.values(completions).filter((done) => done.includes(SUMMIT_TRICK)).length * METERS_PER_SESSION;
}

const meters = (m: number) => `${m.toLocaleString("pt-BR")} m`;

/** The highest peak at or below `altitude`, if any. */
export function peakAt(altitude: number) {
  return [...PEAKS].reverse().find((p) => p.meters <= altitude);
}

/** "3.300 m · próximo: Mont Blanc (4.806 m)", or the peak today's session just reached. */
export function summitLine(before: number, after: number): string {
  const reached = peakAt(after);
  if (reached && reached !== peakAt(before)) return `Cume: ${reached.name}! ${meters(reached.meters)}`;
  const next = PEAKS.find((p) => p.meters > after);
  return next ? `${meters(after)} · próximo: ${next.name} (${meters(next.meters)})` : `${meters(after)} · todos os picos conquistados`;
}

/** One breath of the guide: in for half, out for half. */
export const BREATH_MS = 8000;

/** Breathing in (true) or out at `ms` into the session. */
export function breathingIn(ms: number): boolean {
  return ms % BREATH_MS < BREATH_MS / 2;
}

/** Phone movement (0 still … 1 strong) above which the person is not standing firm: the climb pauses. */
export const SHAKE_LIMIT = 0.35;
/** How long the climb stays paused after a shake (ms). */
export const SHAKE_PAUSE_MS = 1200;

export interface Climb {
  /** Time climbed (standing firm), in ms. */
  ms: number;
  /** Paused until this moment (ms). */
  pausedUntil: number;
  /** Previous step, or null before the first. */
  at: number | null;
}

export const initialClimb: Climb = { ms: 0, pausedUntil: -Infinity, at: null };

/** One step of the climb at `now` (ms): time counts while standing firm; a shake pauses it for a moment. */
export function climbStep(state: Climb, now: number, shake: number): Climb {
  const pausedUntil = shake > SHAKE_LIMIT ? now + SHAKE_PAUSE_MS : state.pausedUntil;
  // Steps arrive a few times a second; a long gap (a tab in the background) adds no more than one step's worth.
  const dt = state.at === null || now < pausedUntil ? 0 : Math.min(now - state.at, 250);
  return { ms: state.ms + dt, pausedUntil, at: now };
}

/** The climb is paused at `now`. */
export function paused(state: Climb, now: number): boolean {
  return now < state.pausedUntil;
}
