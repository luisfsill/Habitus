import { createSea } from "../ui/sea-life";
import { roam, steer } from "../ui/sea-roam";

describe("createSea", () => {
  it("keeps animals coming and going, with finite positions, and sends a shark across", () => {
    const sea = createSea();
    let sawShark = false;
    let most = 0;
    // Ten minutes at 30 frames a second on a phone screen.
    for (let t = 0; t < 600; t += 1 / 30) {
      sea.step(1 / 30, 390, 844, t);
      const now = sea.critters();
      expect(now.every((c) => Number.isFinite(c.x) && Number.isFinite(c.y))).toBe(true);
      most = Math.max(most, now.length);
      sawShark ||= sea.shark[2] !== 0;
    }
    expect(most).toBeGreaterThan(0);
    // The cap stops new groups; one more school may still join on top of it.
    expect(most).toBeLessThan(26 + 18);
    expect(sawShark).toBe(true);
  });
});

describe("steer", () => {
  it("wanders on screen, then swims away", () => {
    const fish = { x: -20, y: 400, size: 40, speed: 35, dir: 1 as 1 | -1 };
    const r = roam(1, 35);
    while (!r.leaving) {
      steer(fish, r, 1 / 30, 390, 844);
      if (r.life < 10) {
        expect(fish.x).toBeGreaterThan(-60);
        expect(fish.x).toBeLessThan(450);
      }
    }
    for (let i = 0; i < 30 * 60; i++) steer(fish, r, 1 / 30, 390, 844);
    expect(fish.x < -40 || fish.x > 430).toBe(true);
  });
});
