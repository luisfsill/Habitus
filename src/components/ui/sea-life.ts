/**
 * Life in the page's water (water-backdrop.web.tsx): bubbles rising, specks drifting in the current, fish, turtles,
 * jellyfish and rays passing by (sea-cast.ts) and, rarely, a shark far away. Sizes, speeds, timings and starting
 * points are all random, so the scene never loops. Bubbles come one by one from anywhere, in streams from a spot on the
 * sea floor, or in bursts. Everything is drawn here on a sharp 2D canvas over the water, except the shark, which only
 * moves here and is drawn by the water shader (`uShark` in water-backdrop-gl.ts) as a soft silhouette in the depth.
 * Web only.
 */

import { CANVAS_2D, cast, type Critter, drawCritter, gone, move, shark } from "./sea-cast";

export { CANVAS_2D } from "./sea-cast";

const MAX_BUBBLES = 220;
/** Animals on screen at once (a school counts each fish). */
const MAX_CRITTERS = 26;
const TAU = Math.PI * 2;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface Bubble {
  /** x without the zigzag. */
  x: number;
  y: number;
  r: number;
  vy: number;
  /** Zigzag: big bubbles wobble side to side as they rise, small ones go nearly straight. */
  amp: number;
  freq: number;
  ph: number;
  alpha: number;
}

interface Speck {
  x: number;
  y: number;
  r: number;
  alpha: number;
  ph: number;
}

function bubble(x: number, y: number, r = 1 + 10 * Math.random() ** 2.4): Bubble {
  return {
    x,
    y,
    r,
    // Bigger bubbles rise faster.
    vy: (22 + r * 8) * rnd(0.75, 1.25),
    amp: r > 4 ? rnd(3, 8) * Math.min(r / 6, 1.6) : rnd(0, 2.5),
    freq: rnd(1.5, 4),
    ph: rnd(0, TAU),
    alpha: rnd(0.5, 1),
  };
}

/** The slow sideways current, in px/s, that carries bubbles and specks. */
const current = (t: number, y: number) => 6 * Math.sin(t * 0.07 + y * 0.004) + 4 * Math.sin(t * 0.031 + 1.7);

const sprites: Partial<Record<"light" | "dark" | "dot", HTMLCanvasElement>> = {};

/** Tiny bubbles show only as a bright point: a soft dot. */
function dot() {
  if (sprites.dot) return sprites.dot;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 16;
  const g = cv.getContext(CANVAS_2D);
  if (g) {
    const fill = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    fill.addColorStop(0, "rgba(255,255,255,0.95)");
    fill.addColorStop(0.45, "rgba(235,248,255,0.6)");
    fill.addColorStop(1, "rgba(235,248,255,0)");
    g.fillStyle = fill;
    g.fillRect(0, 0, 16, 16);
  }
  sprites.dot = cv;
  return cv;
}

/** A bubble drawn once and reused at every size: clear middle, bright rim and a window of sunlight on top. */
function sprite(dark: boolean) {
  const key = dark ? "dark" : "light";
  const done = sprites[key];
  if (done) return done;
  const s = 64;
  const m = s / 2;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const g = cv.getContext(CANVAS_2D);
  if (!g) return cv;
  const disc = (x: number, y: number, r: number, fill: CanvasGradient) => {
    g.fillStyle = fill;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  };
  const body = g.createRadialGradient(m, m, 0, m, m, m);
  const tint = dark ? "200,235,255" : "255,255,255";
  body.addColorStop(0, `rgba(${tint},0.03)`);
  body.addColorStop(0.65, `rgba(${tint},0.07)`);
  body.addColorStop(0.88, `rgba(${tint},0.3)`);
  body.addColorStop(0.95, `rgba(${tint},0.75)`);
  // On pale water a thin darker edge keeps the bubble visible.
  body.addColorStop(0.985, dark ? `rgba(${tint},0.35)` : "rgba(30,100,140,0.35)");
  body.addColorStop(1, `rgba(${tint},0)`);
  disc(m, m, m, body);
  const sun = g.createRadialGradient(m * 0.64, m * 0.56, 0, m * 0.64, m * 0.56, m * 0.34);
  sun.addColorStop(0, "rgba(255,255,255,0.95)");
  sun.addColorStop(1, "rgba(255,255,255,0)");
  disc(m * 0.64, m * 0.56, m * 0.34, sun);
  const back = g.createRadialGradient(m * 1.32, m * 1.38, 0, m * 1.32, m * 1.38, m * 0.2);
  back.addColorStop(0, "rgba(255,255,255,0.35)");
  back.addColorStop(1, "rgba(255,255,255,0)");
  disc(m * 1.32, m * 1.38, m * 0.2, back);
  sprites[key] = cv;
  return cv;
}

