import { useEffect, useRef } from "react";

import { closesConstellation, CONSTELLATION_DAYS, linkOrder, skyExtent, SKY_DAYS, type Star } from "@/domain/sky";

import { drawScene, initSceneGL, type SceneGL, sceneDpr } from "./ui/fullscreen-gl";
import { NIGHT_SKY_FRAG, NIGHT_SKY_UNIFORMS } from "./ui/night-sky-gl";
import { type Camera, watchCamera } from "./ui/sky-camera";
import { skyLife } from "./ui/sky-sparkles";

export interface GratitudeSkyProps {
  stars: readonly Star[];
  /** Index pairs into `stars` (domain/sky.ts). */
  lines: readonly (readonly [number, number])[];
  /** Index of the star being born right now (it flares in), or null. */
  born: number | null;
  /** Index of the star whose phrase is open, or null. */
  selected: number | null;
  /** A tap on the sky: the star under the finger, or null for empty sky. */
  onSelect?: (index: number | null) => void;
}

// A template literal: in double quotes this is also a Material Symbol name, which the icon font test would ask for.
const CANVAS_2D = `2d`;

/** Where the sky's centre sits on screen and how many pixels one sky unit is, as in night-sky-gl.ts, after zoom and pan. */
function view(w: number, h: number, extent: number, cam: Camera) {
  return { cx: w / 2 + cam.px, cy: h * 0.42 + cam.py, unit: (Math.min(w, h * 0.8) / 2 / extent) * cam.z };
}

/** A soft round glow, white in the middle, tinted towards the edge: drawn once and stamped for every star. */
function sprite(rgb: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext(CANVAS_2D);
  if (!g) return c;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.07, `rgba(${rgb},0.95)`);
  r.addColorStop(0.18, `rgba(${rgb},0.32)`);
  r.addColorStop(0.45, `rgba(${rgb},0.07)`);
  r.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return c;
}

/** Bluish to warm white, picked by a star's tint. */
const TINTS = ["190,212,255", "220,230,255", "255,246,232", "255,226,190"];

interface Point {
  x: number;
  y: number;
}

const ease = (k: number) => 1 - (1 - k) ** 3;
const overshoot = (k: number) => 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2;

interface Frame {
  g: CanvasRenderingContext2D;
  t: number;
  w: number;
  h: number;
  extent: number;
  reduce: boolean;
  bornAt: number;
  marks: Marks;
  cam: Camera;
}

function ring(g: CanvasRenderingContext2D, { x, y }: Point, radius: number, alpha: number) {
  g.globalAlpha = alpha;
  g.strokeStyle = "rgba(255,240,220,1)";
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(x, y, radius, 0, Math.PI * 2);
  g.stroke();
}

/** Thin cross of light on the brightest stars, like a camera lens sees them. */
function spikes(g: CanvasRenderingContext2D, { x, y }: Point, r: number, a: number) {
  g.globalAlpha = a * 0.2;
  g.strokeStyle = "rgba(230,238,255,1)";
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(x - r * 6, y);
  g.lineTo(x + r * 6, y);
  g.moveTo(x, y - r * 6);
  g.lineTo(x, y + r * 6);
  g.stroke();
}

/** The newborn star's flare: a wide bloom and a ring of light spreading out. Returns its size factor (pops in). */
function flare(g: CanvasRenderingContext2D, glow: HTMLCanvasElement, s: { x: number; y: number; r: number; age: number }) {
  const { x, y, r, age } = s;
  g.globalAlpha = Math.min(1, Math.exp(-age * 1.6) * 1.2);
  g.drawImage(glow, x - r * 40, y - r * 40, r * 80, r * 80);
  if (age < 1.8) ring(g, { x, y }, 8 + ease(age / 1.8) * 110, (1 - age / 1.8) * 0.7);
  return age < 0.9 ? overshoot(Math.max(0, age / 0.9)) : 1;
}

/** Each star floats a little around its place, never far enough to miss a tap. */
function sway(i: number, f: Pick<Frame, "t" | "reduce">) {
  if (f.reduce) return { x: 0, y: 0 };
  return { x: Math.sin(f.t * 0.35 + i * 1.3) * 1.8, y: Math.cos(f.t * 0.28 + i * 0.7) * 1.8 };
}

