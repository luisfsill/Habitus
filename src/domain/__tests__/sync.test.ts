import { type AppData, defaultData, sanitizeData } from "../app-data";
import { claimData, mergeData } from "../sync";

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
  it("defaults owner to null and resetAt to 0", () => {
    expect(defaultData().owner).toBeNull();
    expect(sanitizeData({ ...defaultData(), owner: 7 }).owner).toBeNull();
    expect(sanitizeData({ ...defaultData(), owner: "u1" }).owner).toBe("u1");
    expect(sanitizeData({ ...defaultData(), resetAt: "x" }).resetAt).toBe(0);
  });

  it("defaults to 0 when missing or invalid", () => {
    expect(defaultData().settingsUpdatedAt).toBe(0);
    expect(sanitizeData({ ...defaultData(), settingsUpdatedAt: undefined }).settingsUpdatedAt).toBe(0);
    expect(sanitizeData({ ...defaultData(), settingsUpdatedAt: -5 }).settingsUpdatedAt).toBe(0);
    expect(sanitizeData({ ...defaultData(), settingsUpdatedAt: 1234 }).settingsUpdatedAt).toBe(1234);
  });
});

describe("mergeData with a changed bedtime", () => {
  const withBed = (bedtime: string, settingsUpdatedAt: number, sleepLog: Record<string, number>) =>
    data({ settings: { ...defaultData().settings, bedtime }, settingsUpdatedAt, sleepLog });

  it("keeps only the winning side's sleep log, so learning restarts", () => {
    expect(mergeData(withBed("22:00", 300, {}), withBed("23:00", 100, { "2026-10-24": 1400 })).sleepLog).toEqual({});
    expect(mergeData(withBed("22:00", 100, { "2026-10-25": 1330 }), withBed("23:00", 300, { "2026-10-24": 1400 })).sleepLog).toEqual({
      "2026-10-24": 1400,
    });
  });
});

describe("mergeData after Resetar dados", () => {
  it("drops everything from the side that has not seen the newer reset", () => {
    const reset = data({ resetAt: 500 });
    const old = data({ onboarded: true, completions: { "2026-10-24": [1] }, gratitude: { "2026-10-24": "x" }, settingsUpdatedAt: 900 });
    expect(mergeData(reset, old)).toEqual(reset);
    expect(mergeData(old, reset)).toEqual(reset);
  });
});

describe("claimData", () => {
  it("keeps data that belongs to the user or to nobody, tagging it", () => {
    const mine = data({ owner: "a", onboarded: true });
    expect(claimData(mine, "a")).toEqual(mine);
    expect(claimData(data({ owner: null, onboarded: true }), "a")).toEqual(data({ owner: "a", onboarded: true }));
  });

  it("discards another account's data", () => {
    expect(claimData(data({ owner: "b", onboarded: true, gratitude: { d: "privado" } }), "a")).toEqual(data({ owner: "a" }));
  });
});
