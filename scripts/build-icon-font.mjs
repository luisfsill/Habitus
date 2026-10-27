// Gera a fonte de ícones da web só com os Material Symbols que o app usa: node scripts/build-icon-font.mjs
// A fonte completa tem ~970 KB; o subconjunto tem poucos KB e os ícones aparecem logo na primeira visita.
// Precisa de Python com fontTools (pip install fonttools). Rode de novo ao usar um ícone novo:
// o teste src/components/__tests__/icon-glyphs.test.ts acusa quando falta.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Same font and code points expo-symbols uses (its package exports hide these paths, so read them directly).
const symbols = JSON.parse(readFileSync("node_modules/expo-symbols/build/android/symbols.json", "utf8"));
const source = "node_modules/@expo-google-fonts/material-symbols/400Regular/MaterialSymbols_400Regular.ttf";

// Every string literal in src that names a Material Symbol: a few extra glyphs cost less than a blank icon.
const names = new Set();
(function walk(dir) {
  for (const file of readdirSync(dir)) {
    const path = join(dir, file);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.tsx?$/.test(file) && !/\.test\./.test(file) && file !== "icon-glyphs.ts")
      for (const [, name] of readFileSync(path, "utf8").matchAll(/"([a-z0-9_]+)"/g)) if (name in symbols) names.add(name);
  }
})("src");

const glyphs = Object.fromEntries([...names].sort().map((name) => [name, symbols[name]]));
const unicodes = [...new Set(Object.values(glyphs))].map((code) => code.toString(16)).join(",");

execFileSync("python", ["-m", "fontTools.subset", source, `--unicodes=${unicodes}`, "--layout-features=", "--no-hinting", "--output-file=assets/fonts/icons.ttf"], {
  stdio: "inherit",
});
writeFileSync(
  "src/components/icon-glyphs.ts",
  `// Gerado por scripts/build-icon-font.mjs. Não edite à mão.\nexport const GLYPHS: Record<string, number> = ${JSON.stringify(glyphs, null, 2)};\n`,
);
console.log(`${names.size} ícones em assets/fonts/icons.ttf`);
