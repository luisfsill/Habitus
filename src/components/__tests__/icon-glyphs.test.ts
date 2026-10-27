/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { GLYPHS } from "../icon-glyphs";

// The web icon font holds only the glyphs listed in icon-glyphs.ts. A name missing there renders blank on the web.
const symbols = JSON.parse(readFileSync("node_modules/expo-symbols/build/android/symbols.json", "utf8")) as Record<string, number>;

function usedNames(dir: string, found = new Set<string>()): Set<string> {
  for (const file of readdirSync(dir)) {
    const path = join(dir, file);
    if (statSync(path).isDirectory()) usedNames(path, found);
    else if (/\.tsx?$/.test(file) && !/\.test\./.test(file) && file !== "icon-glyphs.ts")
      for (const [, name] of readFileSync(path, "utf8").matchAll(/"([a-z0-9_]+)"/g)) if (name in symbols) found.add(name);
  }
  return found;
}

test("every Material Symbol named in src is in the web icon font (else run node scripts/build-icon-font.mjs)", () => {
  const missing = [...usedNames("src")].filter((name) => !(name in GLYPHS));
  expect(missing).toEqual([]);
});

test("glyph code points match expo-symbols", () => {
  for (const [name, code] of Object.entries(GLYPHS)) expect(code).toBe(symbols[name]);
});
