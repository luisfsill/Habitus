/**
 * Who swims through the page's sea (sea-life.ts): reef fish alone or in schools, big fish, sea turtles, jellyfish
 * rising from the floor and manta rays, picked at random by weight, each with its own size, speed, depth and path.
 * Deeper ones are smaller, slower, softer and tinted by the water in front of them; all are lit from above.
 * Web only (2D canvas).
 */

import { drawJelly, drawManta, drawTurtle, JELLIES, jellyHalf } from "./sea-critters";
import { drawFish, fishHalf, SPECIES, type Species } from "./sea-fish";
import { type Roam, roam, steer } from "./sea-roam";

/** A template literal: in double quotes this is also a Material Symbol name, which the icon font test would ask for. */
export const CANVAS_2D = `2d`;
const TAU = Math.PI * 2;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const int = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const side = () => (Math.random() < 0.5 ? 1 : -1);

export interface Critter {
  x: number;
  /** Path height without the bobbing. */
  y0: number;
  y: number;
  /** Pixels per unit of its drawing (its length; a jellyfish's bell width). */
  size: number;
  /** 0 near to 1 far. */
  depth: number;
  dir: 1 | -1;
  /** Pixels a second, sideways (up for jellyfish). */
  speed: number;
  /** Stroke phase and speed (rad/s). */
  ph: number;
  beat: number;
  bob: number;
  bobPh: number;
  /** Half its box, in units of `size`. */
  half: number;
  /** Jellyfish: rise in pulses instead of swimming sideways. */
  rise?: boolean;
  /** Turtles and rays: faster on the stroke, gliding between. */
  glide?: boolean;
  /** Reef fish: wander about the screen before leaving (sea-roam.ts). */
  roam?: Roam;
  /** Glows in the dark water (jellyfish). */
  glow?: boolean;
  /** Draws it around the origin; none for the shark, which the water shader draws. */
  art?: (g: CanvasRenderingContext2D, ph: number) => void;
}

type Make = (w: number, h: number) => Critter[];

/**
 * How deep a new group swims. Big animals stay far back, soft and tinted by the water, with only the odd one a bit
 * nearer; small fish come close now and then.
 */
const deep = (big: boolean) =>
  big ? (Math.random() < 0.08 ? rnd(0.45, 0.6) : rnd(0.72, 1)) : Math.random() < 0.15 ? rnd(0, 0.3) : rnd(0.35, 1);
/** Size and speed shrink with depth. */
const near = (depth: number) => 1 - 0.6 * depth;

/** One swimmer entering from the side it swims away from. */
function swimmer(
  w: number,
  h: number,
  o: Partial<Critter> & { size: number; depth: number; dir: 1 | -1; speed: number; beat: number; half: number },
) {
  const y = o.y ?? rnd(0.15, 0.85) * h;
  // Bigger on big screens, so a fish on a monitor is not a speck.
  const size = o.size * Math.min(1.6, Math.max(0.9, Math.min(w, h) / 600));
  return {
    x: o.dir > 0 ? -o.half * size : w + o.half * size,
    ph: rnd(0, TAU),
    bob: rnd(2, 7),
    bobPh: rnd(0, TAU),
    ...o,
    size,
    y,
    y0: y,
  };
}

function shoal(
  sp: Species,
  count: [number, number],
  len: [number, number],
  speed: [number, number],
  beat: [number, number],
  kind: "big" | "roam" | "cross" = "cross",
): Make {
  return (w, h) => {
    const dir = side();
    const depth = deep(kind === "big");
    const k = near(depth);
    const n = int(...count);
    const y = rnd(0.15, 0.85) * h;
    const v = rnd(...speed) * k;
    // The first one leads, the others follow in a loose cloud that grows with the school.
    const spread = len[1] * k * (1 + n * 0.35);
    return Array.from({ length: n }, (_, i) => {
      const fish = swimmer(w, h, {
        size: rnd(...len) * k,
        depth,
        dir,
        speed: v * rnd(0.94, 1.06),
        beat: rnd(...beat),
        half: fishHalf(sp),
        y: y + (i ? rnd(-0.35, 0.35) * spread : 0),
        art: (g, ph) => drawFish(g, sp, ph),
      });
      fish.x -= dir * (i ? rnd(0, spread) : 0);
      if (kind === "roam") fish.roam = roam(dir, fish.speed);
      return fish;
    });
  };
}

