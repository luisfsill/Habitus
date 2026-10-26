import { parseTime, type Minutes } from "./time";

/** Optional water reminders. Off by default; the person sets the goal in cups. */
export interface WaterSettings {
  enabled: boolean;
  /** Cups per day. */
  goal: number;
  /** Minutes between reminders. */
  everyMinutes: number;
}

export const DEFAULT_WATER: WaterSettings = { enabled: false, goal: 8, everyMinutes: 90 };
export const WATER_GOAL = { min: 1, max: 20 } as const;
export const WATER_EVERY = { min: 30, max: 240, step: 30 } as const;
/** Ceiling for one day's count, so a stuck button cannot grow it forever. */
export const MAX_CUPS = 50;
/** A water reminder this close to a tip is skipped: one ping is enough. */
export const WATER_TIP_GAP = 10;

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}

export function sanitizeWater(raw: unknown, fallback: WaterSettings = DEFAULT_WATER): WaterSettings {
  if (typeof raw !== "object" || raw === null) return fallback;
  const { enabled, goal, everyMinutes } = raw as Record<string, unknown>;
  const every = clampInt(everyMinutes, WATER_EVERY.min, WATER_EVERY.max, fallback.everyMinutes);
  return {
    enabled: typeof enabled === "boolean" ? enabled : fallback.enabled,
    goal: clampInt(goal, WATER_GOAL.min, WATER_GOAL.max, fallback.goal),
    everyMinutes: Math.round(every / WATER_EVERY.step) * WATER_EVERY.step,
  };
}

/** One day's count and when it last changed (ms), so a later −1 on another device is not undone by a sync. */
export interface WaterDay {
  cups: number;
  at: number;
}

/** Valid day keys only; counts within [0, MAX_CUPS] (0 is kept: it records a "−1" back to zero). */
export function sanitizeWaterLog(raw: unknown): Record<string, WaterDay> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const out: Record<string, WaterDay> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || typeof value !== "object" || value === null) continue;
    const { cups, at } = value as Record<string, unknown>;
    out[key] = { cups: clampInt(cups, 0, MAX_CUPS, 0), at: clampInt(at, 0, Number.MAX_SAFE_INTEGER, 0) };
  }
  return out;
}

/** Per day, the most recent change wins; on a tie, the higher count. */
export function mergeWaterLog(a: Readonly<Record<string, WaterDay>>, b: Readonly<Record<string, WaterDay>>): Record<string, WaterDay> {
  const out = { ...a };
  for (const [day, theirs] of Object.entries(b)) {
    const ours = out[day];
    if (!ours || theirs.at > ours.at || (theirs.at === ours.at && theirs.cups > ours.cups)) out[day] = theirs;
  }
  return out;
}

export function cupsOn(log: Readonly<Record<string, WaterDay>>, day: string): number {
  return log[day]?.cups ?? 0;
}

/** Today's count after a +1 or −1 tap, within [0, MAX_CUPS]. */
export function nextCups(current: number, delta: 1 | -1): number {
  return Math.min(MAX_CUPS, Math.max(0, current + delta));
}

/**
 * Reminder times inside the day window ("HH:MM"): every `everyMinutes` after
 * `start`, up to `end`, skipping any within {@link WATER_TIP_GAP} minutes of a tip.
 */
export function waterMinutes(start: string, end: string, everyMinutes: number, tipMinutes: readonly Minutes[]): Minutes[] {
  const from = parseTime(start);
  const to = parseTime(end);
  if (from === null || to === null || to <= from || everyMinutes <= 0) return [];
  const out: Minutes[] = [];
  for (let m = from + everyMinutes; m <= to; m += everyMinutes) {
    if (tipMinutes.every((tip) => Math.abs(tip - m) >= WATER_TIP_GAP)) out.push(m);
  }
  return out;
}

/** "1h30", "2h", "30 min". */
export function formatEvery(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}
