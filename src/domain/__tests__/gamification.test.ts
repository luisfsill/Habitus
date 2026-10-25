import { progressFrom, rewardBetween } from "../achievements";
import { beltFor, computeStats, levelFor, nextBelt, XP_RULES, xpToNext } from "../gamification";
import { ALL_WEEKDAYS } from "../time";

const full = [0, 1, 2, 3, 4];
// Saturday 24 Oct 2026; the week runs Sun 18 → Sat 24.
const saturday = new Date(2026, 9, 24, 20);

function week(from: number, to: number, value: number[] = full): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (let d = from; d <= to; d++) out[`2026-10-${String(d).padStart(2, "0")}`] = value;
  return out;
}

describe("levels", () => {
  it("needs 100 XP for level 2 and 50 more for each level after", () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(2)).toBe(150);
    expect(levelFor(0)).toEqual({ level: 1, into: 0, needed: 100 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100)).toEqual({ level: 2, into: 0, needed: 150 });
    expect(levelFor(260)).toEqual({ level: 3, into: 10, needed: 200 });
  });

  it("maps levels to belts", () => {
    expect(beltFor(1).name).toBe("Faixa Branca");
    expect(beltFor(3).name).toBe("Faixa Amarela");
    expect(beltFor(40).name).toBe("Faixa Preta");
    expect(nextBelt(4)?.name).toBe("Faixa Laranja");
    expect(nextBelt(27)).toBeUndefined();
  });
});

describe("computeStats", () => {
  it("is zero with no history", () => {
    expect(computeStats({}, {}, ALL_WEEKDAYS, saturday).xp).toBe(0);
  });

  it("pays 10 XP per trick", () => {
    const stats = computeStats({ "2026-10-24": [0, 2] }, {}, ALL_WEEKDAYS, saturday);
    expect(stats.xp).toBe(20);
    expect(stats.totalTricks).toBe(2);
  });

  it("adds the perfect-day bonus, growing with the streak", () => {
    const one = computeStats(week(23, 23), {}, ALL_WEEKDAYS, saturday);
    expect(one.xp).toBe(50 + XP_RULES.perfectDay);
    const two = computeStats(week(23, 24), {}, ALL_WEEKDAYS, saturday);
    // Day 2 of the streak earns one streak step on top.
    expect(two.xp).toBe(100 + 2 * XP_RULES.perfectDay + XP_RULES.streakStep);
    expect(two.currentStreak).toBe(2);
  });

  it("caps the streak bonus", () => {
    const month = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`2026-10-${String(i + 5).padStart(2, "0")}`, full]),
    );
    const stats = computeStats(month, {}, ALL_WEEKDAYS, saturday);
    const lastDay = XP_RULES.perfectDay + XP_RULES.streakStep * XP_RULES.streakCap;
    expect(stats.bestStreak).toBe(20);
    expect(stats.xp).toBeGreaterThan(20 * lastDay);
  });

  it("breaks the streak on a missed active day but not on today", () => {
    const stats = computeStats({ ...week(20, 21), ...week(23, 23), "2026-10-24": [0] }, {}, ALL_WEEKDAYS, saturday);
    expect(stats.bestStreak).toBe(2);
    expect(stats.currentStreak).toBe(1);
  });

  it("pays the perfect-week bonus once per complete Sunday–Saturday week", () => {
    const stats = computeStats(week(18, 24), {}, ALL_WEEKDAYS, saturday);
    expect(stats.perfectWeeks).toBe(1);
    const partial = computeStats(week(19, 24), {}, ALL_WEEKDAYS, saturday);
    expect(partial.perfectWeeks).toBe(0);
  });

  it("only requires the active weekdays for a perfect week", () => {
    // Mon–Fri active; Fri 23 is the last active day.
    const weekdays = [1, 2, 3, 4, 5] as const;
    const stats = computeStats(week(19, 23), {}, weekdays, saturday);
    expect(stats.perfectWeeks).toBe(1);
    expect(stats.currentStreak).toBe(5);
  });

  it("counts gratitude days", () => {
    expect(computeStats({}, { "2026-10-24": "obrigado" }, ALL_WEEKDAYS, saturday).gratitudeDays).toBe(1);
  });
});

describe("badges and rewards", () => {
  it("unlocks badges with progress", () => {
    const p = progressFrom(computeStats(week(23, 24), {}, ALL_WEEKDAYS, saturday));
    const byId = Object.fromEntries(p.badges.map((b) => [b.def.id, b]));
    expect(byId["first-step"].unlocked).toBe(true);
    expect(byId["perfect-day"].unlocked).toBe(true);
    expect(byId["streak-3"]).toMatchObject({ unlocked: false, progress: 2 });
  });

  it("reports XP, level-up and new badges between two snapshots", () => {
    const before = progressFrom(computeStats(week(24, 24, [0, 1, 2, 3]), {}, ALL_WEEKDAYS, saturday));
    const after = progressFrom(computeStats(week(24, 24), {}, ALL_WEEKDAYS, saturday));
    const reward = rewardBetween(before, after);
    expect(reward?.xp).toBe(XP_RULES.trick + XP_RULES.perfectDay);
    expect(reward?.badges.map((b) => b.id)).toEqual(["perfect-day"]);
    expect(rewardBetween(after, after)).toBeNull();
  });

  it("flags a level-up", () => {
    const before = progressFrom({ ...computeStats({}, {}, ALL_WEEKDAYS, saturday), xp: 95 });
    const after = progressFrom({ ...before.stats, xp: 105 });
    expect(rewardBetween(before, after)?.levelUp).toBe(2);
  });
});
