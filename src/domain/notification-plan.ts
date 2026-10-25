import { greetingFor, type DaySchedule, sliceCenters } from "./schedule";
import { addDays, atMinutes, dayKey, formatTime, startOfDay } from "./time";
import { notificationTitle, TRICK_COUNT, TRICKS, type TrickIndex } from "./tricks";

/** Days ahead that get notifications. 7 × 6 = 42, well under iOS's ~64 cap. */
export const PLAN_HORIZON_DAYS = 7;
/** Hard ceiling on pending notifications, leaving room for snoozes. */
export const MAX_PENDING_NOTIFICATIONS = 60;
export const SNOOZE_MINUTES = 10;

export type PlannedKind = "opening" | "trick";

export interface PlannedNotification {
  /** Stable id, e.g. "2026-10-24:trick:1". Rescheduling reuses it. */
  id: string;
  date: Date;
  kind: PlannedKind;
  dayKey: string;
  trickIndex?: TrickIndex;
  title: string;
  body: string;
}

export interface PlanOptions {
  horizonDays?: number;
  /** `${dayKey}:${trickIndex}` entries already completed; they are not notified. */
  completed?: ReadonlySet<string>;
}

export function completionKey(day: string, trickIndex: number): string {
  return `${day}:${trickIndex}`;
}

export function openingBody(firstTrickMinutes: number, greeting: string): string {
  return `${greeting}! Hoje você tem ${TRICK_COUNT} truques para fazer. O primeiro chega às ${formatTime(firstTrickMinutes)}.`;
}

export function trickNotification(day: string, trickIndex: TrickIndex, date: Date): PlannedNotification {
  const trick = TRICKS[trickIndex];
  return {
    id: `${day}:trick:${trickIndex}`,
    date,
    kind: "trick",
    dayKey: day,
    trickIndex,
    title: notificationTitle(trick),
    body: trick.notificationBody,
  };
}

function dayNotifications(schedule: DaySchedule, day: Date): PlannedNotification[] {
  const key = dayKey(day);
  const opening: PlannedNotification = {
    id: `${key}:opening`,
    date: atMinutes(day, schedule.openingMinutes),
    kind: "opening",
    dayKey: key,
    title: "Habitus",
    body: openingBody(schedule.trickMinutes[0], greetingFor(schedule.openingMinutes)),
  };
  const tricks = schedule.trickMinutes.map((minutes, i) =>
    trickNotification(key, i as TrickIndex, atMinutes(day, minutes)),
  );
  return [opening, ...tricks];
}

/**
 * Every notification due strictly after `now`, for the active weekdays of the
 * next `horizonDays` days (today included). Completed tricks are skipped.
 */
export function planNotifications(
  schedule: DaySchedule,
  now: Date,
  options: PlanOptions = {},
): PlannedNotification[] {
  const horizon = options.horizonDays ?? PLAN_HORIZON_DAYS;
  const completed = options.completed ?? new Set<string>();
  const today = startOfDay(now);
  const plan: PlannedNotification[] = [];

  for (let offset = 0; offset < horizon; offset++) {
    const day = addDays(today, offset);
    if (!schedule.days.includes(day.getDay() as DaySchedule["days"][number])) continue;
    for (const item of dayNotifications(schedule, day)) {
      if (item.date.getTime() <= now.getTime()) continue;
      if (item.trickIndex !== undefined && completed.has(completionKey(item.dayKey, item.trickIndex))) continue;
      plan.push(item);
    }
  }
  return plan.slice(0, MAX_PENDING_NOTIFICATIONS);
}

/**
 * Snoozes and test notifications are one-offs the user asked for: rebuilding
 * the 7-day plan must leave them alone.
 */
export function isOneOffId(id: string): boolean {
  return id.includes(":snooze:") || id.startsWith("test:");
}

/** Prefix of every snooze created for one trick on one day. */
export function snoozePrefix(day: string, trickIndex: number): string {
  return `${day}:snooze:${trickIndex}:`;
}

/** A snoozed copy of a trick notification, `SNOOZE_MINUTES` from `now`. */
export function snoozeNotification(day: string, trickIndex: TrickIndex, now: Date): PlannedNotification {
  const base = trickNotification(day, trickIndex, new Date(now.getTime() + SNOOZE_MINUTES * 60_000));
  return { ...base, id: `${snoozePrefix(day, trickIndex)}${now.getTime()}` };
}

/**
 * A compressed "day" for manual testing: opening `leadSeconds` from now and
 * the five tricks spread over the next `windowMinutes`, with the same
 * slice-centre rule as the real schedule. Bypasses the 1-hour minimum on purpose.
 */
export function planTestRun(now: Date, windowMinutes = 5, leadSeconds = 10): PlannedNotification[] {
  const start = now.getTime() + leadSeconds * 1000;
  const key = dayKey(now);
  const centers = sliceCenters(start, windowMinutes * 60_000);
  const firstAt = new Date(centers[0]);
  const opening: PlannedNotification = {
    id: `test:${start}:opening`,
    date: new Date(start),
    kind: "opening",
    dayKey: key,
    title: "Habitus (teste)",
    body: openingBody(firstAt.getHours() * 60 + firstAt.getMinutes(), "Olá"),
  };
  const tricks = centers.map((ms, i) => ({
    ...trickNotification(key, i as TrickIndex, new Date(ms)),
    id: `test:${start}:trick:${i}`,
  }));
  return [opening, ...tricks];
}
