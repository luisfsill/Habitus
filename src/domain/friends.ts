import { progressOf } from "./achievements";
import type { AppData } from "./app-data";
import { weekDays } from "./history";
import { addDays, dayKey } from "./time";

export type Relation = "none" | "outgoing" | "incoming" | "friends";
export interface PublicStats { xp: number; level: number; streak: number; badges: string[]; weekStart: string; weekXp: number }
export interface PublicUser { id: string; name: string; username: string; level: number; isAdmin: boolean; relation: Relation }
export interface UserProfile extends PublicUser { streak: number | null; badges: string[] | null; canRequest: boolean }
export interface Friend { id: string; name: string; username: string; level: number; isAdmin: boolean; active: boolean; weekStart: string | null; weekXp: number }
export interface FriendsOverview { friends: Friend[]; incoming: PublicUser[]; outgoing: PublicUser[] }
export interface RankRow { id: string; name: string; username: string; level: number; weekXp: number; me: boolean; position: number }

export const STAFF_BADGE = "Fundador";

const RELATIONS: readonly string[] = ["none", "outgoing", "incoming", "friends"];

// shortcut: XP calculado no aparelho e publicado pelo próprio app; recalcular no servidor se o ranking virar global.
export function publicStats(data: Pick<AppData, "completions" | "gratitude" | "settings" | "water">, now: Date): PublicStats {
  const p = progressOf(data, now);
  const sunday = weekDays(now)[0];
  const end = addDays(sunday, -1);
  end.setHours(23, 59, 59, 999);
  const before = progressOf(data, end).stats.xp;
  return {
    xp: p.stats.xp,
    level: p.level.level,
    streak: p.stats.currentStreak,
    badges: p.badges.filter((b) => b.unlocked).map((b) => b.def.id),
    weekStart: dayKey(sunday),
    weekXp: Math.max(0, p.stats.xp - before),
  };
}

export function rankWeek(me: Omit<RankRow, "me" | "position">, friends: readonly Friend[], today: Date): RankRow[] {
  const start = dayKey(weekDays(today)[0]);
  const rows = [
    { ...me, me: true },
    ...friends
      .filter((x) => x.active)
      .map((x) => ({ id: x.id, name: x.name, username: x.username, level: x.level, weekXp: x.weekStart === start ? x.weekXp : 0, me: false })),
  ].sort((a, b) => b.weekXp - a.weekXp || a.name.localeCompare(b.name, "pt-BR"));
  const out: RankRow[] = [];
  rows.forEach((r, i) => out.push({ ...r, position: i > 0 && rows[i - 1].weekXp === r.weekXp ? out[i - 1].position : i + 1 }));
  return out;
}

type Row = Record<string, unknown>;
const isRow = (v: unknown): v is Row => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function parsePublicUser(row: unknown): PublicUser | null {
  if (!isRow(row)) return null;
  const { id, name, username, level, is_admin, relation } = row;
  if (!str(id) || typeof name !== "string" || !str(username) || !num(level) || typeof is_admin !== "boolean") return null;
  if (typeof relation !== "string" || !RELATIONS.includes(relation)) return null;
  return { id, name, username, level, isAdmin: is_admin, relation: relation as Relation };
}

export function parseUserProfile(row: unknown): UserProfile | null {
  const user = parsePublicUser(row);
  if (!user || !isRow(row)) return null;
  const { streak, badges, can_request } = row;
  if (streak !== null && !num(streak)) return null;
  if (badges !== null && !(Array.isArray(badges) && badges.every((b) => typeof b === "string"))) return null;
  if (typeof can_request !== "boolean") return null;
  return { ...user, streak, badges: badges as string[] | null, canRequest: can_request };
}

function parseFriend(row: unknown): Friend | null {
  if (!isRow(row)) return null;
  const { id, name, username, level, is_admin, active, week_start, week_xp } = row;
  if (!str(id) || typeof name !== "string" || !str(username) || !num(level) || typeof is_admin !== "boolean") return null;
  if (typeof active !== "boolean" || !num(week_xp) || (week_start !== null && typeof week_start !== "string")) return null;
  return { id, name, username, level, isAdmin: is_admin, active, weekStart: week_start, weekXp: week_xp };
}

function list<T>(v: unknown, parse: (r: unknown) => T | null): T[] {
  return Array.isArray(v) ? v.map(parse).filter((x): x is T => x !== null) : [];
}

export function parseFriendsOverview(row: unknown): FriendsOverview {
  const r = isRow(row) ? row : {};
  return { friends: list(r.friends, parseFriend), incoming: list(r.incoming, parsePublicUser), outgoing: list(r.outgoing, parsePublicUser) };
}
