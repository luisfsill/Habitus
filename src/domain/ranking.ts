import { photoLink } from "./access";
import { isRow, num, RELATIONS, type Relation, str } from "./friends";
import { perfectDayXp, XP_RULES } from "./gamification";
import { addDays, dayKey, fromDayKey, type Weekday } from "./time";
import { TRICK_COUNT } from "./tricks";

export interface RankingLog {
  /** day key -> trick indices done */
  tricks: Readonly<Record<string, readonly number[]>>;
  /** day key -> cups drunk and the goal frozen that day */
  water: Readonly<Record<string, { cups: number; goal: number }>>;
  activeDays: readonly Weekday[];
  /** day key -> whether the day was active when first recorded; wins over `activeDays` for that day */
  activeOn?: Readonly<Record<string, boolean>>;
}

/** The streak bonus caps at 10 steps (77 days with one active weekday), so older days cannot matter. */
const LOOKBACK_DAYS = 80;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Distinct valid trick indices done on `day`. */
function countOf(log: RankingLog, day: string): number {
  return new Set((log.tricks[day] ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < TRICK_COUNT)).size;
}

interface Walk { log: RankingLog; weekStart: string; lenientFrom: string; days: readonly number[]; xp: number; streak: number; allDone: boolean; anyActive: boolean }

/** Scores one day of the week itself (tricks, water, perfect-week bookkeeping). */
function scoreDay(w: Walk, key: string, count: number, active: boolean): void {
  w.xp += XP_RULES.trick * count;
  const water = w.log.water[key];
  if (water && water.cups >= water.goal) w.xp += XP_RULES.waterGoal;
  if (!active) return;
  w.anyActive = true;
  if (count !== TRICK_COUNT) w.allDone = false;
}

function step(w: Walk, d: Date): void {
  const key = dayKey(d);
  const count = countOf(w.log, key);
  const flag = w.log.activeOn?.[key];
  const active = typeof flag === "boolean" ? flag : w.days.includes(d.getDay());
  if (count === TRICK_COUNT) {
    if (active) w.streak++;
    if (key >= w.weekStart) w.xp += perfectDayXp(w.streak);
  } else if (active && key < w.lenientFrom) {
    w.streak = 0;
  }
  if (key >= w.weekStart) scoreDay(w, key, count, active);
}

/**
 * XP earned in the Sunday-first week starting `weekStart`. Days >= `lenientFrom` never break the streak.
 * Mirrors the SQL `public.week_xp_of` (supabase/ranking.sql); both run the vectors in supabase/tests/ranking.sql.
 */
export function weekXp(log: RankingLog, weekStart: string, lenientFrom: string): number {
  const oldest = dayKey(addDays(fromDayKey(weekStart), -LOOKBACK_DAYS));
  const first = Object.keys(log.tricks).filter((k) => DAY_KEY.test(k) && k >= oldest && k < weekStart && countOf(log, k) > 0).sort()[0];
  const end = dayKey(addDays(fromDayKey(weekStart), 6));
  const days = log.activeDays.length > 0 ? log.activeDays : [0, 1, 2, 3, 4, 5, 6];
  const w: Walk = { log, weekStart, lenientFrom, days, xp: 0, streak: 0, allDone: true, anyActive: false };
  for (let d = fromDayKey(first ?? weekStart); dayKey(d) <= end; d = addDays(d, 1)) step(w, d);
  return w.anyActive && w.allDone ? w.xp + XP_RULES.perfectWeek : w.xp;
}

export interface GlobalRow { id: string; name: string; username: string; level: number; weekXp: number; position: number; relation: Relation; avatarUrl: string | null }
export interface GlobalRanking { top: GlobalRow[]; me: GlobalRow | null }

function parseGlobalRow(row: unknown): GlobalRow | null {
  if (!isRow(row)) return null;
  const { id, name, username, level, week_xp, position, relation, avatar_url } = row;
  if (!str(id) || typeof name !== "string" || !str(username) || !num(level) || !num(week_xp) || !num(position)) return null;
  if (typeof relation !== "string" || !RELATIONS.includes(relation)) return null;
  return { id, name, username, level, weekXp: week_xp, position, relation: relation as Relation, avatarUrl: photoLink(avatar_url) };
}

/** Parses the `global_ranking` RPC answer; `top` is null when empty and bad rows are dropped. */
export function parseGlobalRanking(raw: unknown): GlobalRanking {
  const r = isRow(raw) ? raw : {};
  const top = Array.isArray(r.top) ? r.top.map(parseGlobalRow).filter((x): x is GlobalRow => x !== null) : [];
  return { top, me: parseGlobalRow(r.me) };
}
