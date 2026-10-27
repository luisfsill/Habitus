/**
 * Putting out the Foco total fire by blowing. Microphone levels come in about 30 times a second, from 0 (still) to
 * 1 (a strong blow). A blow strong enough, held long enough, puts the fire out. A weaker blow that lasts a moment
 * counts as an attempt; every attempt makes the next one a little easier, down to a floor, so a gentle blower
 * still gets there.
 */

/** Strength needed at first, and the easiest it ever gets. */
export const BLOW_OUT = 0.55;
export const BLOW_OUT_FLOOR = 0.35;
/** How much easier each failed attempt makes it. */
export const BLOW_EASIER_BY = 0.05;
/** A strong enough blow must last this long (ms): a cough or a bump should not count. */
export const BLOW_OUT_MS = 250;
/** Below this it is just room noise; between this and the threshold it is a blow that is too weak. */
export const BLOW_WEAK = 0.15;
/** A weak blow must last this long (ms) to count as an attempt. */
export const BLOW_WEAK_MS = 300;

export interface BlowState {
  /** When the current strong / weak blow began (ms), or null when there is none. */
  strongSince: number | null;
  weakSince: number | null;
  /** The current weak blow was already counted. */
  counted: boolean;
  attempts: number;
}

export const initialBlow: BlowState = { strongSince: null, weakSince: null, counted: false, attempts: 0 };

export type BlowEvent = "out" | "attempt" | null;

/** The strength a blow needs right now, after `attempts` blows that were too weak. */
export function blowThreshold(attempts: number): number {
  return Math.max(BLOW_OUT_FLOOR, BLOW_OUT - attempts * BLOW_EASIER_BY);
}

/** One microphone reading at time `now` (ms): the next state and what happened, if anything. */
export function judgeBlow(state: BlowState, level: number, now: number): { state: BlowState; event: BlowEvent } {
  const threshold = blowThreshold(state.attempts);
  if (level >= threshold) {
    const strongSince = state.strongSince ?? now;
    if (now - strongSince >= BLOW_OUT_MS) return { state: { ...state, strongSince }, event: "out" };
    return { state: { ...state, strongSince, weakSince: state.weakSince ?? now }, event: null };
  }
  if (level < BLOW_WEAK) return { state: { ...state, strongSince: null, weakSince: null, counted: false }, event: null };
  const weakSince = state.weakSince ?? now;
  if (!state.counted && now - weakSince >= BLOW_WEAK_MS) {
    return { state: { strongSince: null, weakSince, counted: true, attempts: state.attempts + 1 }, event: "attempt" };
  }
  return { state: { ...state, strongSince: null, weakSince }, event: null };
}
