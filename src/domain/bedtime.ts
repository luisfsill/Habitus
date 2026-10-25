import { type Completions } from "./history";
import { addDays, dayKey, fromDayKey, type Minutes, minutesOfDay, parseTime } from "./time";
import { BEDTIME_TRICK, type TrickIndex } from "./tricks";

/**
 * Bedtimes are "night minutes": times before 06:00 belong to the night that
 * started the day before, so 00:30 is 24:30 (1470). That keeps a median of
 * 23:50 and 00:10 at 00:00 instead of noon.
 */
export const NIGHT_CUTOFF = 6 * 60;
export const EARLIEST_BEDTIME = 18 * 60;
export const LATEST_BEDTIME = 24 * 60 + NIGHT_CUTOFF - 5;
export const DEFAULT_BEDTIME = "23:00";
/** Nights used for the estimate. */
export const SAMPLE_NIGHTS = 7;
/** Each night the reminder went unanswered pulls the next one this much earlier. */
export const MISSED_STEP = 10;
export const MISSED_MAX_STEPS = 3;

export function toNightMinutes(minutes: Minutes): Minutes {
  return minutes < NIGHT_CUTOFF ? minutes + 24 * 60 : minutes;
}

/** "HH:MM" → night minutes, or null when invalid or not a plausible bedtime. */
export function parseBedtime(value: string): Minutes | null {
  const minutes = parseTime(value);
  if (minutes === null) return null;
  const night = toNightMinutes(minutes);
  return night >= EARLIEST_BEDTIME && night <= LATEST_BEDTIME ? night : null;
}

/** The night a moment belongs to: 01:00 on the 25th is the night of the 24th. */
export function nightDayKey(date: Date): string {
  return dayKey(date.getHours() * 60 < NIGHT_CUTOFF ? addDays(date, -1) : date);
}

/** Day a completion counts for: the bedtime trick follows the night, the rest the calendar. */
export function trickDayKey(index: TrickIndex, now: Date): string {
  return index === BEDTIME_TRICK ? nightDayKey(now) : dayKey(now);
}

/** Night minutes of the moment the bedtime trick was done. */
export function bedtimeSample(at: Date): Minutes {
  return toNightMinutes(minutesOfDay(at));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const clamp = (m: number) => Math.min(Math.max(m, EARLIEST_BEDTIME), LATEST_BEDTIME);
const roundTo5 = (m: number) => Math.round(m / 5) * 5;

export interface BedtimeEstimate {
  /** Night minutes for tonight's reminder. */
  minutes: Minutes;
  /** Nights the estimate learned from (0 = still the user's answer). */
  nights: number;
  /** Recent nights the reminder seemed to arrive after the user fell asleep. */
  missed: number;
}

/**
 * Learns when the user goes to bed:
 * 1. Starts from the time they gave (`seed`).
 * 2. Each time they do the bedtime trick, that moment becomes a sample; the
 *    estimate is the median of the last 7 samples (robust to a late night out).
 * 3. Nights they used the app but skipped the bedtime trick suggest the
 *    reminder came after they fell asleep: 10 min earlier per such night, up to 30.
 */
export function estimateBedtime(
  seed: string,
  sleepLog: Readonly<Record<string, number>>,
  completions: Completions,
  now: Date,
): BedtimeEstimate {
  const tonight = nightDayKey(now);
  const samples = Object.keys(sleepLog)
    .filter((k) => k < tonight)
    .sort()
    .slice(-SAMPLE_NIGHTS)
    .map((k) => sleepLog[k]);
  const base = samples.length > 0 ? median(samples) : (parseBedtime(seed) ?? (parseBedtime(DEFAULT_BEDTIME) as number));

  let missed = 0;
  for (let d = addDays(fromDayKey(tonight), -1); missed < MISSED_MAX_STEPS; d = addDays(d, -1)) {
    const key = dayKey(d);
    const active = (completions[key]?.length ?? 0) > 0;
    if (!active || key in sleepLog || completions[key]?.includes(BEDTIME_TRICK)) break;
    missed++;
  }
  return { minutes: clamp(roundTo5(base - missed * MISSED_STEP)), nights: samples.length, missed };
}
