import { MAX_LEAD_MINUTES, REPEAT_LIMITS, type Repeat, type RepeatUnit } from "@/domain/reminders";

// Shared by the native and web pickers: a `.web.tsx` file cannot import values from its own native twin.

export interface LeadParts {
  days: number;
  hours: number;
  mins: number;
}

export function splitLead(minutes: number): LeadParts {
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), mins: minutes % 60 };
}

/** Total minutes, kept within 1..MAX_LEAD_MINUTES. */
export function joinLead({ days, hours, mins }: LeadParts): number {
  return Math.min(MAX_LEAD_MINUTES, Math.max(1, days * 1440 + hours * 60 + mins));
}

export const REPEAT_UNITS: readonly RepeatUnit[] = ["day", "week", "month", "year"];

const UNIT_WORDS: Record<RepeatUnit, readonly [string, string]> = {
  day: ["dia", "dias"],
  week: ["semana", "semanas"],
  month: ["mês", "meses"],
  year: ["ano", "anos"],
};

export const unitWord = (unit: RepeatUnit, n: number) => UNIT_WORDS[unit][n === 1 ? 0 : 1];

/** Changing the unit keeps N within that unit's limit. */
export function clampRepeat(every: number, unit: RepeatUnit): Repeat {
  return { unit, every: Math.min(REPEAT_LIMITS[unit], Math.max(1, every)) };
}
