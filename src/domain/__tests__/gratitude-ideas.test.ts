import { MAX_TEXT_LENGTH } from "../app-data";
import { GRATITUDE_AREAS, gratitudePhrase, MAX_PARTS, toggleIdea } from "../gratitude-ideas";

describe("gratitudePhrase", () => {
  it("is empty without ideas", () => {
    expect(gratitudePhrase([])).toBe("");
  });

  it("joins the ideas with commas and a final e", () => {
    expect(gratitudePhrase(["acordo com energia"])).toBe("Obrigado porque já acordo com energia.");
    expect(gratitudePhrase(["a", "b"])).toBe("Obrigado porque já a e b.");
    expect(gratitudePhrase(["a", "b", "c"])).toBe("Obrigado porque já a, b e c.");
  });
});

describe("toggleIdea", () => {
  it("adds an idea and removes it on a second tap", () => {
    const one = toggleIdea([], "a");
    expect(one).toEqual(["a"]);
    expect(toggleIdea(one, "a")).toEqual([]);
  });

  it("stops at five ideas", () => {
    let parts: readonly string[] = [];
    for (const idea of ["a", "b", "c", "d", "e", "f"]) parts = toggleIdea(parts, idea);
    expect(parts).toEqual(["a", "b", "c", "d", "e"]);
    expect(MAX_PARTS).toBe(5);
  });

  it("refuses an idea that would make the phrase too long to save", () => {
    const long = "x".repeat(150);
    expect(toggleIdea([long], "y".repeat(60))).toEqual([long]);
  });

  it("always fits the five longest ideas", () => {
    const longest = GRATITUDE_AREAS.flatMap((a) => a.ideas)
      .sort((a, b) => b.length - a.length)
      .slice(0, MAX_PARTS);
    expect(gratitudePhrase(longest).length).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
  });
});