const turtle: Make = (w, h) => {
  const depth = deep(true);
  const k = near(depth);
  return [
    swimmer(w, h, {
      size: rnd(110, 170) * k,
      depth,
      dir: side(),
      speed: rnd(18, 30) * k,
      beat: rnd(1.3, 1.9),
      half: 0.6,
      glide: true,
      art: drawTurtle,
    }),
  ];
};

const manta: Make = (w, h) => {
  const depth = deep(true);
  const k = near(depth);
  return [
    swimmer(w, h, {
      size: rnd(130, 210) * k,
      depth,
      dir: side(),
      speed: rnd(22, 36) * k,
      beat: rnd(1, 1.5),
      half: 0.65,
      glide: true,
      art: drawManta,
    }),
  ];
};

/** One to three jellyfish rising from below the screen. */
const jellies: Make = (w, h) =>
  Array.from({ length: int(1, 3) }, () => {
    const look = JELLIES[int(0, JELLIES.length - 1)];
    const depth = rnd(0.25, 1);
    const k = near(depth);
    const size = rnd(38, 80) * k;
    const half = jellyHalf(look);
    return swimmer(w, h, {
      size,
      depth,
      dir: 1,
      speed: rnd(14, 26) * k,
      beat: rnd(1.6, 2.6),
      half,
      x: rnd(0.08, 0.92) * w,
      y: h + half * size + rnd(0, 220),
      rise: true,
      glow: true,
      art: (g, ph) => drawJelly(g, look, ph),
    });
  });

/** A shark far away: only moved here, drawn as a silhouette by the water shader (`uShark`). */
export function shark(w: number, h: number): Critter {
  const depth = rnd(0.55, 1);
  return swimmer(w, h, {
    size: rnd(240, 380) * (1 - 0.4 * depth),
    depth,
    dir: side(),
    speed: rnd(30, 48) * (1 - 0.3 * depth),
    beat: rnd(2.4, 3.4),
    half: 0.7,
    y: rnd(0.3, 0.72) * h,
    bob: rnd(8, 25),
  });
}

/** [weight, maker]: small reef fish most often, turtles and rays now and then. */
const MENU: [number, Make][] = [
  [5, shoal(SPECIES.sardine, [8, 18], [16, 24], [55, 90], [13, 17])],
  [4, shoal(SPECIES.clown, [1, 3], [30, 42], [22, 40], [8, 11], "roam")],
  [4, shoal(SPECIES.tang, [2, 6], [36, 50], [28, 48], [7, 10], "roam")],
  [3, shoal(SPECIES.yellow, [1, 4], [30, 44], [22, 40], [7, 10], "roam")],
  [3, shoal(SPECIES.angel, [1, 2], [40, 56], [18, 32], [5, 8], "roam")],
  [3, shoal(SPECIES.parrot, [1, 2], [46, 64], [24, 40], [6, 9], "roam")],
  [2, shoal(SPECIES.grouper, [1, 1], [110, 170], [20, 34], [3.5, 5], "big")],
  [2, shoal(SPECIES.tuna, [1, 4], [90, 140], [60, 95], [6, 8], "big")],
  [2, turtle],
  [3, jellies],
  [1, manta],
];

/** A random group, never the same kind as `last` (its index, returned as `kind`). */
export function cast(w: number, h: number, last = -1) {
  const total = MENU.reduce((s, [wt], i) => s + (i === last ? 0 : wt), 0);
  let roll = Math.random() * total;
  const kind = MENU.findIndex(([wt], i) => i !== last && (roll -= wt) < 0);
  return { kind, group: MENU[kind < 0 ? 0 : kind][1](w, h) };
}

