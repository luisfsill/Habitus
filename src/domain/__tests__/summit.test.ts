import { altitudeOf, breathingIn, BREATH_MS, climbStep, initialClimb, METERS_PER_SESSION, paused, peakAt, SHAKE_PAUSE_MS, summitLine } from "../summit";

describe("altitudeOf", () => {
  it("adds METERS_PER_SESSION per day of Postura de poder", () => {
    expect(altitudeOf({})).toBe(0);
    expect(altitudeOf({ "2026-10-01": [1, 2], "2026-10-02": [0], "2026-10-03": [1] })).toBe(2 * METERS_PER_SESSION);
  });
});

describe("summitLine", () => {
  it("names the next peak", () => {
    expect(summitLine(0, 300)).toBe("300 m · próximo: Pão de Açúcar (396 m)");
    expect(summitLine(3000, 3300)).toBe("3.300 m · próximo: Mont Blanc (4.806 m)");
  });

  it("celebrates a peak on the session that reaches it", () => {
    expect(summitLine(300, 600)).toBe("Cume: Pão de Açúcar! 396 m");
    expect(summitLine(8700, 9000)).toBe("Cume: Everest! 8.849 m");
  });

  it("says when every peak is behind", () => {
    expect(summitLine(9000, 9300)).toBe("9.300 m · todos os picos conquistados");
    expect(peakAt(100)).toBeUndefined();
  });
});

describe("breathingIn", () => {
  it("breathes in for half the breath and out for the other half", () => {
    expect(breathingIn(0)).toBe(true);
    expect(breathingIn(BREATH_MS / 2)).toBe(false);
    expect(breathingIn(BREATH_MS + 1)).toBe(true);
  });
});

describe("climbStep", () => {
  function feed(shake: number, ms: number, state = initialClimb) {
    let s = state;
    const start = state.at === null ? 0 : state.at + 100;
    for (let t = start; t <= start + ms; t += 100) s = climbStep(s, t, shake);
    return s;
  }

  it("climbs while standing firm", () => {
    expect(feed(0.05, 2000).ms).toBe(2000);
  });

  it("pauses for a moment after a shake, then goes on", () => {
    const shaken = feed(0.8, 0, feed(0, 1000));
    expect(paused(shaken, (shaken.at ?? 0) + 100)).toBe(true);
    const after = feed(0, SHAKE_PAUSE_MS + 1000, shaken);
    expect(after.ms).toBeGreaterThan(shaken.ms);
    expect(after.ms - shaken.ms).toBeLessThanOrEqual(1000 + 200);
  });

  it("adds at most a step after a long gap", () => {
    expect(climbStep(climbStep(initialClimb, 0, 0), 60_000, 0).ms).toBe(250);
  });
});
