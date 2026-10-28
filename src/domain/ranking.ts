import { XP_RULES } from "./gamification";
import { addDays, dayKey, fromDayKey, type Weekday } from "./time";
import { TRICK_COUNT } from "./tricks";

export interface RankingLog {
  /** day key -> trick indices done */
  tricks: Readonly<Record<string, readonly number[]>>;
  /** day key -> cups drunk and the goal frozen that day */
  water: Readonly<Record<string, { cups: number; goal: number }>>;
  activeDays: readonly Weekday[];
}

/** Distinct valid trick indices done on `day`. */
function countOf(log: RankingLog, day: string): number {
  return new Set((log.tricks[day] ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < TRICK_COUNT)).size;
}

/**
 * XP earned in the Sunday-first week starting `weekStart`. Days >= `lenientFrom` never break the streak.
 * Mirrors the SQL `public.week_xp_of` (supabase/ranking.sql); both run the vectors in supabase/tests/ranking.sql.
 */
export function weekXp(log: RankingLog, weekStart: string, lenientFrom: string): number {
  const first = Object.keys(log.tricks).filter((k) => countOf(log, k) > 0).sort()[0];
  const end = dayKey(addDays(fromDayKey(weekStart), 6));
  const days = log.activeDays.length > 0 ? log.activeDays : [0, 1, 2, 3, 4, 5, 6];
  let xp = 0;
  let streak = 0;
  let allDone = true;
  let anyActive = false;
  for (let d = fromDayKey(first && first < weekStart ? first : weekStart), key = dayKey(d); key <= end; d = addDays(d, 1), key = dayKey(d)) {
    const count = countOf(log, key);
    const active = days.includes(d.getDay() as Weekday);
    const inWeek = key >= weekStart;
    if (count === TRICK_COUNT) {
      if (active) streak++;
      if (inWeek) xp += XP_RULES.perfectDay + XP_RULES.streakStep * Math.min(Math.max(streak - 1, 0), XP_RULES.streakCap);
    } else if (active && key < lenientFrom) {
      streak = 0;
    }
    if (!inWeek) continue;
    xp += XP_RULES.trick * count;
    const w = log.water[key];
    if (w && w.cups >= w.goal) xp += XP_RULES.waterGoal;
    if (active) {
      anyActive = true;
      if (count !== TRICK_COUNT) allDone = false;
    }
  }
  return anyActive && allDone ? xp + XP_RULES.perfectWeek : xp;
}
