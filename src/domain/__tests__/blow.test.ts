import { BLOW_OUT, BLOW_OUT_FLOOR, BLOW_OUT_MS, BLOW_WEAK_MS, type BlowState, blowThreshold, initialBlow, judgeBlow } from "../blow";

/** Feeds `level` every 33 ms for `ms` from `start`; returns the final state and the events seen. */
function feed(state: BlowState, level: number, start: number, ms: number) {
  const events: string[] = [];
  let s = state;
  for (let t = start; t <= start + ms; t += 33) {
    const r = judgeBlow(s, level, t);
    s = r.state;
    if (r.event) events.push(r.event);
  }
  return { state: s, events };
}

describe("judgeBlow", () => {
  it("puts the fire out after a strong blow held long enough", () => {
    expect(feed(initialBlow, 0.8, 0, BLOW_OUT_MS + 40).events).toContain("out");
  });

  it("ignores a strong blow that is too short", () => {
    expect(feed(initialBlow, 0.8, 0, 100).events).toEqual([]);
  });

  it("ignores room noise", () => {
    const r = feed(initialBlow, 0.05, 0, 2000);
    expect(r.events).toEqual([]);
    expect(r.state.attempts).toBe(0);
  });

  it("counts a weak blow once, however long it lasts", () => {
    const r = feed(initialBlow, 0.3, 0, 3000);
    expect(r.events).toEqual(["attempt"]);
    expect(r.state.attempts).toBe(1);
  });

  it("counts separate weak blows separately", () => {
    let r = feed(initialBlow, 0.3, 0, BLOW_WEAK_MS + 100);
    r = feed(r.state, 0, 1000, 200);
    r = feed(r.state, 0.3, 2000, BLOW_WEAK_MS + 100);
    expect(r.state.attempts).toBe(2);
  });

  it("makes it easier after each attempt, down to a floor", () => {
    expect(blowThreshold(0)).toBe(BLOW_OUT);
    expect(blowThreshold(1)).toBeLessThan(BLOW_OUT);
    expect(blowThreshold(100)).toBe(BLOW_OUT_FLOOR);
  });

  it("lets a gentle blower get there after a few tries", () => {
    let s = initialBlow;
    for (let i = 0; i < 4; i++) s = feed(feed(s, 0.4, i * 2000, 500).state, 0, i * 2000 + 600, 200).state;
    expect(feed(s, 0.4, 10000, BLOW_OUT_MS + 40).events).toContain("out");
  });
});