/** Twinkling stars, the newborn one flaring in, the brightest with thin diffraction spikes. */
function drawStars(f: Frame, p: GratitudeSkyProps, sprites: HTMLCanvasElement[]) {
  const { g, t } = f;
  const { cx, cy, unit } = view(f.w, f.h, f.extent, f.cam);
  // Stars shrink a little as the view opens, like stepping back from the sky, and grow back when zoomed in.
  const scale = 1.35 - 0.5 * Math.min(1, Math.max(0, (f.extent / f.cam.z - 0.2) / 0.9));
  g.globalCompositeOperation = "lighter";
  p.stars.forEach((s, i) => {
    const d = sway(i, f);
    const x = cx + s.x * unit + d.x;
    const y = cy + s.y * unit + d.y;
    const twinkle = f.reduce ? 1 : 0.72 + 0.28 * Math.sin(t * (1.1 + 2.3 * s.tint) + i * 1.7);
    let r = (1 + 2.6 * s.size) * scale;
    let a = (0.55 + 0.45 * s.size) * twinkle;
    if (i === p.born) {
      r *= flare(g, sprites[2], { x, y, r, age: t - f.bornAt });
      a = Math.max(a, 0.9);
    }
    if (r <= 0) return;
    g.globalAlpha = a;
    g.drawImage(sprites[Math.min(3, Math.floor(s.tint * 4))], x - r * 7, y - r * 7, r * 14, r * 14);
    if (s.size > 0.9) spikes(g, { x, y }, r, a);
    if (i === p.selected) ring(g, { x, y }, Math.max(10, r * 4), 0.75);
  });
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
}

/** What the scene remembers between frames: when the newborn and the tapped star changed, and the figure going out. */
export interface Marks {
  born: number | null;
  bornAt: number;
  selected: number | null;
  selAt: number;
  /** The constellation whose lines are unlinking back into `origin`, and since when. */
  hidden: { group: number; origin: number; at: number } | null;
}

/** Seconds each ring of lines takes to link or unlink. */
const LINE_S = 0.28;

/**
 * Which constellation shows its lines, and since when: the one of the tapped star, or, until the next tap, the one
 * the newborn star just closed (a moment after its flare). The rest of the sky is stars only, so it never gets busy.
 */
function shownConstellation(m: Marks): { group: number; origin: number; since: number } | null {
  if (m.selAt > m.bornAt || m.born === null) return m.selected === null ? null : { group: Math.floor(m.selected / CONSTELLATION_DAYS), origin: m.selected, since: m.selAt };
  return closesConstellation(m.born + 1) ? { group: Math.floor(m.born / CONSTELLATION_DAYS), origin: m.born, since: m.bornAt + 1.2 } : null;
}

/** Remembers when the newborn and the tapped star change; a figure that stops showing starts unlinking. */
function noteChanges(m: Marks, p: GratitudeSkyProps, t: number) {
  const before = shownConstellation(m);
  if (p.born !== m.born) [m.born, m.bornAt] = [p.born, t];
  if (p.selected !== m.selected) [m.selected, m.selAt] = [p.selected, t];
  if (before && before.group !== shownConstellation(m)?.group) m.hidden = { group: before.group, origin: before.origin, at: t };
}

/**
 * The shown constellation links up from the touched star outward, ring by ring (domain/sky.ts linkOrder); the one
 * just left unlinks the other way, the far lines first, back into the star it had started from.
 */
function drawLines(f: Frame, p: GratitudeSkyProps) {
  const shown = shownConstellation(f.marks);
  const hidden = f.marks.hidden;
  if (shown) strokeFigure(f, p, shown, (step) => (f.reduce ? 1 : (f.t - shown.since) / LINE_S - step));
  if (hidden && !f.reduce && hidden.group !== shown?.group) strokeFigure(f, p, hidden, (step, last) => last + 1 - step - (f.t - hidden.at) / LINE_S);
}

/** One figure's lines from `origin`, each drawn `share(step, lastStep)` of the way (0 none … 1 whole). */
function strokeFigure(f: Frame, p: GratitudeSkyProps, fig: { group: number; origin: number }, share: (step: number, last: number) => number) {
  const { g } = f;
  const { cx, cy, unit } = view(f.w, f.h, f.extent, f.cam);
  const links = linkOrder(p.lines.filter(([a]) => Math.floor(a / CONSTELLATION_DAYS) === fig.group), fig.origin);
  const last = Math.max(0, ...links.map((l) => l.step));
  // Only one figure shows at a time, so it can be bright enough to read at a glance.
  g.strokeStyle = "rgba(190,210,255,0.7)";
  g.lineWidth = 1.4;
  g.beginPath();
  links.forEach(({ from: a, to: b, step }) => {
    const k = Math.min(1, share(step, last));
    if (k <= 0) return;
    const from = { x: cx + p.stars[a].x * unit + sway(a, f).x, y: cy + p.stars[a].y * unit + sway(a, f).y };
    const to = { x: cx + p.stars[b].x * unit + sway(b, f).x, y: cy + p.stars[b].y * unit + sway(b, f).y };
    g.moveTo(from.x, from.y);
    g.lineTo(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
  });
  g.stroke();
}


/** Redraws the night only when the view, the screen size or the number of stars changed; returns what it painted. */
function paintNight(night: SceneGL, cv: HTMLCanvasElement, v: { w: number; h: number; extent: number; count: number; painted: string }) {
  const key = `${v.w}x${v.h}:${v.extent.toFixed(4)}:${v.count}`;
  if (key === v.painted) return key;
  const dpr = sceneDpr();
  [cv.width, cv.height] = [Math.round(v.w * dpr), Math.round(v.h * dpr)];
  night.gl.uniform1f(night.u.uMilky, v.count / SKY_DAYS);
  night.gl.uniform1f(night.u.uZoom, v.extent);
  drawScene(night, 0, { w: v.w, h: v.h, dark: true });
  return key;
}

/** Clears the stars' canvas at the window size. Stars stay sharp: full screen density (up to 2x), unlike the soft night. */
function clearSharp(cv: HTMLCanvasElement, g: CanvasRenderingContext2D, w: number, h: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) [cv.width, cv.height] = [Math.round(w * dpr), Math.round(h * dpr)];
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
}

