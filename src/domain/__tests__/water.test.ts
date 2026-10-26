import { DEFAULT_WATER, formatEvery, mergeWaterLog, nextCups, sanitizeWater, sanitizeWaterLog, waterMinutes } from "../water";

describe("waterMinutes", () => {
  it("spaces reminders through the day window", () => {
    expect(waterMinutes("08:00", "12:00", 90, [])).toEqual([9 * 60 + 30, 11 * 60]);
  });

  it("skips a reminder that lands close to a tip", () => {
    // 10:24 is a tip: the 10:30 water reminder is dropped, 12:00 stays.
    expect(waterMinutes("09:00", "12:00", 90, [10 * 60 + 24])).toEqual([12 * 60]);
  });

  it("returns nothing for an invalid window", () => {
    expect(waterMinutes("12:00", "08:00", 60, [])).toEqual([]);
  });
});

describe("water settings and log", () => {
  it("is off by default and clamps bad values", () => {
    expect(sanitizeWater(undefined)).toEqual(DEFAULT_WATER);
    expect(sanitizeWater({ enabled: true, goal: 99, everyMinutes: 47 })).toEqual({ enabled: true, goal: 20, everyMinutes: 60 });
  });

  it("drops invalid days and keeps counts within limits", () => {
    expect(sanitizeWaterLog({ "2026-10-26": { cups: 3, at: 5 }, nope: { cups: 2, at: 1 }, "2026-10-25": { cups: 0, at: 9 }, "2026-10-24": { cups: 999, at: 1 }, "2026-10-23": 4 })).toEqual({
      "2026-10-26": { cups: 3, at: 5 },
      "2026-10-25": { cups: 0, at: 9 },
      "2026-10-24": { cups: 50, at: 1 },
    });
  });

  it("merges two devices: the latest change per day wins, so a −1 survives a sync", () => {
    const phone = { a: { cups: 0, at: 200 }, b: { cups: 5, at: 100 } };
    const server = { a: { cups: 1, at: 100 }, b: { cups: 3, at: 100 }, c: { cups: 1, at: 50 } };
    expect(mergeWaterLog(phone, server)).toEqual({ a: { cups: 0, at: 200 }, b: { cups: 5, at: 100 }, c: { cups: 1, at: 50 } });
  });

  it("never counts below zero", () => {
    expect(nextCups(0, -1)).toBe(0);
    expect(nextCups(4, 1)).toBe(5);
  });

  it("formats the interval", () => {
    expect([formatEvery(30), formatEvery(60), formatEvery(90)]).toEqual(["30 min", "1h", "1h30"]);
  });
});
