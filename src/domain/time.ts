/** Minutes since local midnight. May be fractional (seconds precision). */
export type Minutes = number;

/** 0 = domingo … 6 = sábado, same as `Date#getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const ALL_WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];
export const MINUTES_PER_DAY = 24 * 60;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Parses "HH:MM" (24h). Returns null for anything else. */
export function parseTime(value: string): Minutes | null {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Formats whole minutes of the day as "HH:MM". Fractions are dropped. */
export function formatTime(minutes: Minutes): string {
  const whole = Math.floor(minutes);
  const h = Math.floor(whole / 60) % 24;
  const m = whole % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Local calendar day as "YYYY-MM-DD". */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses a "YYYY-MM-DD" key back into local midnight. */
export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Local midnight of `date`. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Same local day, `days` later (DST-safe: built from calendar fields). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** The local instant `minutes` after midnight of `day`. */
export function atMinutes(day: Date, minutes: Minutes): Date {
  const base = startOfDay(day);
  const seconds = Math.round(minutes * 60);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, seconds);
}

/** Minutes since local midnight for an instant, with seconds precision. */
export function minutesOfDay(date: Date): Minutes {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

/** Converts minutes to a "HH:MM" string, clamped to a valid day. */
export function toTimeString(minutes: Minutes): string {
  return formatTime(Math.min(Math.max(minutes, 0), MINUTES_PER_DAY - 1));
}

/** "1 h 05 min" above an hour, "12:05" (min:s) below it. */
export function formatCountdown(ms: number): string {
  const total = Math.max(Math.ceil(ms / 1000), 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