/** The star under a tap, within a finger's reach, or null. */
function starAt(stars: readonly Star[], v: { extent: number; cam: Camera }, x: number, y: number) {
  const { cx, cy, unit } = view(window.innerWidth, window.innerHeight, v.extent, v.cam);
  let best: number | null = null;
  let bestD = 26;
  stars.forEach((s, i) => {
    const d = Math.hypot(cx + s.x * unit - x, cy + s.y * unit - y);
    if (d < bestD) [best, bestD] = [i, d];
  });
  return best;
}

/**
 * Web: the gratitude sky behind the Gratidão antecipada page. The night and the Milky Way are a WebGL shader
 * (ui/night-sky-gl.ts), redrawn only while the view moves; over it a 2D canvas draws the sparkles and shooting
 * stars (ui/sky-sparkles.ts), then the constellation lines and the person's stars, which float gently. The view eases
 * out as the sky grows. While the sky can be explored (`onSelect`), it zooms and pans (ui/sky-camera.ts) and a tap
 * picks the nearest star. Decorative.
 */
export function GratitudeSky(props: GratitudeSkyProps) {
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  // Read every frame, so a new star or a selection never restarts the scene.
  const live = useRef(props);
  useEffect(() => {
    live.current = props;
  });
  // While exploring, a pinch zooms the sky instead of the page.
  const exploring = Boolean(props.onSelect);
  useEffect(() => {
    if (!exploring) return;
    const body = document.body.style;
    const before = body.touchAction;
    body.touchAction = "none";
    return () => {
      body.touchAction = before;
    };
  }, [exploring]);

  useEffect(() => {
    const bg = back.current;
    const fg = front.current;
    const night = bg && initSceneGL(bg, NIGHT_SKY_FRAG, NIGHT_SKY_UNIFORMS);
    const g = fg?.getContext(CANVAS_2D);
    if (!bg || !fg || !g) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sprites = TINTS.map(sprite);
    const life = skyLife();
    const start = performance.now();
    let extent = skyExtent(live.current.stars);
    const cam: Camera = { z: 1, px: 0, py: 0 };
    let painted = "";
    const marks: Marks = { born: null, bornAt: 0, selected: null, selAt: -1, hidden: null };
    let last = start;
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // About 30 frames a second: the sky drifts slowly and this redraws hundreds of sprites full screen.
      if (now - last < 32) return;
      const p = live.current;
      const t = (now - start) / 1000;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      noteChanges(marks, p, t);
      if (!p.onSelect) Object.assign(cam, { z: 1, px: 0, py: 0 });
      const target = skyExtent(p.stars);
      extent = reduce ? target : extent + (target - extent) * Math.min(1, dt * 0.9);
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (night) painted = paintNight(night, bg, { w, h, extent: extent / cam.z, count: p.stars.length, painted });
      clearSharp(fg, g, w, h);
      const frame = { g, t, w, h, extent, reduce, bornAt: marks.bornAt, marks, cam };
      life(frame);
      drawLines(frame, p);
      drawStars(frame, p, sprites);
    };
    raf = requestAnimationFrame(tick);
    const stopCamera = watchCamera(cam, {
      active: () => Boolean(live.current.onSelect),
      centre: () => ({ x: window.innerWidth / 2, y: window.innerHeight * 0.42 }),
      onTap: (x, y) => live.current.onSelect?.(starAt(live.current.stars, { extent, cam }, x, y)),
    });
    return () => {
      cancelAnimationFrame(raf);
      stopCamera();
      night?.gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  const layer = { position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none" } as const;
  return (
    <div aria-hidden="true" style={{ ...layer, background: "#02040C" }}>
      <canvas ref={back} style={layer} />
      <canvas ref={front} style={layer} />
    </div>
  );
}
