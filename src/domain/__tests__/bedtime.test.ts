import {
  bedtimeSample,
  estimateBedtime,
  nightDayKey,
  parseBedtime,
  toNightMinutes,
  trickDayKey,
} from "../bedtime";
import { formatTime } from "../time";

const label = (m: number) => formatTime(m);
// Saturday 24 Oct 2026, 15:00.
const afternoon = new Date(2026, 9, 24, 15);

describe("night minutes", () => {
  it("moves early-morning times past midnight", () => {
    expect(toNightMinutes(30)).toBe(24 * 60 + 30);
    expect(toNightMinutes(23 * 60)).toBe(23 * 60);
  });

  it("parses plausible bedtimes only", () => {
    expect(parseBedtime("23:00")).toBe(23 * 60);
    expect(parseBedtime("00:30")).toBe(24 * 60 + 30);
    expect(parseBedtime("05:55")).toBe(29 * 60 + 55);
    expect(parseBedtime("14:00")).toBeNull();
    expect(parseBedtime("06:00")).toBeNull();
    expect(parseBedtime("xx")).toBeNull();
  });

  it("assigns after-midnight moments to the previous night", () => {
    expect(nightDayKey(new Date(2026, 9, 25, 1, 30))).toBe("2026-10-24");
    expect(nightDayKey(new Date(2026, 9, 25, 7))).toBe("2026-10-25");
    expect(trickDayKey(5, new Date(2026, 9, 25, 0, 40))).toBe("2026-10-24");
    expect(trickDayKey(2, new Date(2026, 9, 25, 0, 40))).toBe("2026-10-25");
    expect(bedtimeSample(new Date(2026, 9, 25, 0, 40))).toBe(24 * 60 + 40);
  });
});

describe("estimateBedtime", () => {
  it("starts from the user's answer", () => {
    const e = estimateBedtime("22:30", {}, {}, afternoon);
    expect(label(e.minutes)).toBe("22:30");
    expect(e.nights).toBe(0);
  });

  it("falls back to 23:00 for an invalid answer", () => {
    expect(label(estimateBedtime("13:00", {}, {}, afternoon).minutes)).toBe("23:00");
  });

  it("learns the median of past nights, across midnight", () => {
    const log = { "2026-10-21": 23 * 60 + 50, "2026-10-22": 24 * 60 + 10, "2026-10-23": 24 * 60 };
    const done = { "2026-10-21": [5], "2026-10-22": [5], "2026-10-23": [5] };
    const e = estimateBedtime("22:00", log, done, afternoon);
    expect(label(e.minutes)).toBe("00:00");
    expect(e.nights).toBe(3);
  });

  it("ignores a single late night out", () => {
    const log = { "2026-10-20": 1380, "2026-10-21": 1385, "2026-10-22": 1390, "2026-10-23": 27 * 60 };
    const done = Object.fromEntries(Object.keys(log).map((k) => [k, [5]]));
    expect(label(estimateBedtime("23:00", log, done, afternoon).minutes)).toBe("23:10");
  });

  it("uses only the last 7 nights", () => {
    const log: Record<string, number> = {};
    for (let d = 1; d <= 20; d++) log[`2026-10-${String(d).padStart(2, "0")}`] = d <= 13 ? 22 * 60 : 24 * 60;
    const done = Object.fromEntries(Object.keys(log).map((k) => [k, [5]]));
    expect(label(estimateBedtime("23:00", log, done, afternoon).minutes)).toBe("00:00");
  });

  it("does not learn from tonight before it is over", () => {
    const now = new Date(2026, 9, 25, 0, 30);
    const e = estimateBedtime("23:00", { "2026-10-24": 24 * 60 + 20 }, { "2026-10-24": [5] }, now);
    expect(e.nights).toBe(0);
  });

  it("moves earlier after nights the reminder went unanswered, up to 30 min", () => {
    const done = { "2026-10-23": [0, 1], "2026-10-22": [0], "2026-10-21": [2], "2026-10-20": [1] };
    const one = estimateBedtime("23:00", {}, { "2026-10-23": [0, 1] }, afternoon);
    expect(one.missed).toBe(1);
    expect(label(one.minutes)).toBe("22:50");
    const many = estimateBedtime("23:00", {}, done, afternoon);
    expect(many.missed).toBe(3);
    expect(label(many.minutes)).toBe("22:30");
  });

  it("does not count days the app was not used as missed", () => {
    expect(estimateBedtime("23:00", {}, { "2026-10-22": [0] }, afternoon).missed).toBe(0);
  });
});
