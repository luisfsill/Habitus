import { affirmationRanges, declaredDays, goalsLine, litAffirmations } from "../goals";
import { wordTimeline } from "../moon";
import { DEFAULT_AFFIRMATIONS } from "../tricks";

describe("declaredDays", () => {
  it("counts the days Metas em voz alta was done", () => {
    expect(declaredDays({})).toBe(0);
    expect(declaredDays({ "2026-10-01": [0, 2], "2026-10-02": [1], "2026-10-03": [2] })).toBe(2);
  });
});

describe("goalsLine", () => {
  it("shows the count and the next seal", () => {
    expect(goalsLine(0, false)).toBe("Primeiro dia · próximo selo aos 7");
    expect(goalsLine(1, true)).toBe("Metas declaradas em 1 dia · próximo selo aos 7");
    expect(goalsLine(12, false)).toBe("Metas declaradas em 12 dias · próximo selo aos 21");
    expect(goalsLine(70, false)).toBe("Metas declaradas em 70 dias · todos os selos");
  });

  it("celebrates a seal on the day it is reached", () => {
    expect(goalsLine(21, true)).toBe("Selo de 21 dias! Suas metas, ditas em voz alta.");
    expect(goalsLine(21, false)).toBe("Metas declaradas em 21 dias · próximo selo aos 66");
  });
});

describe("affirmationRanges", () => {
  it("splits the joined text the way wordTimeline does", () => {
    const ranges = affirmationRanges(DEFAULT_AFFIRMATIONS);
    expect(ranges).toEqual([
      [0, 2],
      [2, 4],
      [4, 6],
    ]);
    expect(ranges.at(-1)?.[1]).toBe(wordTimeline(DEFAULT_AFFIRMATIONS.join(" ")).length);
  });

  it("counts the affirmations whose last word is lit", () => {
    const ranges = affirmationRanges(["Sou forte.", "Tenho uma vida leve."]);
    expect(litAffirmations(ranges, 1)).toBe(0);
    expect(litAffirmations(ranges, 2)).toBe(1);
    expect(litAffirmations(ranges, 6)).toBe(2);
  });
});
