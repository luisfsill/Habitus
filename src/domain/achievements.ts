import type { AppData } from "./app-data";
import { type Belt, beltFor, computeStats, levelFor, type Stats, withWater } from "./gamification";

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  symbol: { ios: string; android: string };
  target: number;
  value: (s: Stats, level: number) => number;
}

/** Apple Fitness-style awards: each one shows progress until it unlocks. */
export const BADGES: readonly BadgeDef[] = [
  { id: "first-step", title: "Primeiro passo", description: "Conclua sua primeira dica.", symbol: { ios: "figure.walk", android: "directions_walk" }, target: 1, value: (s) => s.totalTricks },
  { id: "perfect-day", title: "Dia perfeito", description: "Faça todas as dicas num dia.", symbol: { ios: "sun.max.fill", android: "wb_sunny" }, target: 1, value: (s) => s.perfectDays },
  { id: "streak-3", title: "Aquecendo", description: "3 dias completos seguidos.", symbol: { ios: "flame", android: "local_fire_department" }, target: 3, value: (s) => s.bestStreak },
  { id: "streak-7", title: "Em chamas", description: "7 dias completos seguidos.", symbol: { ios: "flame.fill", android: "whatshot" }, target: 7, value: (s) => s.bestStreak },
  { id: "perfect-week", title: "Semana perfeita", description: "Complete todos os dias ativos de uma semana.", symbol: { ios: "calendar.badge.checkmark", android: "event_available" }, target: 1, value: (s) => s.perfectWeeks },
  { id: "gratitude-7", title: "Coração grato", description: "Escreva sua gratidão em 7 dias.", symbol: { ios: "heart.fill", android: "favorite" }, target: 7, value: (s) => s.gratitudeDays },
  { id: "tricks-100", title: "Centena", description: "Conclua 100 dicas.", symbol: { ios: "100.circle.fill", android: "military_tech" }, target: 100, value: (s) => s.totalTricks },
  { id: "streak-30", title: "Hábito formado", description: "30 dias completos seguidos.", symbol: { ios: "bolt.heart.fill", android: "bolt" }, target: 30, value: (s) => s.bestStreak },
  { id: "perfect-weeks-4", title: "Mês de ouro", description: "4 semanas perfeitas.", symbol: { ios: "crown.fill", android: "workspace_premium" }, target: 4, value: (s) => s.perfectWeeks },
  { id: "level-10", title: "Nível 10", description: "Alcance o nível 10.", symbol: { ios: "star.circle.fill", android: "stars" }, target: 10, value: (_s, level) => level },
  { id: "black-belt", title: "Faixa Preta", description: "Alcance a faixa preta (nível 27).", symbol: { ios: "medal.fill", android: "emoji_events" }, target: 27, value: (_s, level) => level },
];

export interface BadgeState {
  def: BadgeDef;
  progress: number;
  unlocked: boolean;
}

export interface Progress {
  stats: Stats;
  level: ReturnType<typeof levelFor>;
  belt: Belt;
  badges: BadgeState[];
}

export function progressFrom(stats: Stats): Progress {
  const level = levelFor(stats.xp);
  return {
    stats,
    level,
    belt: beltFor(level.level),
    badges: BADGES.map((def) => {
      const value = def.value(stats, level.level);
      return { def, progress: Math.min(value, def.target), unlocked: value >= def.target };
    }),
  };
}

export interface Reward {
  xp: number;
  levelUp?: number;
  belt?: Belt;
  badges: BadgeDef[];
}

/** What changed between two snapshots, for the "+10 XP" celebration. */
export function rewardBetween(before: Progress, after: Progress): Reward | null {
  const xp = after.stats.xp - before.stats.xp;
  if (xp <= 0) return null;
  const was = new Set(before.badges.filter((b) => b.unlocked).map((b) => b.def.id));
  return {
    xp,
    levelUp: after.level.level > before.level.level ? after.level.level : undefined,
    belt: after.belt.name !== before.belt.name ? after.belt : undefined,
    badges: after.badges.filter((b) => b.unlocked && !was.has(b.def.id)).map((b) => b.def),
  };
}

/** Progress for the saved data as of `now`. */
export function progressOf(data: Pick<AppData, "completions" | "gratitude" | "settings" | "water">, now: Date): Progress {
  const stats = computeStats(data.completions, data.gratitude, data.settings.days, now);
  return progressFrom(withWater(stats, data.water, data.settings.water.goal, now));
}
