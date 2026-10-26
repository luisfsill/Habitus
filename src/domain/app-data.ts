import { bedtimeSample, DEFAULT_BEDTIME, EARLIEST_BEDTIME, estimateBedtime, LATEST_BEDTIME, parseBedtime } from "./bedtime";
import type { Completions } from "./history";
import { computeSchedule, DEFAULT_END, DEFAULT_START, type ScheduleResult } from "./schedule";
import { ALL_WEEKDAYS, parseTime, type Weekday } from "./time";
import { BEDTIME_TRICK, DEFAULT_AFFIRMATIONS, isTrickIndex } from "./tricks";
import { DEFAULT_WATER, sanitizeWater, sanitizeWaterLog, type WaterDay, type WaterSettings } from "./water";

export type ThemePreference = "auto" | "light" | "dark";
const THEMES: readonly ThemePreference[] = ["auto", "light", "dark"];

export interface Settings {
  start: string;
  end: string;
  days: Weekday[];
  affirmations: string[];
  sound: boolean;
  /** "auto" follows the system light/dark setting. */
  theme: ThemePreference;
  /** The bedtime the user told us ("HH:MM"); the starting point for learning. */
  bedtime: string;
  /** Optional water reminders; off unless the person turns them on. */
  water: WaterSettings;
}

export interface AppData {
  version: 1;
  onboarded: boolean;
  settings: Settings;
  completions: Completions;
  /** dayKey → gratitude phrase written that day. */
  gratitude: Record<string, string>;
  /** Night dayKey → night minutes when the bedtime trick was done. */
  sleepLog: Record<string, number>;
  /** dayKey → cups of water logged that day and when that count last changed. */
  water: Record<string, WaterDay>;
  /** When `settings` last changed (ms); decides which device's settings win a sync. */
  settingsUpdatedAt: number;
  /** When "Resetar dados" last ran (ms); older copies on other devices are dropped in a sync. */
  resetAt: number;
  /** Account this data belongs to; null for data saved before signing in. */
  owner: string | null;
}

export const MAX_AFFIRMATIONS = 10;
export const MAX_TEXT_LENGTH = 200;

export function defaultData(): AppData {
  return {
    version: 1,
    onboarded: false,
    settings: {
      start: DEFAULT_START,
      end: DEFAULT_END,
      days: [...ALL_WEEKDAYS],
      affirmations: [...DEFAULT_AFFIRMATIONS],
      sound: true,
      theme: "auto",
      bedtime: DEFAULT_BEDTIME,
      water: { ...DEFAULT_WATER },
    },
    completions: {},
    gratitude: {},
    sleepLog: {},
    water: {},
    settingsUpdatedAt: 0,
    resetAt: 0,
    owner: null,
  };
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, MAX_TEXT_LENGTH);
  return text.length > 0 ? text : null;
}

function sanitizeSettings(raw: unknown, fallback: Settings): Settings {
  if (!isRecord(raw)) return fallback;
  const time = (v: unknown, d: string) => (typeof v === "string" && parseTime(v) !== null ? v : d);
  const days = Array.isArray(raw.days)
    ? ALL_WEEKDAYS.filter((d) => (raw.days as unknown[]).includes(d))
    : fallback.days;
  const affirmations = Array.isArray(raw.affirmations)
    ? raw.affirmations.map(cleanText).filter((t): t is string => t !== null).slice(0, MAX_AFFIRMATIONS)
    : fallback.affirmations;
  return {
    start: time(raw.start, fallback.start),
    end: time(raw.end, fallback.end),
    days,
    affirmations,
    sound: typeof raw.sound === "boolean" ? raw.sound : fallback.sound,
    theme: THEMES.includes(raw.theme as ThemePreference) ? (raw.theme as ThemePreference) : fallback.theme,
    bedtime: typeof raw.bedtime === "string" && parseBedtime(raw.bedtime) !== null ? raw.bedtime : fallback.bedtime,
    water: sanitizeWater(raw.water, fallback.water),
  };
}

function timestamp(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function sanitizeCompletions(raw: unknown): Record<string, number[]> {
  if (!isRecord(raw)) return {};
  const out: Record<string, number[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!DAY_KEY.test(key) || !Array.isArray(value)) continue;
    const indices = [...new Set(value.filter(isTrickIndex))].sort((a, b) => a - b);
    if (indices.length > 0) out[key] = indices;
  }
  return out;
}

function sanitizeGratitude(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const text = cleanText(value);
    if (DAY_KEY.test(key) && text !== null) out[key] = text;
  }
  return out;
}

function sanitizeSleepLog(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (DAY_KEY.test(key) && typeof value === "number" && value >= EARLIEST_BEDTIME && value <= LATEST_BEDTIME) out[key] = value;
  }
  return out;
}

/** Accepts anything read from storage and returns a valid AppData. */
export function sanitizeData(raw: unknown): AppData {
  const base = defaultData();
  if (!isRecord(raw) || raw.version !== 1) return base;
  return {
    version: 1,
    onboarded: raw.onboarded === true,
    settings: sanitizeSettings(raw.settings, base.settings),
    completions: sanitizeCompletions(raw.completions),
    gratitude: sanitizeGratitude(raw.gratitude),
    sleepLog: sanitizeSleepLog(raw.sleepLog),
    water: sanitizeWaterLog(raw.water),
    settingsUpdatedAt: timestamp(raw.settingsUpdatedAt),
    resetAt: timestamp(raw.resetAt),
    owner: typeof raw.owner === "string" ? raw.owner : null,
  };
}

/**
 * Returns new data with `trickIndex` marked done on `day`. Idempotent.
 * For the bedtime trick, `at` (when it was done) feeds the bedtime learning.
 */
export function withCompletion(data: AppData, day: string, trickIndex: number, at?: Date): AppData {
  if (!isTrickIndex(trickIndex)) return data;
  const current = data.completions[day] ?? [];
  if (current.includes(trickIndex)) return data;
  const sample = trickIndex === BEDTIME_TRICK && at ? bedtimeSample(at) : null;
  return {
    ...data,
    completions: { ...data.completions, [day]: [...current, trickIndex].sort((a, b) => a - b) },
    // A bedtime trick done at, say, 15:00 is not a bedtime: do not learn from it.
    sleepLog: sample !== null && sample >= EARLIEST_BEDTIME ? { ...data.sleepLog, [day]: sample } : data.sleepLog,
  };
}

/** Today's schedule, with tonight's learned bedtime. */
export function scheduleFor(data: Pick<AppData, "settings" | "sleepLog" | "completions">, now: Date): ScheduleResult {
  const { start, end, days, bedtime } = data.settings;
  return computeSchedule(start, end, days, estimateBedtime(bedtime, data.sleepLog, data.completions, now).minutes);
}

/** Set of `${day}:${index}` keys, the shape planNotifications expects. */
export function completedKeys(completions: Completions): Set<string> {
  const keys = new Set<string>();
  for (const [day, indices] of Object.entries(completions)) {
    for (const i of indices) keys.add(`${day}:${i}`);
  }
  return keys;
}
