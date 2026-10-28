/**
 * The living part of the gratitude sky's background (gratitude-sky.web.tsx), drawn on its 2D canvas each frame:
 * far-away sparkles that fade in, drift slowly and fade out somewhere else, and shooting stars that cross the sky
 * from anywhere, in any direction, a few at a time. With "reduce motion" the sparkles hold still and no star shoots.
 * Web only.
 */

export interface SkyFrame {
  g: CanvasRenderingContext2D;
  /** Seconds since the scene started. */
  t: number;
  w: number;
  h: number;
  reduce: boolean;
}

interface Sparkle {
  /** Position as a fraction of the screen, so a resize keeps them spread. */
  x: number;
  y: number;
  /** Drift, in screen fractions per second. */
  vx: number;
  vy: number;
  born: number;
  life: number;
  size: number;
  warm: boolean;
}

const SPARKLES = 140;
/** The whole field drifts the same slow way, like the sky turning; each sparkle adds a little of its own. */
const DRIFT = { x: 0.004, y: -0.0015 };

function newSparkle(t: number, spread: boolean): Sparkle {
  const life = 3 + Math.random() * 6;
  return {
    x: Math.random(),
    y: Math.random() * 0.9,
    vx: DRIFT.x + (Math.random() - 0.5) * 0.006,
    vy: DRIFT.y + (Math.random() - 0.5) * 0.004,
    // At the start they are caught mid-life, so the sky is not empty for the first seconds.
    born: spread ? t - Math.random() * life : t,
    life,
    size: 0.4 + Math.random() ** 3 * 1.4,
    warm: Math.random() < 0.25,
  };
}

/** Sparkles that come and go: each fades in, twinkles while it drifts, fades out and is born again elsewhere. */
export function sparkleField() {
  let field: Sparkle[] = [];
  return (f: SkyFrame) => {
    if (field.length === 0) field = Array.from({ length: SPARKLES }, () => newSparkle(f.t, true));
    const { g } = f;
    g.globalCompositeOperation = "lighter";
    field.forEach((s, i) => {
      let age = f.reduce ? s.life / 2 : f.t - s.born;
      if (age > s.life) {
        field[i] = newSparkle(f.t, false);
        age = 0;
      }
      const k = age / s.life;
      const x = (s.x + s.vx * age) * f.w;
      const y = (s.y + s.vy * age) * f.h;
      const twinkle = f.reduce ? 1 : 0.6 + 0.4 * Math.sin(f.t * (4 + i % 5) + i);
      const a = Math.sin(Math.PI * k) ** 1.5 * twinkle * 0.85;
      g.globalAlpha = a;
      g.fillStyle = s.warm ? "#FFE9C8" : "#DCE7FF";
      g.beginPath();
      g.arc(x, y, s.size, 0, Math.PI * 2);
      g.fill();
      // The brighter ones get a faint cross of light at their peak.
      if (s.size > 1.2) {
        g.globalAlpha = a * 0.35;
        g.fillRect(x - s.size * 4, y - 0.3, s.size * 8, 0.6);
        g.fillRect(x - 0.3, y - s.size * 4, 0.6, s.size * 8);
      }
    });
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  };
}

interface Meteor {
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  born: number;
  life: number;
  length: number;
  width: number;
  bright: number;
}

/** At most this many in the sky at once. */
const MAX_METEORS = 4;

/** A shooting star from a random place in the upper sky, heading any way, at its own speed, length and brightness. */
function newMeteor(f: SkyFrame): Meteor {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: f.w * (0.05 + Math.random() * 0.9),
    y: f.h * (0.03 + Math.random() * 0.6),
    dx: Math.cos(angle),
    // Mostly falling: one that would climb steeply is flattened.
    dy: Math.max(Math.sin(angle), -0.35),
    speed: 350 + Math.random() * 550,
    born: f.t,
    life: 0.5 + Math.random() * 0.8,
    length: 60 + Math.random() * 140,
    width: 0.8 + Math.random() * 1.2,
    bright: 0.5 + Math.random() * 0.5,
  };
}

function drawMeteor(g: CanvasRenderingContext2D, m: Meteor, t: number) {
  const age = t - m.born;
  const k = age / m.life;
  const head = { x: m.x + m.dx * m.speed * age, y: m.y + m.dy * m.speed * age };
  // The trail grows, then shrinks as the meteor burns out.
  const len = m.length * Math.sin(Math.PI * Math.min(1, k));
  const tail = { x: head.x - m.dx * len, y: head.y - m.dy * len };
  const fade = Math.min(1, (1 - k) * 3) * m.bright;
  const grad = g.createLinearGradient(head.x, head.y, tail.x, tail.y);
  grad.addColorStop(0, `rgba(255,255,255,${fade})`);
  grad.addColorStop(0.3, `rgba(200,220,255,${fade * 0.5})`);
  grad.addColorStop(1, "rgba(200,220,255,0)");
  g.strokeStyle = grad;
  g.lineWidth = m.width;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(head.x, head.y);
  g.lineTo(tail.x, tail.y);
  g.stroke();
  glowingHead(g, head, m.width * 1.1, fade);
}

function glowingHead(g: CanvasRenderingContext2D, at: { x: number; y: number }, r: number, alpha: number) {
  g.globalAlpha = alpha;
  g.fillStyle = "#FFFFFF";
  g.beginPath();
  g.arc(at.x, at.y, r, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
}

/** Shooting stars every second or few, from all over the sky; sometimes two or three cross at once. */
export function meteorShower() {
  let meteors: Meteor[] = [];
  let next = 1 + Math.random() * 2;
  return (f: SkyFrame) => {
    if (f.reduce) return;
    if (f.t >= next) {
      if (meteors.length < MAX_METEORS) meteors.push(newMeteor(f));
      next = f.t + 0.8 + Math.random() * 3.2;
    }
    meteors = meteors.filter((m) => f.t - m.born < m.life);
    f.g.globalCompositeOperation = "lighter";
    meteors.forEach((m) => drawMeteor(f.g, m, f.t));
    f.g.globalCompositeOperation = "source-over";
  };
}

/** Everything that moves behind the person's stars: sparkles, then shooting stars. */
export function skyLife() {
  const sparkles = sparkleField();
  const meteors = meteorShower();
  return (f: SkyFrame) => {
    sparkles(f);
    meteors(f);
  };
}
