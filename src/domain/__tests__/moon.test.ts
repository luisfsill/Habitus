import { beforeTonight, initialSpeech, litWords, MOON_NIGHTS, moonLine, moonOf, nextNight, speechStep, VOICE_HANG_MS, wordTimeline } from "../moon";
import { BEDTIME_TRICK, TRICKS } from "../tricks";

/** `n` nights with the bedtime tip, plus a day with only other tips. */
function nights(n: number) {
  const completions: Record<string, number[]> = { "2026-01-01": [0, 1] };
  for (let i = 0; i < n; i++) completions[`2026-02-${String(i + 1).padStart(2, "0")}`] = [0, BEDTIME_TRICK];
  return completions;
}

describe("moonOf", () => {
  it("starts dark, in the first cycle", () => {
    expect(moonOf(nights(0))).toEqual({ nights: 0, cycle: 1, phase: 0, fullMoons: 0 });
  });

  it("adds a phase per night with the bedtime tip only", () => {
    expect(moonOf(nights(3))).toEqual({ nights: 3, cycle: 1, phase: 3, fullMoons: 0 });
  });

  it("is full on the 8th night, and the 9th starts a new cycle", () => {
    expect(moonOf(nights(MOON_NIGHTS))).toEqual({ nights: 8, cycle: 1, phase: 8, fullMoons: 1 });
    expect(moonOf(nights(MOON_NIGHTS + 1))).toEqual({ nights: 9, cycle: 2, phase: 1, fullMoons: 1 });
    expect(moonOf(nights(MOON_NIGHTS * 3)).fullMoons).toBe(3);
  });

  it("nextNight matches the moon with one more night", () => {
    for (const n of [0, 5, 7, 8, 15]) expect(nextNight(moonOf(nights(n)))).toEqual(moonOf(nights(n + 1)));
  });
});

describe("beforeTonight", () => {
  it("fills from the current phase, and from the dark start of the next cycle after a full moon", () => {
    expect(beforeTonight(moonOf(nights(4)))).toEqual(moonOf(nights(4)));
    expect(beforeTonight(moonOf(nights(MOON_NIGHTS)))).toMatchObject({ cycle: 2, phase: 0 });
    expect(moonLine(beforeTonight(moonOf(nights(MOON_NIGHTS))))).toBe("Lua 2 · 8 noites até a lua cheia");
  });
});

describe("moonLine", () => {
  it("names the cycle and the night, and celebrates the full moon", () => {
    expect(moonLine(moonOf(nights(0)))).toBe("Lua 1 · 8 noites até a lua cheia");
    expect(moonLine(moonOf(nights(10)))).toBe("Lua 2 · noite 2 de 8");
    expect(moonLine(moonOf(nights(8)))).toBe("Lua cheia! Sua primeira lua completa.");
    expect(moonLine(moonOf(nights(16)))).toBe("Lua cheia! Você completou 2 luas.");
  });
});

describe("wordTimeline", () => {
  const phrase = TRICKS[BEDTIME_TRICK].phrase ?? "";
  const timeline = wordTimeline(phrase);

  it("keeps every word in order, longer words taking longer", () => {
    expect(timeline.map((w) => w.word).join(" ")).toBe(phrase);
    const gaps = timeline.map((w, i) => w.endMs - (i ? timeline[i - 1].endMs : 0));
    expect(gaps[timeline.findIndex((w) => w.word === "positivamente")]).toBeGreaterThan(gaps[timeline.findIndex((w) => w.word === "me")]);
  });

  it("takes a few seconds of calm speech", () => {
    expect(timeline.at(-1)?.endMs).toBeGreaterThan(3000);
    expect(timeline.at(-1)?.endMs).toBeLessThan(6000);
  });

  it("lights the words whose time has passed", () => {
    expect(litWords(timeline, 0)).toBe(0);
    expect(litWords(timeline, timeline[1].endMs)).toBe(2);
    expect(litWords(timeline, 1e9)).toBe(timeline.length);
  });
});

describe("speechStep", () => {
  /** Feeds `level` every 33 ms for `ms`, from `state` on. */
  function feed(level: number, ms: number, holding = false, state = initialSpeech) {
    let s = state;
    const start = state.at === null ? 0 : state.at + 33;
    for (let t = start; t <= start + ms; t += 33) s = speechStep(s, t, level, holding);
    return s;
  }

  it("adds up time while there is voice", () => {
    expect(feed(0.3, 1000).ms).toBeGreaterThan(950);
  });

  it("does not count room noise", () => {
    expect(feed(0.02, 1000).ms).toBe(0);
  });

  it("counts holding the moon without voice", () => {
    expect(feed(0, 1000, true).ms).toBeGreaterThan(950);
  });

  it("bridges short gaps between syllables but pauses on silence, never going back", () => {
    const spoken = feed(0.3, 500);
    const gap = feed(0, 1500, false, spoken);
    expect(gap.ms).toBeGreaterThan(spoken.ms);
    expect(gap.ms).toBeLessThanOrEqual(spoken.ms + VOICE_HANG_MS + 33);
  });

  it("adds at most one step after a long pause between steps", () => {
    const s = speechStep(speechStep(initialSpeech, 0, 0.5, false), 10_000, 0.5, false);
    expect(s.ms).toBe(100);
  });
});
