import { type AppData, defaultData, sanitizeData } from "../app-data";
import { mergeData } from "../sync";

function data(patch: Partial<AppData>): AppData {
  return { ...defaultData(), ...patch };
}

describe("mergeData", () => {
  it("unites completions per day", () => {
    const local = data({ completions: { "2026-10-25": [0, 2] } });
    const remote = data({ completions: { "2026-10-25": [2, 1], "2026-10-24": [3] } });
    expect(mergeData(local, remote).completions).toEqual({ "2026-10-25": [0, 1, 2], "2026-10-24": [3] });
  });

  it("keeps the local gratitude and sleep log on the same day", () => {
    const local = data({ gratitude: { "2026-10-25": "local" }, sleepLog: { "2026-10-25": 1400 } });
    const remote = data({ gratitude: { "2026-10-25": "remoto", "2026-10-24": "outro" }, sleepLog: { "2026-10-25": 1300, "2026-10-24": 1350 } });
    const merged = mergeData(local, remote);
    expect(merged.gratitude).toEqual({ "2026-10-25": "local", "2026-10-24": "outro" });
    expect(merged.sleepLog).toEqual({ "2026-10-25": 1400, "2026-10-24": 1350 });
  });

  it("takes the settings with the newer settingsUpdatedAt, local on a tie", () => {
    const at = (start: string, settingsUpdatedAt: number) => data({ settings: { ...defaultData().settings, start }, settingsUpdatedAt });
    expect(mergeData(at("07:00", 200), at("09:00", 100)).settings.start).toBe("07:00");
    const newer = mergeData(at("07:00", 200), at("09:00", 300));
    expect(newer.settings.start).toBe("09:00");
    expect(newer.settingsUpdatedAt).toBe(300);
    expect(mergeData(at("07:00", 200), at("09:00", 200)).settings.start).toBe("07:00");
  });

  it("is onboarded when either side is", () => {
    expect(mergeData(data({ onboarded: false }), data({ onboarded: true })).onboarded).toBe(true);
    expect(mergeData(data({ onboarded: false }), data({ onboarded: false })).onboarded).toBe(false);
  });
});

describe("settingsUpdatedAt", () => {
  it("defaults to 0 when missing or invalid", () => {
    expect(defaultData().settingsUpdatedAt).toBe(0);
    expect(sanitizeData({ ...defaultData(), settingsUpdatedAt: undefined }).settingsUpdatedAt).toBe(0);
    expect(sanitizeData({ ...defaultData(), settingsUpdatedAt: -5 }).settingsUpdatedAt).toBe(0);
    expect(sanitizeData({ ...defaultData(), settingsUpdatedAt: 1234 }).settingsUpdatedAt).toBe(1234);
  });
});
