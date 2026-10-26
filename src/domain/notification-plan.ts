import { greetingFor, type DaySchedule, sliceCenters } from "./schedule";
import { addDays, atMinutes, dayKey, formatTime, startOfDay } from "./time";
import { notificationTitle, TRICK_COUNT, TRICKS, type TrickIndex } from "./tricks";
import { cupsOn, type WaterDay, waterMinutes, type WaterSettings } from "./water";

/** Days ahead that get notifications. 7 × 7 = 49, under iOS's ~64 cap. */
export const PLAN_HORIZON_DAYS = 7;
/** With water reminders on, fewer days fit under the cap; the app replans every time it opens. */
export const WATER_HORIZON_DAYS = 3;
/** Hard ceiling on pending notifications, leaving room for snoozes. */
export const MAX_PENDING_NOTIFICATIONS = 60;
export const SNOOZE_MINUTES = 10;

export type PlannedKind = "opening" | "trick" | "water";

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
  /** End of the user's access: nothing is planned after it. */
  until?: Date;
  /** Water reminders, when on. Days whose goal is already met get none. */
  water?: { settings: WaterSettings; start: string; end: string; log: Readonly<Record<string, WaterDay>> };
}

export function waterNotification(day: string, minutes: number, date: Date, goal: number): PlannedNotification {
  return {
    id: `${day}:water:${minutes}`,
    date,
    kind: "water",
    dayKey: day,
    title: "Hora de beber água",
    body: `Um copo agora. Sua meta de hoje é de ${goal} copos.`,
  };
}

function waterNotifications(schedule: DaySchedule, day: Date, water: NonNullable<PlanOptions["water"]>): PlannedNotification[] {
  const key = dayKey(day);
  const { settings } = water;
  if (!settings.enabled || cupsOn(water.log, key) >= settings.goal) return [];
  return waterMinutes(water.start, water.end, settings.everyMinutes, schedule.trickMinutes).map((m) =>
    waterNotification(key, m, atMinutes(day, m), settings.goal),
  );
}

export function completionKey(day: string, trickIndex: number): string {
  return `${day}:${trickIndex}`;
}

export function openingBody(firstTrickMinutes: number, greeting: string): string {
  return `${greeting}! Hoje você tem ${TRICK_COUNT} dicas para fazer. A primeira chega às ${formatTime(firstTrickMinutes)}.`;
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

/** Still ahead, inside the access window and not for a tip already done. */
function isDue(item: PlannedNotification, now: Date, until: Date | undefined, completed: ReadonlySet<string>): boolean {
  if (item.date.getTime() <= now.getTime()) return false;
  if (until && item.date.getTime() > until.getTime()) return false;
  return item.trickIndex === undefined || !completed.has(completionKey(item.dayKey, item.trickIndex));
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
  const horizon = options.horizonDays ?? (options.water?.settings.enabled ? WATER_HORIZON_DAYS : PLAN_HORIZON_DAYS);
  const completed = options.completed ?? new Set<string>();
  const today = startOfDay(now);
  const plan: PlannedNotification[] = [];

  for (let offset = 0; offset < horizon; offset++) {
    const day = addDays(today, offset);
    if (!schedule.days.includes(day.getDay() as DaySchedule["days"][number])) continue;
    const water = options.water ? waterNotifications(schedule, day, options.water) : [];
    const items = [...dayNotifications(schedule, day), ...water].sort((a, b) => a.date.getTime() - b.date.getTime());
    plan.push(...items.filter((item) => isDue(item, now, options.until, completed)));
  }
  return plan.slice(0, MAX_PENDING_NOTIFICATIONS);
}

/** Where tapping a reminder lands: the tip's screen, or Hoje for the opening and water. */
export function reminderUrl(item: Pick<PlannedNotification, "trickIndex">): string {
  return item.trickIndex === undefined ? "/" : `/trick/${item.trickIndex}`;
}

/** A row of the server push queue (`push_queue`), sent by the `push-send` function when due. */
export interface PushRow {
  id: string;
  send_at: string;
  title: string;
  body: string;
  url: string;
}

export function pushRow(item: PlannedNotification): PushRow {
  return { id: item.id, send_at: item.date.toISOString(), title: item.title, body: item.body, url: reminderUrl(item) };
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
  const centers = sliceCenters(start, windowMinutes * 60_000, TRICK_COUNT);
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
