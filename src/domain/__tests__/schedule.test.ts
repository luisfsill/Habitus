import { computeSchedule, greetingFor, MIN_WINDOW_MINUTES, sliceCenters, trickTimeLabels } from "../schedule";
import { ALL_WEEKDAYS, parseTime } from "../time";

/** Labels of the five day tricks (the sixth is the bedtime one). */
function labels(start: string, end: string) {
  const result = computeSchedule(start, end, ALL_WEEKDAYS);
  if (!result.ok) throw new Error(result.message);
  return trickTimeLabels(result.schedule).slice(0, 5);
}

describe("computeSchedule", () => {
  it("spreads 08:00–16:00 at the centre of five slices", () => {
    expect(labels("08:00", "16:00")).toEqual(["08:48", "10:24", "12:00", "13:36", "15:12"]);
  });

  it("puts the opening notification at the start of the window", () => {
    const result = computeSchedule("08:00", "16:00", ALL_WEEKDAYS);
    expect(result.ok && result.schedule.openingMinutes).toBe(8 * 60);
  });

  it("accepts exactly the 1-hour minimum", () => {
    expect(labels("09:00", "10:00")).toEqual(["09:06", "09:18", "09:30", "09:42", "09:54"]);
  });

  it("rejects a window one minute shorter than the minimum", () => {
    const result = computeSchedule("09:00", "09:59", ALL_WEEKDAYS);
    expect(result).toMatchObject({ ok: false, error: "window-too-short" });
    expect(MIN_WINDOW_MINUTES).toBe(60);
  });

  it("rejects end equal to start", () => {
    expect(computeSchedule("08:00", "08:00", ALL_WEEKDAYS)).toMatchObject({ ok: false, error: "end-before-start" });
  });

  it("rejects end before start (no overnight windows)", () => {
    expect(computeSchedule("22:00", "06:00", ALL_WEEKDAYS)).toMatchObject({ ok: false, error: "end-before-start" });
  });

  it.each(["8:00", "24:00", "12:60", "", "abc", "12:5"])("rejects malformed time %p", (bad) => {
    expect(computeSchedule(bad, "16:00", ALL_WEEKDAYS)).toMatchObject({ ok: false, error: "invalid-time" });
    expect(computeSchedule("08:00", bad, ALL_WEEKDAYS)).toMatchObject({ ok: false, error: "invalid-time" });
  });

  it("rejects an empty day list", () => {
    expect(computeSchedule("08:00", "16:00", [])).toMatchObject({ ok: false, error: "no-days" });
  });

  it("sorts and de-duplicates days", () => {
    const result = computeSchedule("08:00", "16:00", [5, 1, 1, 3]);
    expect(result.ok && result.schedule.days).toEqual([1, 3, 5]);
  });

  it("handles the widest possible window 00:00–23:59", () => {
    const times = labels("00:00", "23:59");
    expect(times).toEqual(["02:24", "07:12", "12:00", "16:47", "21:35"]);
  });

  it("rounds uneven slices to the nearest minute and keeps them in order", () => {
    // 61 minutes → slices of 12.2 min, centres at 6.1, 18.3, 30.5, 42.7, 54.9
    expect(labels("10:00", "11:01")).toEqual(["10:06", "10:18", "10:31", "10:43", "10:55"]);
  });

  it("returns a clear Portuguese message on error", () => {
    const result = computeSchedule("16:00", "08:00", ALL_WEEKDAYS);
    expect(!result.ok && result.message).toBe("O horário de fim precisa ser depois do início.");
  });

  it("keeps every trick strictly inside the window", () => {
    const result = computeSchedule("07:30", "08:30", ALL_WEEKDAYS);
    if (!result.ok) throw new Error();
    for (const m of result.schedule.trickMinutes.slice(0, 5)) {
      expect(m).toBeGreaterThan(parseTime("07:30") ?? Infinity);
      expect(m).toBeLessThan(parseTime("08:30") ?? -Infinity);
    }
  });
});

describe("bedtime trick", () => {
  it("is the sixth time, 23:00 by default", () => {
    const result = computeSchedule("08:00", "16:00", ALL_WEEKDAYS);
    expect(result.ok && trickTimeLabels(result.schedule)[5]).toBe("23:00");
  });

  it("uses the given bedtime, after midnight too", () => {
    const result = computeSchedule("08:00", "16:00", ALL_WEEKDAYS, 24 * 60 + 30);
    expect(result.ok && result.schedule.trickMinutes[5]).toBe(24 * 60 + 30);
  });

  it("never comes before 30 min after the window ends", () => {
    const result = computeSchedule("14:00", "23:00", ALL_WEEKDAYS, 22 * 60);
    expect(result.ok && trickTimeLabels(result.schedule)[5]).toBe("23:30");
  });
});

describe("sliceCenters", () => {
  it("returns the centre of each slice", () => {
    expect(sliceCenters(0, 10, 5)).toEqual([1, 3, 5, 7, 9]);
  });
});

describe("greetingFor", () => {
  it("matches the time of day", () => {
    expect(greetingFor(8 * 60)).toBe("Bom dia");
    expect(greetingFor(12 * 60)).toBe("Boa tarde");
    expect(greetingFor(19 * 60)).toBe("Boa noite");
  });
});
