/**
 * Turtle, jellyfish and manta ray of the page's sea (sea-cast.ts), drawn in units of their size around the origin,
 * heading towards +x (jellyfish go up). `ph` is the stroke phase: flippers row, the bell pulses, wings beat.
 * Web only (2D canvas).
 */

const TAU = Math.PI * 2;

/** Blotches on the shell: x, y, radius. */
const MOTTLE = [
  [-0.16, -0.1, 0.06],
  [-0.02, -0.15, 0.07],
  [0.12, -0.11, 0.06],
  [-0.08, -0.04, 0.05],
  [0.06, -0.05, 0.05],
  [0.2, -0.05, 0.04],
  [-0.22, -0.03, 0.04],
];

/**
 * Sea turtle seen from the side: a low domed shell, the head reaching forward and the long front flippers beating up
 * and down like wings (the far one darker, behind the shell); the back flippers trail and steer.
 */
export function drawTurtle(g: CanvasRenderingContext2D, ph: number) {
  const beat = Math.sin(ph);
  // A tapered flipper from its shoulder, `angle` down from pointing straight back.
  const flipper = (x: number, y: number, len: number, angle: number, color: string) => {
    g.save();
    g.translate(x, y);
    g.rotate(Math.PI - angle);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, -0.025);
    g.quadraticCurveTo(len * 0.45, -0.06, len, -0.005);
    g.quadraticCurveTo(len * 0.5, 0.05, 0, 0.03);
    g.closePath();
    g.fill();
    g.restore();
  };
  flipper(0.13, 0.02, 0.36, -0.5 + 0.75 * beat, "#3E4029");
  flipper(-0.22, 0.04, 0.12, 0.35 + 0.15 * Math.sin(ph + 2), "#3E4029");
  // Neck and head.
  const skin = g.createLinearGradient(0, -0.06, 0, 0.06);
  skin.addColorStop(0, "#6E6A45");
  skin.addColorStop(1, "#A7A27A");
  g.fillStyle = skin;
  g.beginPath();
  g.moveTo(0.22, -0.04);
  g.quadraticCurveTo(0.33, -0.07, 0.43, -0.04);
  g.quadraticCurveTo(0.48, -0.01, 0.44, 0.025);
  g.quadraticCurveTo(0.34, 0.045, 0.22, 0.035);
  g.closePath();
  g.fill();
  g.fillStyle = "#1A1A12";
  g.beginPath();
  g.arc(0.41, -0.025, 0.01, 0, TAU);
  g.fill();
  // Shell: high dome on top, the flatter plastron below.
  const shell = new Path2D();
  shell.moveTo(-0.32, 0.03);
  shell.bezierCurveTo(-0.3, -0.17, 0.18, -0.24, 0.27, 0.0);
  shell.quadraticCurveTo(0.02, 0.09, -0.32, 0.03);
  const shade = g.createLinearGradient(0, -0.2, 0, 0.07);
  shade.addColorStop(0, "#6B5E38");
  shade.addColorStop(0.75, "#3F3922");
  shade.addColorStop(1, "#8E8662");
  g.fillStyle = shade;
  g.fill(shell);
  g.save();
  g.clip(shell);
  g.fillStyle = "rgba(150,120,70,0.35)";
  for (const [x, y, r] of MOTTLE) {
    g.beginPath();
    g.ellipse(x, y, r, r * 0.6, 0, 0, TAU);
    g.fill();
  }
  // Pale rim along the edge of the shell.
  g.strokeStyle = "rgba(200,190,150,0.35)";
  g.lineWidth = 0.014;
  g.beginPath();
  g.moveTo(-0.32, 0.03);
  g.quadraticCurveTo(0.02, 0.07, 0.27, 0.0);
  g.stroke();
  g.restore();
  flipper(0.11, 0.04, 0.4, -0.35 + 0.8 * beat, "#5E5C3C");
  flipper(-0.24, 0.05, 0.13, 0.45 + 0.18 * Math.sin(ph + 2), "#5E5C3C");
}

export interface JellyLook {
  /** "r,g,b" */
  color: string;
  tentacles: number;
  /** Tentacle length, in bell widths. */
  len: number;
  /** The four rings of a moon jelly. */
  rings?: boolean;
}

export const JELLIES: JellyLook[] = [
  { color: "205,228,255", tentacles: 18, len: 0.45, rings: true },
  { color: "255,170,210", tentacles: 10, len: 1.6 },
  { color: "196,150,255", tentacles: 12, len: 1.3 },
  { color: "255,190,120", tentacles: 8, len: 2.1 },
  { color: "140,200,255", tentacles: 12, len: 1.1 },
];

/** Half the size of the box a jellyfish fits in, in bell widths. */
export const jellyHalf = (look: JellyLook) => Math.max(0.65, (look.len + 0.65) / 2 + 0.08);