export function move(c: Critter, dt: number, t: number, view: { drift: number; w: number; h: number }) {
  if (c.roam) {
    const effort = steer(c, c.roam, dt, view.w, view.h);
    // The tail beats harder when it hurries, barely when it hangs still.
    c.ph = (c.ph + c.beat * (0.35 + 0.9 * effort) * dt) % TAU;
    return;
  }
  c.ph = (c.ph + c.beat * dt) % TAU;
  if (c.rise) {
    // A jellyfish shoots up while its bell squeezes and coasts between strokes, carried by the current.
    c.y -= c.speed * (0.4 + 1.6 * Math.max(0, Math.sin(c.ph)) ** 2) * dt;
    c.x += view.drift * dt;
    return;
  }
  c.x += c.dir * c.speed * (c.glide ? 0.7 + 0.5 * Math.max(0, Math.sin(c.ph)) : 1) * dt;
  c.y0 += Math.sin(t * 0.05 + c.bobPh) * 3 * dt;
  c.y = c.y0 + c.bob * Math.sin(t * 0.4 + c.bobPh);
}

/** True once it has left the screen on the far side (or the top, for a jellyfish). */
export function gone(c: Critter, w: number) {
  const r = c.half * c.size;
  if (c.rise) return c.y + r < -10;
  if (c.roam && !c.roam.leaving) return false;
  return c.dir > 0 ? c.x - r > w + 10 : c.x + r < -10;
}

let buf: HTMLCanvasElement | null = null;

/**
 * Draws one critter through a scratch canvas, so the whole animal can be lit and tinted at once: light from above,
 * then the water colour over it, more the deeper it swims. Far ones are drawn with fewer pixels, so they come out soft.
 */
export function drawCritter(
  ctx: CanvasRenderingContext2D,
  c: Critter,
  view: { h: number; dpr: number; dark: boolean },
) {
  if (!c.art) return;
  const { h, dpr, dark } = view;
  // Fade in and out at the top and bottom, where the water turns into the flat backdrop colour.
  const fade = Math.min(1, Math.max(0, c.y / (h * 0.1)), Math.max(0, (h - c.y) / (h * 0.06)));
  if (fade <= 0) return;
  const half = c.half * c.size;
  const res = dpr * Math.max(0.3, 1 - 0.72 * c.depth);
  const s = Math.ceil(2 * half * res) + 2;
  buf ??= document.createElement("canvas");
  if (buf.width < s || buf.height < s) {
    buf.width = Math.max(buf.width, s);
    buf.height = Math.max(buf.height, s);
  }
  const g = buf.getContext(CANVAS_2D);
  if (!g) return;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  // A little past the box too: smoothing samples the pixels just outside it, left from a bigger critter.
  g.clearRect(0, 0, s + 4, s + 4);
  // A roaming fish shows edge-on as it turns round and tilts as it climbs or dives.
  const face = c.roam ? Math.sign(c.roam.face || 1) * Math.max(0.12, Math.abs(c.roam.face)) : c.dir;
  const tilt = c.roam ? c.roam.tilt * Math.sign(face) : 0;
  const k = res * c.size;
  g.setTransform(
    k * face * Math.cos(tilt),
    k * face * Math.sin(tilt),
    -k * Math.sin(tilt),
    k * Math.cos(tilt),
    s / 2,
    s / 2,
  );
  g.save();
  c.art(g, c.ph);
  g.restore();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-atop";
  const light = g.createLinearGradient(0, 0, 0, s);
  light.addColorStop(0, "rgba(255,255,255,0.16)");
  light.addColorStop(1, "rgba(0,20,40,0.3)");
  g.fillStyle = light;
  g.fillRect(0, 0, s, s);
  g.globalAlpha = (c.glow && dark ? 0.15 + 0.4 * c.depth : 0.1 + 0.78 * c.depth) * (dark ? 1 : 0.85);
  g.fillStyle = dark ? "#06233B" : "#B8DCEE";
  g.fillRect(0, 0, s, s);
  // The deepest ones melt into the water.
  ctx.globalAlpha = fade * (1 - 0.35 * c.depth);
  // Jellyfish glow in the dark water.
  ctx.globalCompositeOperation = c.glow && dark ? "lighter" : "source-over";
  ctx.drawImage(buf, 0, 0, s, s, c.x - half, c.y - half, 2 * half, 2 * half);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}
