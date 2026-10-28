import { defaultData } from "../app-data";
import { progressOf } from "../achievements";
import { type Friend, parseFriendsOverview, parsePublicUser, parseUserProfile, publicStats, rankWeek } from "../friends";

const full = [0, 1, 2, 3, 4, 5];
// Saturday 24 Oct 2026; the week runs Sun 18 → Sat 24.
const saturday = new Date(2026, 9, 24, 20);

function dataWith(days: number[]) {
  const d = defaultData();
  return { ...d, completions: Object.fromEntries(days.map((n) => [`2026-10-${String(n).padStart(2, "0")}`, full])) };
}

describe("publicStats", () => {
  it("starts the week on Sunday", () => {
    expect(publicStats(dataWith([]), saturday).weekStart).toBe("2026-10-18");
  });

  it("counts all XP as week XP when history starts inside the week", () => {
    const s = publicStats(dataWith([23, 24]), saturday);
    expect(s.xp).toBeGreaterThan(0);
    expect(s.weekXp).toBe(s.xp);
  });

  it("leaves out XP earned before the week", () => {
    const data = dataWith([17, 23, 24]);
    const s = publicStats(data, saturday);
    const before = progressOf(data, new Date(2026, 9, 17, 23, 59, 59, 999)).stats.xp;
    expect(before).toBeGreaterThan(0);
    expect(s.weekXp).toBe(s.xp - before);
  });

  it("lists only unlocked badges and the level", () => {
    const data = dataWith([23, 24]);
    const p = progressOf(data, saturday);
    const s = publicStats(data, saturday);
    expect(s.badges).toEqual(p.badges.filter((b) => b.unlocked).map((b) => b.def.id));
    expect(s.level).toBe(p.level.level);
    expect(s.streak).toBe(p.stats.currentStreak);
  });
});

const f = (over: Partial<Friend>): Friend => ({
  id: "x", name: "X", username: "x", level: 1, isAdmin: false, active: true, weekStart: "2026-10-18", weekXp: 0, ...over,
});

describe("rankWeek", () => {
  const me = { id: "me", name: "Zeca", username: "zeca", level: 2, weekXp: 100 };

  it("sorts by week XP, ties by name, and shares tied positions", () => {
    const rows = rankWeek(me, [f({ id: "a", name: "Ana", weekXp: 100 }), f({ id: "b", name: "Bia", weekXp: 50 })], saturday);
    expect(rows.map((r) => [r.id, r.position])).toEqual([["a", 1], ["me", 1], ["b", 3]]);
    expect(rows.find((r) => r.me)?.id).toBe("me");
  });

  it("drops inactive friends", () => {
    expect(rankWeek(me, [f({ id: "a", active: false, weekXp: 999 })], saturday).map((r) => r.id)).toEqual(["me"]);
  });

  it("zeroes friends whose week is stale or unknown", () => {
    const rows = rankWeek(me, [f({ id: "a", weekStart: "2026-10-11", weekXp: 500 }), f({ id: "b", weekStart: null, weekXp: 500 })], saturday);
    expect(rows.filter((r) => !r.me).map((r) => r.weekXp)).toEqual([0, 0]);
  });
});

describe("parsers", () => {
  const row = { id: "a", name: "Ana", username: "ana", level: 3, is_admin: false, relation: "none" };

  it("parses a public user", () => {
    expect(parsePublicUser(row)).toEqual({ id: "a", name: "Ana", username: "ana", level: 3, isAdmin: false, relation: "none" });
  });

  it("rejects malformed rows", () => {
    expect(parsePublicUser({ ...row, relation: "x" })).toBeNull();
    expect(parsePublicUser({ ...row, username: null })).toBeNull();
    expect(parsePublicUser({ ...row, username: "" })).toBeNull();
    expect(parsePublicUser(null)).toBeNull();
  });

  it("parses a profile with hidden fields", () => {
    expect(parseUserProfile({ ...row, streak: null, badges: null, can_request: true })).toEqual({
      id: "a", name: "Ana", username: "ana", level: 3, isAdmin: false, relation: "none", streak: null, badges: null, canRequest: true,
    });
    expect(parseUserProfile({ ...row, streak: 2, badges: ["x"], can_request: "y" })).toBeNull();
  });

  it("falls back to empty lists", () => {
    const empty = { friends: [], incoming: [], outgoing: [] };
    expect(parseFriendsOverview(null)).toEqual(empty);
    expect(parseFriendsOverview("x")).toEqual(empty);
  });

  it("drops invalid entries in an overview", () => {
    const friend = { id: "a", name: "Ana", username: "ana", level: 3, is_admin: true, active: true, week_start: "2026-10-18", week_xp: 40 };
    const out = parseFriendsOverview({ friends: [friend, { ...friend, week_xp: "1" }, null], incoming: [row, { ...row, level: "z" }], outgoing: 5 });
    expect(out.friends).toEqual([{ id: "a", name: "Ana", username: "ana", level: 3, isAdmin: true, active: true, weekStart: "2026-10-18", weekXp: 40 }]);
    expect(out.incoming.map((u) => u.id)).toEqual(["a"]);
    expect(out.outgoing).toEqual([]);
  });
});
