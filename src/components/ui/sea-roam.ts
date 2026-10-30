/**
 * Aquarium-like swimming for reef fish (sea-cast.ts): a fish picks a spot on screen and swims there at a pace of its own
 * each time (a dart, a cruise, or hanging almost still), slows down as it arrives, turns round when the spot is behind
 * it and noses up or down as it climbs or dives. After a while it swims off the screen. Web only.
 */

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export interface Roam {
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  /** Seconds left on this leg, and before it leaves. */
  leg: number;
  life: number;
  leaving: boolean;
  /** Times its cruising speed on this leg. */
  pace: number;
  /** -1 facing left to 1 facing right, through 0 (edge-on) while it turns. */
  face: number;
  /** Nose up (negative) or down, in radians, for a fish facing right. */
  tilt: number;
}

export function roam(dir: 1 | -1, speed: number): Roam {
  return {
    tx: 0,
    ty: 0,
    vx: dir * speed,
    vy: 0,
    leg: 0,
    life: rnd(15, 45),
    leaving: false,
    pace: 1,
    face: dir,
    tilt: 0,
  };
}

interface Fish {
  x: number;
  y: number;
  size: number;
  speed: number;
  dir: 1 | -1;
}

function nextLeg(r: Roam, f: Fish, w: number, h: number) {
  r.tx = rnd(0.08, 0.92) * w;
  // Mostly along, not straight up or down.
  r.ty = Math.min(0.84 * h, Math.max(0.16 * h, f.y + rnd(-0.25, 0.25) * h));
  const roll = Math.random();
  r.pace = roll < 0.15 ? rnd(1.6, 2.4) : roll < 0.35 ? rnd(0.08, 0.25) : rnd(0.5, 1.1);
  r.leg = rnd(1.5, 6);
}

/** Moves the fish one step; returns how hard it is swimming (1 = cruising), for the tail beat. */
export function steer(f: Fish, r: Roam, dt: number, w: number, h: number) {
  r.life -= dt;
  r.leg -= dt;
  if (!r.leaving && r.life <= 0) {
    r.leaving = true;
    r.tx = Math.random() < 0.5 ? -400 : w + 400;
    r.ty = f.y + rnd(-0.1, 0.1) * h;
    r.pace = 1.2;
  } else if (!r.leaving && (r.leg <= 0 || Math.hypot(r.tx - f.x, r.ty - f.y) < f.size * 0.6)) {
    nextLeg(r, f, w, h);
  }
  const dx = r.tx - f.x;
  const dy = r.ty - f.y;
  const d = Math.hypot(dx, dy) || 1;
  const want = f.speed * r.pace * Math.min(1, d / (f.size * 1.5));
  // Quick to react on a dart, lazy otherwise; fish climb and dive slower than they swim ahead.
  const k = Math.min(1, dt * (r.pace > 1.5 ? 3 : 1.4));
  r.vx += ((dx / d) * want - r.vx) * k;
  r.vy += ((dy / d) * want * 0.6 - r.vy) * k;
  f.x += r.vx * dt;
  f.y += r.vy * dt;
  // Turn round only when clearly heading the other way.
  if (Math.abs(r.vx) > f.speed * 0.15) f.dir = r.vx > 0 ? 1 : -1;
  r.face += (f.dir - r.face) * Math.min(1, dt * 5);
  const pitch = Math.max(-0.45, Math.min(0.45, Math.atan2(r.vy, Math.abs(r.vx) + f.speed * 0.2)));
  r.tilt += (pitch - r.tilt) * Math.min(1, dt * 3);
  return Math.hypot(r.vx, r.vy) / f.speed;
}
