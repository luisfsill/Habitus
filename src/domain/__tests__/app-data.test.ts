import { completedKeys, defaultData, sanitizeData, withCompletion } from "../app-data";
import { contentData, interpretResponse, toPermissionState } from "../notification-actions";
import { formatCountdown, formatTime, parseTime } from "../time";

describe("sanitizeData", () => {
  it("falls back to defaults for garbage", () => {
    expect(sanitizeData(null)).toEqual(defaultData());
    expect(sanitizeData("x")).toEqual(defaultData());
    expect(sanitizeData({ version: 2 })).toEqual(defaultData());
  });

  it("defaults to 08:00–16:00, every day", () => {
    const { settings } = defaultData();
    expect([settings.start, settings.end]).toEqual(["08:00", "16:00"]);
    expect(settings.days).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("drops invalid fields but keeps valid ones", () => {
    const data = sanitizeData({
      version: 1,
      onboarded: true,
      settings: { start: "25:00", end: "17:30", days: [1, 9, 1, "2"], affirmations: ["  Sou forte ", "", 3], sound: "yes" },
      completions: { "2026-10-24": [0, 0, 7, 2], bad: [1] },
      gratitude: { "2026-10-24": " Obrigado ", "2026-10-25": "" },
    });
    expect(data.onboarded).toBe(true);
    expect(data.settings).toEqual({ start: "08:00", end: "17:30", days: [1], affirmations: ["Sou forte"], sound: true });
    expect(data.completions).toEqual({ "2026-10-24": [0, 2] });
    expect(data.gratitude).toEqual({ "2026-10-24": "Obrigado" });
  });
});

describe("withCompletion", () => {
  it("is idempotent and ignores invalid indices", () => {
    const once = withCompletion(defaultData(), "2026-10-24", 3);
    expect(withCompletion(once, "2026-10-24", 3)).toBe(once);
    expect(withCompletion(once, "2026-10-24", 9)).toBe(once);
    expect(completedKeys(once.completions)).toEqual(new Set(["2026-10-24:3"]));
  });
});

describe("interpretResponse", () => {
  const data = { kind: "trick", dayKey: "2026-10-24", trickIndex: 1 };

  it("maps actions to intents", () => {
    expect(interpretResponse("done", data)).toEqual({ type: "done", trickIndex: 1, dayKey: "2026-10-24" });
    expect(interpretResponse("snooze", data)).toEqual({ type: "snooze", trickIndex: 1, dayKey: "2026-10-24" });
    expect(interpretResponse("expo.modules.notifications.actions.DEFAULT", data)).toMatchObject({ type: "open-trick" });
  });

  it("opens Today for the opening notification or bad payloads", () => {
    expect(interpretResponse("default", { kind: "opening", dayKey: "2026-10-24" })).toEqual({ type: "open-today" });
    expect(interpretResponse("done", { kind: "trick", dayKey: "x", trickIndex: 8 })).toEqual({ type: "open-today" });
    expect(interpretResponse("done", undefined)).toEqual({ type: "open-today" });
  });
});

describe("time helpers", () => {
  it("round-trips HH:MM", () => {
    expect(formatTime(parseTime("07:05") ?? -1)).toBe("07:05");
  });
});

describe("formatCountdown", () => {
  it("switches format at one hour and never goes negative", () => {
    expect(formatCountdown(3_900_000)).toBe("1 h 05 min");
    expect(formatCountdown(725_000)).toBe("12:05");
    expect(formatCountdown(-5)).toBe("0:00");
  });
});

describe("toPermissionState", () => {
  it("treats Android 13+ 'denied but can ask' as not asked yet", () => {
    expect(toPermissionState({ granted: false, canAskAgain: true })).toBe("undetermined");
    expect(toPermissionState({ granted: false, canAskAgain: false })).toBe("denied");
    expect(toPermissionState({ granted: true, canAskAgain: true })).toBe("granted");
  });
});

describe("contentData", () => {
  const payload = { kind: "trick", dayKey: "2026-10-24", trickIndex: 1 };

  it("reads content.data (JS listener) and content.dataString (Android headless task)", () => {
    expect(contentData({ data: payload })).toEqual(payload);
    expect(contentData({ dataString: JSON.stringify(payload) })).toEqual(payload);
    expect(interpretResponse("done", contentData({ dataString: JSON.stringify(payload) }))).toMatchObject({ type: "done" });
  });

  it("ignores missing or broken payloads", () => {
    expect(contentData(null)).toBeUndefined();
    expect(contentData({ dataString: "{oops" })).toBeUndefined();
  });
});
