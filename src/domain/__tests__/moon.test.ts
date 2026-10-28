import {
  beforeTonight,
  HOLD_LONG_MS,
  HOLD_SHORT_MS,
  holdRate,
  holdStep,
  holdWordMs,
  initialSpeech,
  litWords,
  MOON_NIGHTS,
  moonLine,
  moonOf,
  msForWords,
  nextNight,
  normalizeWord,
  sameWord,
  spokenWords,
  wordTimeline,
} from "../moon";
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

describe("spokenWords", () => {
  const timeline = wordTimeline(TRICKS[BEDTIME_TRICK].phrase ?? "");

  it("lights the words said in order, ignoring case, accents and punctuation", () => {
    expect(spokenWords(timeline, "")).toBe(0);
    expect(spokenWords(timeline, "deus universo")).toBe(2);
    expect(spokenWords(timeline, "Deus Universo Vida me surpreenda positivamente amanha")).toBe(timeline.length);
  });

  it("does not advance on a wrong word, and goes on once the right one comes", () => {
    expect(spokenWords(timeline, "deus universo azul verde vermelho")).toBe(2);
    expect(spokenWords(timeline, "deus universo azul vida")).toBe(3);
  });

  it("takes a hyphenated word said in two", () => {
    const sou = wordTimeline("Sou bem-sucedido.");
    expect(spokenWords(sou, "sou bem sucedido")).toBe(2);
    expect(spokenWords(sou, "sou bem-sucedido")).toBe(2);
  });

  it("does not light a later word said out of order", () => {
    expect(spokenWords(timeline, "vida deus")).toBe(1);
  });

  it("allows a small slip on long words only", () => {
    expect(sameWord("surpreende", "surpreenda")).toBe(true);
    expect(sameWord("positivament", "positivamente")).toBe(true);
    expect(sameWord("eu", "me")).toBe(false);
    expect(sameWord("adeus", "Deus,")).toBe(false);
    expect(normalizeWord("Amanhã.”")).toBe("amanha");
  });

  it("msForWords lights exactly that many words", () => {
    for (const n of [0, 1, 4, timeline.length]) expect(litWords(timeline, msForWords(timeline, n))).toBe(n);
  });
});

describe("holdStep", () => {
  it("lights short words in HOLD_SHORT_MS and longer ones in HOLD_LONG_MS while held", () => {
    const timeline = wordTimeline(TRICKS[BEDTIME_TRICK].phrase ?? "");
    let s = initialSpeech;
    const litAt: number[] = [];
    for (let t = 0; litWords(timeline, s.ms) < timeline.length && t < 60_000; t += 33) {
      s = holdStep(s, t, holdRate(timeline, s.ms));
      if (litWords(timeline, s.ms) > litAt.length) litAt.push(t);
    }
    const gaps = litAt.map((t, i) => t - (i ? litAt[i - 1] : 0));
    gaps.forEach((gap, i) => expect(Math.abs(gap - holdWordMs(timeline[i].word))).toBeLessThan(120));
    expect(timeline.filter((w) => holdWordMs(w.word) === HOLD_SHORT_MS).map((w) => normalizeWord(w.word))).toEqual(["deus", "vida", "me"]);
    expect(holdWordMs("positivamente")).toBe(HOLD_LONG_MS);
  });

  it("pauses when let go and adds at most one step after a long gap", () => {
    expect(holdStep(holdStep(initialSpeech, 0, 0), 500, 0).ms).toBe(0);
    expect(holdStep(holdStep(initialSpeech, 0, 1), 10_000, 1).ms).toBe(100);
  });
});
