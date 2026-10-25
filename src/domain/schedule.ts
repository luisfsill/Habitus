import { formatTime, type Minutes, parseTime, type Weekday } from "./time";
import { TRICK_COUNT } from "./tricks";

export const MIN_WINDOW_MINUTES = 60;
export const DEFAULT_START = "08:00";
export const DEFAULT_END = "16:00";

export type ScheduleErrorCode = "invalid-time" | "end-before-start" | "window-too-short" | "no-days";

export const SCHEDULE_ERROR_MESSAGES: Record<ScheduleErrorCode, string> = {
  "invalid-time": "Horário inválido. Use o formato HH:MM.",
  "end-before-start": "O horário de fim precisa ser depois do início.",
  "window-too-short": "A janela precisa ter pelo menos 1 hora.",
  "no-days": "Escolha pelo menos um dia da semana.",
};

export interface DaySchedule {
  /** Opening notification, at the start of the window. */
  openingMinutes: Minutes;
  /** One entry per trick, in trick order, whole minutes. */
  trickMinutes: Minutes[];
  /** Active weekdays, sorted and de-duplicated. */
  days: Weekday[];
}

export type ScheduleResult =
  | { ok: true; schedule: DaySchedule }
  | { ok: false; error: ScheduleErrorCode; message: string };

/**
 * Centre of each of `count` equal slices of [start, start + duration].
 * Slice i is centred at `start + (i + 0.5) * duration / count`.
 */
export function sliceCenters(start: number, duration: number, count: number = TRICK_COUNT): number[] {
  return Array.from({ length: count }, (_, i) => start + ((i + 0.5) * duration) / count);
}

function fail(error: ScheduleErrorCode): ScheduleResult {
  return { ok: false, error, message: SCHEDULE_ERROR_MESSAGES[error] };
}

/**
 * Spreads the five tricks evenly over the window [start, end] ("HH:MM", same
 * day, no overnight windows), each one at the centre of its slice, rounded to
 * the nearest minute. Example: 08:00–16:00 → 08:48, 10:24, 12:00, 13:36, 15:12.
 */
export function computeSchedule(start: string, end: string, days: readonly Weekday[]): ScheduleResult {
  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);
  if (startMinutes === null || endMinutes === null) return fail("invalid-time");
  if (endMinutes <= startMinutes) return fail("end-before-start");
  const duration = endMinutes - startMinutes;
  if (duration < MIN_WINDOW_MINUTES) return fail("window-too-short");
  const activeDays = [...new Set(days)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  if (activeDays.length === 0) return fail("no-days");

  return {
    ok: true,
    schedule: {
      openingMinutes: startMinutes,
      trickMinutes: sliceCenters(startMinutes, duration).map(Math.round),
      days: activeDays,
    },
  };
}

/** "08:48" style labels for a schedule's tricks. */
export function trickTimeLabels(schedule: DaySchedule): string[] {
  return schedule.trickMinutes.map(formatTime);
}

/** Greeting that matches the time of the opening notification. */
export function greetingFor(minutes: Minutes): string {
  if (minutes < 12 * 60) return "Bom dia";
  if (minutes < 18 * 60) return "Boa tarde";
  return "Boa noite";
}
