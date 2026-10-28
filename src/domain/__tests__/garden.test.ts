import { FLOWERS_PER_SPECIES, flowersOf, gardenLine, initialSmile, SMILE_HANG_MS, smileStep, speciesOf, SPECIES } from "../garden";

describe("flowersOf", () => {
  it("counts the days Sorria was done", () => {
    expect(flowersOf({})).toBe(0);
    expect(flowersOf({ "2026-10-01": [0, 1], "2026-10-02": [2], "2026-10-03": [0] })).toBe(2);
  });
});

describe("speciesOf", () => {
  it("changes species every 7 flowers and comes round again", () => {
    expect(speciesOf(0).name).toBe("Margarida");
    expect(speciesOf(FLOWERS_PER_SPECIES).name).toBe("Girassol");
    expect(speciesOf(FLOWERS_PER_SPECIES * SPECIES.length).name).toBe("Margarida");
  });
});

describe("gardenLine", () => {
  it("counts the flowers and the days to the next species", () => {
    expect(gardenLine(0, false)).toBe("Sua campina está esperando a primeira flor");
    expect(gardenLine(1, true)).toBe("1 flor · Girassol em 7 dias");
    expect(gardenLine(6, false)).toBe("6 flores · Girassol em 2 dias");
    expect(gardenLine(7, false)).toBe("7 flores · Girassol em 1 dia");
  });

  it("celebrates the first flower of a new species on the day it is planted", () => {
    expect(gardenLine(8, true)).toBe("Nova espécie na campina: Girassol!");
    expect(gardenLine(8, false)).toBe("8 flores · Lavanda em 7 dias");
  });
});

describe("smileStep", () => {
  function feed(score: number, ms: number, holding = false, state = initialSmile) {
    let s = state;
    const start = state.at === null ? 0 : state.at + 100;
    for (let t = start; t <= start + ms; t += 100) s = smileStep(s, t, score, holding);
    return s;
  }

  it("adds up time while smiling, not while serious", () => {
    expect(feed(0.8, 2000).ms).toBe(2000);
    expect(feed(0.1, 2000).ms).toBe(0);
  });

  it("bridges a flicker but pauses when the smile goes", () => {
    const smiled = feed(0.8, 1000);
    const after = feed(0, 2000, false, smiled);
    expect(after.ms - smiled.ms).toBeLessThanOrEqual(SMILE_HANG_MS + 100);
  });

  it("counts holding without a camera", () => {
    expect(feed(0, 1000, true).ms).toBe(1000);
  });
});
