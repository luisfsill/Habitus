import { FIGURES } from "../constellation-figures";
import { closesConstellation, CONSTELLATION_DAYS, constellationName, linkOrder, SKY_DAYS, skyExtent, skyOf, starDate, starPlace } from "../sky";

it("closesConstellation is true on every 7th star, a week, up to the 52nd constellation", () => {
  expect([0, 1, 6, 7, 8, 14, 364, 365, 371].filter(closesConstellation)).toEqual([7, 14, 364]);
});

it("starDate writes the day in short Portuguese", () => {
  expect(starDate("2026-10-14")).toBe("14 out 2026");
});

/** `n` phrases on consecutive days from 2025-01-01. */
function phrases(n: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < n; i++) {
    const d = new Date(2025, 0, 1 + i);
    out[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`] = `frase ${i}`;
  }
  return out;
}

describe("skyOf", () => {
  it("starts empty, in year 1", () => {
    const sky = skyOf({});
    expect(sky).toMatchObject({ year: 1, stars: [], constellations: 0, lines: [], nextIn: CONSTELLATION_DAYS, complete: false });
  });

  it("puts one star per day, oldest first, with its phrase", () => {
    const sky = skyOf({ "2025-03-02": "b", "2025-03-01": "a" });
    expect(sky.stars.map((s) => [s.day, s.text])).toEqual([
      ["2025-03-01", "a"],
      ["2025-03-02", "b"],
    ]);
  });

  it("forms a constellation every 7 days, with lines joining its stars", () => {
    expect(skyOf(phrases(6))).toMatchObject({ constellations: 0, nextIn: 1, lines: [] });
    const sky = skyOf(phrases(7));
    expect(sky.constellations).toBe(1);
    expect(sky.nextIn).toBe(7);
    expect(sky.lines).toEqual(FIGURES[0].edges);
    expect(sky.lines.flat().every((i) => i < 7)).toBe(true);
  });

  it("is complete at 365 stars, with 52 constellations", () => {
    const sky = skyOf(phrases(SKY_DAYS));
    expect(sky).toMatchObject({ year: 1, constellations: 52, complete: true, nextIn: 0 });
    expect(sky.stars).toHaveLength(SKY_DAYS);
  });

  it("starts the sky of year 2 on the 366th day", () => {
    const sky = skyOf(phrases(SKY_DAYS + 3));
    expect(sky.year).toBe(2);
    expect(sky.stars.map((s) => s.text)).toEqual(["frase 365", "frase 366", "frase 367"]);
  });
});

describe("star places", () => {
  it("stay the same for the same day of the year", () => {
    expect(starPlace(42)).toEqual(starPlace(42));
    expect(skyOf(phrases(SKY_DAYS + 1)).stars[0]).toMatchObject(starPlace(0));
  });

  it("stay inside the sky", () => {
    for (let i = 0; i < SKY_DAYS; i++) {
      const s = starPlace(i);
      expect(Math.abs(s.x)).toBeLessThan(1);
      expect(Math.abs(s.y)).toBeLessThan(1.45);
      expect(s.size).toBeGreaterThanOrEqual(0.3);
      expect(s.size).toBeLessThanOrEqual(1);
    }
  });

  it("grow outwards, so the view opens up as the year goes on", () => {
    const view = (n: number) => skyExtent(skyOf(phrases(n)).stars);
    expect(view(1)).toBeLessThan(view(90));
    expect(view(90)).toBeLessThan(view(SKY_DAYS));
    expect(view(0)).toBe(0.2);
  });
});

describe("constellation figures", () => {
  it("each has one point per day of the week and lines between its own points", () => {
    for (const f of FIGURES) {
      expect(f.points).toHaveLength(CONSTELLATION_DAYS);
      expect(f.edges.flat().every((p) => p >= 0 && p < CONSTELLATION_DAYS)).toBe(true);
    }
  });

  it("names a star's constellation only once its week is complete", () => {
    expect(constellationName(skyOf(phrases(6)), 0)).toBeUndefined();
    const sky = skyOf(phrases(8));
    expect(constellationName(sky, 3)).toBe("Peixe");
    expect(constellationName(sky, 7)).toBeUndefined();
  });
});

describe("linkOrder", () => {
  // A path 0-1-2-3 with a branch 1-4, and 5-6 cut off from the rest.
  const lines: [number, number][] = [[0, 1], [1, 2], [2, 3], [1, 4], [5, 6]];

  it("links outward from the touched star, each line from the nearer end", () => {
    const steps = linkOrder(lines, 2).map((l) => `${l.from}>${l.to}@${l.step}`);
    expect(steps).toEqual(expect.arrayContaining(["2>1@0", "2>3@0", "1>0@1", "1>4@1"]));
  });

  it("keeps every line, the unreachable ones last", () => {
    const links = linkOrder(lines, 0);
    expect(links).toHaveLength(lines.length);
    expect(links.at(-1)).toEqual({ from: 5, to: 6, step: 3 });
  });

  it("reaches every line of every figure from any of its stars", () => {
    for (const f of FIGURES)
      for (let o = 0; o < CONSTELLATION_DAYS; o++) {
        const touched = f.edges.some(([a, b]) => a === o || b === o);
        if (touched) expect(linkOrder(f.edges, o).every((l) => l.step <= CONSTELLATION_DAYS)).toBe(true);
      }
  });
});
