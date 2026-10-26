import { type Completions, doneCount, isDayComplete, weekDays } from "./history";
import { addDays, dayKey, fromDayKey, type Weekday } from "./time";
import { TRICK_COUNT } from "./tricks";

/** XP rules (Duolingo-style): every trick counts, perfect days and weeks pay bonuses. */
export const XP_RULES = {
  trick: 10,
  perfectDay: 25,
  /** Extra per day of the running streak on a perfect day, capped. */
  streakStep: 5,
  streakCap: 10,
  perfectWeek: 150,
  /** A day the water goal was met (only when water reminders are used). */
  waterGoal: 15,
} as const;

/** XP needed to go from `level` to `level + 1`; grows so early levels come fast. */
export function xpToNext(level: number): number {
  return 100 + 50 * (level - 1);
}

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP the current level needs in total. */
  needed: number;
}

export function levelFor(xp: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, xp);
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, into: rest, needed: xpToNext(level) };
}

/** Ranks are martial-arts belts, unlocked by level. */
export interface Belt {
  name: string;
  minLevel: number;
  color: string;
  /** Text color on top of `color` that meets AA contrast. */
  ink: string;
}

export const BELTS: readonly Belt[] = [
  { name: "Faixa Branca", minLevel: 1, color: "#E4E4E7", ink: "#18181B" },
  { name: "Faixa Amarela", minLevel: 3, color: "#FACC15", ink: "#18181B" },
  { name: "Faixa Laranja", minLevel: 5, color: "#FB923C", ink: "#18181B" },
  { name: "Faixa Verde", minLevel: 8, color: "#22C55E", ink: "#18181B" },
  { name: "Faixa Azul", minLevel: 12, color: "#2563EB", ink: "#FFFFFF" },
  { name: "Faixa Roxa", minLevel: 16, color: "#7C3AED", ink: "#FFFFFF" },
  { name: "Faixa Marrom", minLevel: 21, color: "#92400E", ink: "#FFFFFF" },
  { name: "Faixa Preta", minLevel: 27, color: "#18181B", ink: "#FFFFFF" },
];

export function beltFor(level: number): Belt {
  return [...BELTS].reverse().find((b) => level >= b.minLevel) ?? BELTS[0];
}

export function nextBelt(level: number): Belt | undefined {
  return BELTS.find((b) => b.minLevel > level);
}

/** Bonus for a complete day on the `streak`-th day of a run. */
export function perfectDayXp(streak: number): number {
  return XP_RULES.perfectDay + XP_RULES.streakStep * Math.min(Math.max(streak - 1, 0), XP_RULES.streakCap);
}

export interface Stats {
  xp: number;
  totalTricks: number;
  perfectDays: number;
  perfectWeeks: number;
  currentStreak: number;
  bestStreak: number;
  gratitudeDays: number;
  /** Days the water goal was met. */
  waterDays: number;
}

/**
 * Replays the history day by day and totals XP and stats.
 * shortcut: uses today's active weekdays for the whole past, so changing
 * them can shift old XP; store per-day XP if that ever matters.
 */
export function computeStats(
  completions: Completions,
  gratitude: Readonly<Record<string, string>>,
  activeDays: readonly Weekday[],
  today: Date,
): Stats {
  const todayKey = dayKey(today);
  const days = Object.keys(completions).filter((k) => doneCount(completions, k) > 0).sort();
  const stats: Stats = {
    xp: 0,
    totalTricks: 0,
    perfectDays: 0,
    perfectWeeks: 0,
    currentStreak: 0,
    bestStreak: 0,
    gratitudeDays: Object.keys(gratitude).length,
    waterDays: 0,
  };
  if (days.length === 0) return stats;

  let streak = 0;
  for (let d = fromDayKey(days[0]); dayKey(d) <= todayKey; d = addDays(d, 1)) {
    const key = dayKey(d),
      count = doneCount(completions, key),
      active = activeDays.includes(d.getDay() as Weekday);
    stats.totalTricks += count;
    stats.xp += count * XP_RULES.trick;
    if (count >= TRICK_COUNT) {
      streak += active ? 1 : 0;
      stats.perfectDays++;
      stats.xp += perfectDayXp(streak);
    } else if (active && key !== todayKey) {
      // Today still in progress does not break the streak.
      streak = 0;
    }
    stats.bestStreak = Math.max(stats.bestStreak, streak);
    // Close each Sunday-first week on Saturday (or today, for the running week).
    if ((d.getDay() === 6 || key === todayKey) && isPerfectWeek(completions, d, activeDays)) {
      stats.perfectWeeks++;
      stats.xp += XP_RULES.perfectWeek;
    }
  }
  stats.currentStreak = streak;
  return stats;
}

/**
 * Adds the water goal days to stats from {@link computeStats}.
 * shortcut: judged against today's goal for the whole past, like activeDays there.
 */
export function withWater(stats: Stats, log: Readonly<Record<string, { cups: number }>>, goal: number, today: Date): Stats {
  const todayKey = dayKey(today);
  const waterDays = Object.entries(log).filter(([day, { cups }]) => day <= todayKey && cups >= goal).length;
  return { ...stats, waterDays, xp: stats.xp + waterDays * XP_RULES.waterGoal };
}

/** Every active day of the week containing `date` is complete. */
export function isPerfectWeek(completions: Completions, date: Date, activeDays: readonly Weekday[]): boolean {
  const active = weekDays(date).filter((d) => activeDays.includes(d.getDay() as Weekday));
  return active.length > 0 && active.every((d) => isDayComplete(completions, dayKey(d)));
}
