/**
 * The gratitude sky of Gratidão antecipada: every day with a gratitude phrase is a star. A sky holds one year
 * (365 stars) in 52 constellations of 7, one a week; the 366th star starts the sky of year 2. Positions are fixed by the
 * star's place in its year, so a sky looks the same on every device and only grows.
 */

import { figureOf } from "./constellation-figures";
import { MONTHS } from "./reminder-text";

export const SKY_DAYS = 365;
/** One constellation a week. */
export const CONSTELLATION_DAYS = 7;
/** 52 in a year; the 365th star is left over and lands anywhere. */
export const CONSTELLATIONS = Math.floor(SKY_DAYS / CONSTELLATION_DAYS);
/** The sky is taller than wide, like a phone held upright: y is stretched by this much. */
const TALL = 1.45;
/** The closest the resting view gets: a first week fills the screen without its stars crowding the edges. */
const MIN_EXTENT = 0.2;

export interface Star {
  /** dayKey of the phrase. */
  day: string;
  text: string;
  /** Place in the sky: x within ±1, y within ±1.45 (it grows downwards). */
  x: number;
  y: number;
  /** 0.3 (faint) … 1 (bright). */
  size: number;
  /** 0 bluish white … 1 warm white. */
  tint: number;
}

export interface Sky {
  /** 1 for the first year of stars. */
  year: number;
  stars: Star[];
  /** Constellations already complete (0…52); each one has its lines drawn. */
  constellations: number;
  /** Index pairs into `stars`: the lines of the complete constellations. */
  lines: [number, number][];
  /** Days left until the next constellation; 0 once the year is complete. */
  nextIn: number;
  complete: boolean;
}

/** Small deterministic random numbers (0…1) for star `i`. */
function rand(i: number, salt: number): number {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Where the `i`-th star of a year sits. Early constellations are near the centre, so the sky grows outwards. */
export function starPlace(i: number): Pick<Star, "x" | "y" | "size" | "tint"> {
  const group = Math.floor(i / CONSTELLATION_DAYS);
  // Few bright stars, many faint ones.
  const look = { size: 0.3 + 0.7 * rand(i, 3) ** 2.2, tint: rand(i, 4) };
  if (group >= CONSTELLATIONS) {
    // The star left over after the last constellation lands anywhere in the sky.
    const a = rand(i, 1) * Math.PI * 2;
    const d = Math.sqrt(rand(i, 2)) * 0.9;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d * TALL, ...look };
  }
  // Golden-angle spiral from the centre: neighbouring groups never overlap.
  const angle = group * 2.39996;
  const r = Math.sqrt(group / CONSTELLATIONS) * 0.84;
  // Smaller figures the more there are, so they fill the sky without overlapping.
  const scale = 0.55 / Math.sqrt(CONSTELLATIONS);
  // Each figure leans a little its own way, and each star sits a touch off its point, so they look found, not drawn.
  const tilt = (rand(group, 5) - 0.5) * 0.6;
  const [px, py] = figureOf(group).points[i % CONSTELLATION_DAYS];
  const fx = (px * Math.cos(tilt) - py * Math.sin(tilt) + (rand(i, 1) - 0.5) * 0.12) * scale;
  const fy = (px * Math.sin(tilt) + py * Math.cos(tilt) + (rand(i, 2) - 0.5) * 0.12) * scale;
  // Only the placement on the sky is stretched to the tall screen, not the figure itself.
  return { x: Math.cos(angle) * r + fx, y: Math.sin(angle) * r * TALL + fy, ...look };
}

/** The lines of constellation `group`: its figure's outline, as index pairs into the year's stars. */
function constellationLines(group: number): [number, number][] {
  const first = group * CONSTELLATION_DAYS;
  return figureOf(group).edges.map(([a, b]) => [first + a, first + b]);
}

/** The name of the constellation a star belongs to, once that constellation is complete. */
export function constellationName(sky: Pick<Sky, "constellations">, star: number): string | undefined {
  const group = Math.floor(star / CONSTELLATION_DAYS);
  return group < sky.constellations ? figureOf(group).name : undefined;
}

/** The current year's sky from the saved phrases (dayKey → phrase). */
export function skyOf(gratitude: Readonly<Record<string, string>>): Sky {
  const days = Object.keys(gratitude).sort();
  const year = Math.max(1, Math.ceil(days.length / SKY_DAYS));
  const stars = days.slice((year - 1) * SKY_DAYS).map((day, i) => ({ day, text: gratitude[day], ...starPlace(i) }));
  const constellations = Math.min(CONSTELLATIONS, Math.floor(stars.length / CONSTELLATION_DAYS));
  const lines = Array.from({ length: constellations }, (_, g) => constellationLines(g)).flat();
  const complete = stars.length >= SKY_DAYS;
  const nextIn = complete || constellations === CONSTELLATIONS ? 0 : (constellations + 1) * CONSTELLATION_DAYS - stars.length;
  return { year, stars, constellations, lines, nextIn, complete };
}

/** Whether the `count`-th star of a year completes a constellation (the 7th, 14th … 364th). */
export function closesConstellation(count: number): boolean {
  return count > 0 && count % CONSTELLATION_DAYS === 0 && count <= CONSTELLATIONS * CONSTELLATION_DAYS;
}

export interface Link {
  from: number;
  to: number;
  /** How many links away from the origin this one starts (0 = touches the origin). */
  step: number;
}

/**
 * The order a figure's lines link up from the star that was touched: outward, one ring of neighbours at a time,
 * each line drawn from the star nearer the origin. Lines the origin cannot reach come last.
 */
export function linkOrder(lines: readonly (readonly [number, number])[], origin: number): Link[] {
  const level = new Map([[origin, 0]]);
  const queue = [origin];
  const left = [...lines];
  const links: Link[] = [];
  for (let u = queue.shift(); u !== undefined; u = queue.shift()) {
    const from = u;
    for (let k = left.length - 1; k >= 0; k--) {
      const [a, b] = left[k];
      if (a !== from && b !== from) continue;
      const to = a === from ? b : a;
      if (!level.has(to)) {
        level.set(to, (level.get(from) ?? 0) + 1);
        queue.push(to);
      }
      links.push({ from, to, step: level.get(from) ?? 0 });
      left.splice(k, 1);
    }
  }
  const last = Math.max(0, ...links.map((l) => l.step)) + 1;
  return [...links, ...left.map(([a, b]) => ({ from: a, to: b, step: last }))];
}

/** A star's day for its phrase card: "14 out 2026". */
export function starDate(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Half the width of sky in view: just past the farthest star (the height follows), never zoomed in too close. */
export function skyExtent(stars: readonly Pick<Star, "x" | "y">[]): number {
  return Math.max(MIN_EXTENT, ...stars.map((s) => Math.max(Math.abs(s.x), Math.abs(s.y) / TALL) * 1.15 + 0.06));
}
