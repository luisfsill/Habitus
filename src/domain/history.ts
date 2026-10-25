import { addDays, dayKey, type Weekday } from "./time";
import { TRICK_COUNT } from "./tricks";

/** dayKey → trick indices completed that day. */
export type Completions = Readonly<Record<string, readonly number[]>>;

export function doneCount(completions: Completions, day: string): number {
  return new Set(completions[day] ?? []).size;
}

export function isDayComplete(completions: Completions, day: string): boolean {
  return doneCount(completions, day) >= TRICK_COUNT;
}

/**
 * Consecutive complete active days ending today (or yesterday, when today is
 * still in progress). Inactive weekdays neither count nor break the streak.
 */
export function currentStreak(completions: Completions, today: Date, activeDays: readonly Weekday[]): number {
  if (activeDays.length === 0) return 0;
  let streak = 0;
  let cursor = today;
  if (!isDayComplete(completions, dayKey(today))) cursor = addDays(today, -1);

  for (let i = 0; i < 400; i++) {
    const weekday = cursor.getDay() as Weekday;
    if (activeDays.includes(weekday)) {
      if (!isDayComplete(completions, dayKey(cursor))) break;
      streak++;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Sunday-first week containing `date`. */
export function weekDays(date: Date): Date[] {
  const sunday = addDays(date, -date.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
}

/**
 * Share (0–100) of this week's tricks done on active days up to and
 * including today. Days still ahead in the week are not held against you.
 */
export function weekPercent(completions: Completions, today: Date, activeDays: readonly Weekday[]): number {
  const elapsed = weekDays(today).filter(
    (d) => d.getTime() <= today.getTime() && activeDays.includes(d.getDay() as Weekday),
  );
  if (elapsed.length === 0) return 0;
  const done = elapsed.reduce((sum, d) => sum + doneCount(completions, dayKey(d)), 0);
  return Math.round((done / (elapsed.length * TRICK_COUNT)) * 100);
}

export interface CalendarCell {
  key: string;
  date: Date;
  inMonth: boolean;
}

/** 6×7 Sunday-first grid covering the month of `month`. */
export function monthGrid(month: Date): CalendarCell[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    return { key: dayKey(date), date, inMonth: date.getMonth() === first.getMonth() };
  });
}

export type TrickStatus = "done" | "next" | "pending";

/**
 * Status of each trick today: done, the single next one still to come, or
 * pending (missed earlier, or later than the next one).
 */
export function trickStatuses(done: readonly number[], trickMinutes: readonly number[], nowMinutes: number): TrickStatus[] {
  const doneSet = new Set(done);
  const nextIndex = trickMinutes.findIndex((m, i) => !doneSet.has(i) && m > nowMinutes);
  return trickMinutes.map((_, i) => {
    if (doneSet.has(i)) return "done";
    return i === nextIndex ? "next" : "pending";
  });
}
