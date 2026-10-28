import { readFileSync } from "fs";
import { join } from "path";

import { progressOf } from "../achievements";
import { defaultData } from "../app-data";
import { weekDays } from "../history";
import { weekXp, type RankingLog } from "../ranking";
import { addDays, dayKey } from "../time";

interface Vector { name: string; log: RankingLog; weekStart: string; lenientFrom: string; expected: number }

// Same vectors the SQL function runs (supabase/tests/ranking.sql).
const sql = readFileSync(join(__dirname, "../../../supabase/tests/ranking.sql"), "utf8");
const vectors: Vector[] = JSON.parse(sql.split("$json$")[1]) as Vector[];

describe("weekXp", () => {
  it.each(vectors)("$name", (v) => {
    expect(weekXp(v.log, v.weekStart, v.lenientFrom)).toBe(v.expected);
  });

  it("bate com progressOf", () => {
    const all = [0, 1, 2, 3, 4, 5];
    const completions: Record<string, number[]> = {};
    for (let day = 20; day <= 28; day++) completions[`2026-10-${day}`] = day % 3 === 0 ? [0, 1] : all;
    const water: Record<string, { cups: number; at: number }> = {};
    for (let day = 25; day <= 28; day++) water[`2026-10-${day}`] = { cups: day % 2 ? 8 : 3, at: 0 };
    const data = { ...defaultData(), completions, water };
    const now = new Date(2026, 9, 28, 12);
    const sunday = weekDays(now)[0];
    const end = addDays(sunday, -1);
    end.setHours(23, 59, 59, 999);
    const expected = progressOf(data, now).stats.xp - progressOf(data, end).stats.xp;

    const log: RankingLog = {
      tricks: completions,
      water: Object.fromEntries(Object.entries(water).map(([k, w]) => [k, { cups: w.cups, goal: 8 }])),
      activeDays: data.settings.days,
    };
    expect(weekXp(log, dayKey(sunday), "2026-10-28")).toBe(expected);
  });
});
