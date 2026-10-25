import { currentStreak, monthGrid, trickStatuses, weekPercent } from "../history";
import { ALL_WEEKDAYS } from "../time";

const full = [0, 1, 2, 3, 4, 5];

describe("currentStreak", () => {
  // Saturday 24 Oct 2026
  const today = new Date(2026, 9, 24, 12);

  it("counts consecutive complete days ending yesterday while today is in progress", () => {
    const completions = { "2026-10-22": full, "2026-10-23": full, "2026-10-24": [0] };
    expect(currentStreak(completions, today, ALL_WEEKDAYS)).toBe(2);
  });

  it("includes today once it is complete", () => {
    const completions = { "2026-10-23": full, "2026-10-24": full };
    expect(currentStreak(completions, today, ALL_WEEKDAYS)).toBe(2);
  });

  it("breaks on an incomplete active day", () => {
    const completions = { "2026-10-21": full, "2026-10-22": [0, 1], "2026-10-23": full };
    expect(currentStreak(completions, today, ALL_WEEKDAYS)).toBe(1);
  });

  it("skips inactive weekdays without breaking", () => {
    // Weekdays only; Fri 23 and Mon 19 … Thu 22 complete, weekend inactive.
    const weekdays = [1, 2, 3, 4, 5] as const;
    const completions = { "2026-10-22": full, "2026-10-23": full };
    expect(currentStreak(completions, today, weekdays)).toBe(2);
  });

  it("is zero with no data or no active days", () => {
    expect(currentStreak({}, today, ALL_WEEKDAYS)).toBe(0);
    expect(currentStreak({ "2026-10-23": full }, today, [])).toBe(0);
  });
});

describe("weekPercent", () => {
  it("only counts active days up to today", () => {
    // Week of Sun 18 → Sat 24 Oct. Tuesday 20 Oct, 2 of 3 elapsed days (Sun, Mon, Tue).
    const tuesday = new Date(2026, 9, 20, 9);
    const completions = { "2026-10-18": full, "2026-10-19": full };
    expect(weekPercent(completions, tuesday, ALL_WEEKDAYS)).toBe(67);
  });

  it("is zero when no active day has passed yet", () => {
    const sunday = new Date(2026, 9, 18, 9);
    expect(weekPercent({}, sunday, [3])).toBe(0);
  });
});

describe("monthGrid", () => {
  it("returns a Sunday-first 6×7 grid", () => {
    const grid = monthGrid(new Date(2026, 9, 1));
    expect(grid).toHaveLength(42);
    expect(grid[0].date.getDay()).toBe(0);
    expect(grid.find((c) => c.inMonth)?.key).toBe("2026-10-01");
    expect(grid.filter((c) => c.inMonth)).toHaveLength(31);
  });
});

describe("trickStatuses", () => {
  const minutes = [528, 624, 720, 816, 912];

  it("marks done, the single next one, and pending", () => {
    expect(trickStatuses([0], minutes, 700)).toEqual(["done", "pending", "next", "pending", "pending"]);
  });

  it("has no next once every remaining trick is in the past", () => {
    expect(trickStatuses([0, 1], minutes, 1000)).toEqual(["done", "done", "pending", "pending", "pending"]);
  });

  it("skips a completed future trick when choosing next", () => {
    expect(trickStatuses([2], minutes, 650)).toEqual(["pending", "pending", "done", "next", "pending"]);
  });
});