export function createSea() {
  const sharkOut = new Float32Array(4);
  const bubbles: Bubble[] = [];
  const specks: Speck[] = [];
  const vents: { x: number; until: number; rate: number }[] = [];
  // Far ones first, so nearer ones pass in front.
  let critters: Critter[] = [];
  let big: Critter | null = null;
  let kind = -1;
  let next = { cast: rnd(2, 6), shark: rnd(15, 40), vent: rnd(1, 6), burst: rnd(4, 15) };
  let started = false;

  const add = (b: Bubble) => bubbles.length < MAX_BUBBLES && bubbles.push(b);

  /** Starts mid-scene: bubbles and specks already spread over the screen. */
  function start(w: number, h: number, t: number) {
    started = true;
    for (let i = 0; i < (w * h) / 12000; i++) add(bubble(rnd(0, w), rnd(0, h)));
    for (let i = 0; i < Math.min((w * h) / 20000, 70); i++) {
      specks.push({ x: rnd(0, w), y: rnd(0, h), r: rnd(0.6, 1.6), alpha: rnd(0.08, 0.3), ph: rnd(0, TAU) });
    }
    // Two groups already on their way, somewhere on screen.
    for (let i = 0; i < 2; i++) {
      const group = join(w, h);
      const shift = rnd(0.3, 0.7);
      for (const c of group) {
        if (c.rise) c.y -= shift * h;
        else c.x += c.dir * (shift * w + c.half * c.size);
      }
    }
    next = { cast: t + next.cast, shark: t + next.shark, vent: t + next.vent, burst: t + next.burst };
  }

  function join(w: number, h: number) {
    const picked = cast(w, h, kind);
    kind = picked.kind;
    critters = [...critters, ...picked.group].sort((a, b) => b.depth - a.depth);
    return picked.group;
  }

  function spawn(dt: number, w: number, h: number, t: number) {
    // Lone bubbles, more or fewer as time goes by.
    const rate = (w / 220) * (0.6 + 0.6 * Math.sin(t * 0.09) * Math.sin(t * 0.023 + 1));
    if (Math.random() < dt * rate) add(bubble(rnd(0, w), h + 15));
    // Streams from a spot on the sea floor.
    if (t > next.vent) {
      vents.push({ x: rnd(0.05, 0.95) * w, until: t + rnd(3, 14), rate: rnd(4, 14) });
      next.vent = t + rnd(4, 16);
    }
    for (let i = vents.length - 1; i >= 0; i--) {
      const v = vents[i];
      if (t > v.until) vents.splice(i, 1);
      else if (Math.random() < dt * v.rate) add(bubble(v.x + rnd(-5, 5), h + 10, 1 + 4 * Math.random() ** 2));
    }
    // Bursts: a cloud of bubbles of every size at once.
    if (t > next.burst) {
      const x = rnd(0.1, 0.9) * w;
      for (let i = rnd(12, 40); i > 0; i--) add(bubble(x + rnd(-35, 35), h + rnd(10, 140)));
      next.burst = t + rnd(9, 35);
    }
  }

  function drift(dt: number, w: number, h: number, t: number) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.y -= b.vy * dt;
      b.x += current(t, b.y) * dt;
      b.ph += b.freq * dt;
      if (b.y < -30) bubbles.splice(i, 1);
    }
    for (const s of specks) {
      s.ph += dt * 0.5;
      s.x = (s.x + (current(t, s.y) * 0.7 + 3 * Math.sin(s.ph)) * dt + w) % w;
      s.y = (s.y + (2 + 4 * Math.sin(s.ph * 0.7)) * dt + h) % h;
    }
  }

  function swimmers(dt: number, w: number, h: number, t: number) {
    if (t > next.cast) {
      if (critters.length < MAX_CRITTERS) join(w, h);
      next.cast = t + rnd(2.5, 9);
    }
    for (const c of critters) move(c, dt, t, { drift: current(t, c.y), w, h });
    critters = critters.filter((c) => !gone(c, w));
    if (!big && t > next.shark) big = shark(w, h);
    if (big) {
      move(big, dt, t, { drift: 0, w, h });
      if (gone(big, w)) {
        big = null;
        next.shark = t + rnd(50, 130);
      }
    }
    sharkOut.fill(0);
    // Depth step (0 near to 9 far) × 10 + tail beat phase, as the shader reads it.
    if (big) sharkOut.set([big.x, big.y, big.size * big.dir, Math.round(big.depth * 9) * 10 + big.ph]);
  }

  /** Advances the sea by `dt` seconds (`t`: seconds since start) on a `w`×`h` screen. */
  function step(dt: number, w: number, h: number, t: number) {
    if (!started) start(w, h, t);
    spawn(dt, w, h, t);
    drift(dt, w, h, t);
    swimmers(dt, w, h, t);
  }

  /** Draws specks, animals and bubbles on a canvas covering `w`×`h` CSS pixels, sharp on dense screens. */
  function draw(ctx: CanvasRenderingContext2D, w: number, h: number, dark: boolean) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cv = ctx.canvas;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = dark ? "#BFE6FF" : "#FFFFFF";
    for (const s of specks) {
      ctx.globalAlpha = s.alpha;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    for (const c of critters) drawCritter(ctx, c, { h, dpr, dark });
    const img = sprite(dark);
    const small = dot();
    for (const b of bubbles) {
      // Fade in near the floor and out near the surface, where the water turns into the flat backdrop colour.
      const fade = Math.min(1, Math.max(0, b.y / (h * 0.12)), Math.max(0, (h + 10 - b.y) / (h * 0.08)));
      if (fade <= 0) continue;
      // Bubbles grow a little as they rise (less pressure) and big ones wobble out of round.
      const r = b.r * (1 + 0.2 * (1 - b.y / h));
      const sx = b.r > 4 ? 1 + 0.07 * Math.sin(b.ph * 2.3) : 1;
      ctx.globalAlpha = b.alpha * fade * (dark ? 0.85 : 0.95);
      ctx.drawImage(
        r < 2.6 ? small : img,
        b.x + Math.sin(b.ph) * b.amp - r * sx,
        b.y - r * (2 - sx),
        2 * r * sx,
        2 * r * (2 - sx),
      );
    }
    ctx.globalAlpha = 1;
  }

  return { step, draw, shark: sharkOut, critters: () => critters };
}
