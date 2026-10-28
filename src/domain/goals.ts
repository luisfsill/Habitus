/**
 * Metas em voz alta: the affirmations light up as they are said (or held), and every day they are declared counts
 * toward seals at 7, 21 and 66 days. Counted from the completions, so nothing new is stored.
 * shortcut: one count for all the goals, not one per goal (they are edited freely, so a per-goal count would need
 * its own history); store per-goal days if that is ever wanted.
 */

import type { Completions } from "./history";

export const GOALS_TRICK = 2;
export const SEALS = [7, 21, 66] as const;

/** Days the affirmations were declared. */
export function declaredDays(completions: Completions): number {
  return Object.values(completions).filter((done) => done.includes(GOALS_TRICK)).length;
}

/** "Metas declaradas em 12 dias · próximo selo aos 21", or the seal just reached. */
export function goalsLine(days: number, justDeclared: boolean): string {
  if (justDeclared && (SEALS as readonly number[]).includes(days)) return `Selo de ${days} dias! Suas metas, ditas em voz alta.`;
  const next = SEALS.find((seal) => seal > days);
  const count = days === 1 ? "1 dia" : `${days} dias`;
  if (days === 0) return `Primeiro dia · próximo selo aos ${SEALS[0]}`;
  return next ? `Metas declaradas em ${count} · próximo selo aos ${next}` : `Metas declaradas em ${count} · todos os selos`;
}

/** Word ranges [from, to) of each affirmation inside their joined text (as wordTimeline splits it). */
export function affirmationRanges(lines: readonly string[]): [number, number][] {
  let at = 0;
  return lines.map((line) => {
    const words = line.split(/\s+/).filter(Boolean).length;
    const range: [number, number] = [at, at + words];
    at += words;
    return range;
  });
}

/** How many affirmations are fully lit when `words` words are. */
export function litAffirmations(ranges: readonly [number, number][], words: number): number {
  return ranges.filter(([, to]) => to <= words).length;
}