/** A jellyfish, its bell squeezing on each stroke, tentacles and frilly arms trailing below. */
export function drawJelly(g: CanvasRenderingContext2D, look: JellyLook, ph: number) {
  const pulse = Math.max(0, Math.sin(ph)) ** 2;
  const w = 0.5 * (1 - 0.16 * pulse);
  const hh = 0.5 * (1 + 0.14 * pulse);
  const c = look.color;
  g.translate(0, -(look.len - 0.6) / 2);
  g.lineCap = "round";
  // Tentacles wave later the further down they are.
  g.strokeStyle = `rgba(${c},0.45)`;
  g.lineWidth = 0.012;
  for (let i = 0; i < look.tentacles; i++) {
    const x0 = -w * 0.92 + (i / (look.tentacles - 1)) * w * 1.84;
    g.beginPath();
    g.moveTo(x0, 0);
    for (let k = 1; k <= 10; k++) {
      const d = k / 10;
      g.lineTo(x0 * (1 - 0.25 * d) + Math.sin(ph * 0.8 - k * 0.6 + i) * 0.05 * d * (1 + look.len), d * look.len);
    }
    g.stroke();
  }
  g.strokeStyle = `rgba(${c},0.35)`;
  g.lineWidth = 0.06;
  for (let i = 0; i < 4; i++) {
    const x0 = (i - 1.5) * 0.06;
    g.beginPath();
    g.moveTo(x0, -0.02);
    for (let k = 1; k <= 8; k++)
      g.lineTo(x0 + Math.sin(ph * 0.7 - k * 0.8 + i * 1.7) * 0.04, (k / 8) * (0.25 + look.len * 0.45));
    g.stroke();
  }
  const bell = new Path2D();
  bell.moveTo(-w, 0);
  bell.bezierCurveTo(-w, -hh * 1.3, w, -hh * 1.3, w, 0);
  for (let k = 1; k <= 8; k++) {
    const x = w - (k / 8) * 2 * w;
    bell.quadraticCurveTo(x + w / 8, 0.05, x, 0);
  }
  const fill = g.createRadialGradient(0, -hh * 0.55, 0.02, 0, -hh * 0.4, w * 1.1);
  fill.addColorStop(0, `rgba(${c},0.55)`);
  fill.addColorStop(0.7, `rgba(${c},0.25)`);
  fill.addColorStop(1, `rgba(${c},0.4)`);
  g.fillStyle = fill;
  g.fill(bell);
  g.strokeStyle = "rgba(255,255,255,0.4)";
  g.lineWidth = 0.014;
  g.stroke(bell);
  if (look.rings) {
    g.strokeStyle = "rgba(255,160,200,0.55)";
    g.lineWidth = 0.02;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + 0.4;
      g.beginPath();
      g.arc(Math.cos(a) * 0.12, -hh * 0.42 + Math.sin(a) * 0.08, 0.055, 0, TAU);
      g.stroke();
    }
  }
  g.fillStyle = "rgba(255,255,255,0.22)";
  g.beginPath();
  g.ellipse(-w * 0.35, -hh * 0.85, w * 0.22, hh * 0.12, -0.5, 0, TAU);
  g.fill();
}

/** Manta ray seen from above, wings beating slowly, the long thin tail behind. */
export function drawManta(g: CanvasRenderingContext2D, ph: number) {
  const f = Math.sin(ph);
  const span = 0.5 * (1 - 0.12 * Math.abs(f));
  const tip = -0.05 - 0.08 * f;
  g.strokeStyle = "#1C2633";
  g.lineWidth = 0.012;
  g.beginPath();
  g.moveTo(-0.2, 0);
  g.quadraticCurveTo(-0.4, 0.04 * f, -0.6, 0);
  g.stroke();
  const m = new Path2D();
  m.moveTo(0.28, -0.07);
  m.quadraticCurveTo(0.12, -span * 0.55, tip, -span);
  m.quadraticCurveTo(-0.06, -span * 0.45, -0.2, -0.07);
  m.lineTo(-0.2, 0.07);
  m.quadraticCurveTo(-0.06, span * 0.45, tip, span);
  m.quadraticCurveTo(0.12, span * 0.55, 0.28, 0.07);
  m.closePath();
  const back = g.createLinearGradient(0, -span, 0, span);
  back.addColorStop(0, "#2A3646");
  back.addColorStop(0.5, "#18212D");
  back.addColorStop(1, "#2A3646");
  g.fillStyle = back;
  g.fill(m);
  for (const s of [-1, 1]) {
    g.fillStyle = "#18212D";
    g.beginPath();
    g.ellipse(0.3, s * 0.06, 0.05, 0.02, s * 0.4, 0, TAU);
    g.fill();
    // The pale shoulder patches of a manta's back.
    g.fillStyle = "rgba(230,235,240,0.3)";
    g.beginPath();
    g.ellipse(0.08, s * 0.16, 0.07, 0.035, s * 0.6, 0, TAU);
    g.fill();
  }
}
