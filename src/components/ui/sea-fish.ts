/**
 * Fish of the page's sea (sea-cast.ts), from small reef fish to big open-water ones. Drawn side-on in units of the
 * fish's length, head towards +x, the tail sweeping with the beat phase. Web only (2D canvas).
 */

const TAU = Math.PI * 2;

type Marks = (g: CanvasRenderingContext2D, h: number) => void;

export interface Species {
  /** Half the body height, in lengths. */
  h: number;
  top: string;
  belly: string;
  fin: string;
  tail: string;
  /** Height of the dorsal and anal fins, 1 = usual. */
  tall?: number;
  /** Pattern painted over the body (clipped to it). */
  marks?: Marks;
}

const bands =
  (xs: number[]): Marks =>
  (g, h) => {
    for (const x of xs) {
      g.fillStyle = "#15110e";
      g.fillRect(x - 0.05, -h * 1.2, 0.1, h * 2.4);
      g.fillStyle = "#FBFAF7";
      g.fillRect(x - 0.035, -h * 1.2, 0.07, h * 2.4);
    }
  };

const stripes =
  (xs: number[], color: string, w: number): Marks =>
  (g, h) => {
    g.fillStyle = color;
    for (const x of xs) g.fillRect(x - w / 2, -h * 1.2, w, h * 2.4);
  };

/** The silver line along the side of open-water fish. */
const shine: Marks = (g, h) => {
  g.fillStyle = "rgba(232,242,250,0.35)";
  g.fillRect(-0.36, -h * 0.18, 0.86, h * 0.2);
};

const SPOTS = [
  [0.3, -0.5, 0.025],
  [0.18, 0.1, 0.03],
  [0.08, -0.6, 0.03],
  [0.02, 0.45, 0.028],
  [-0.06, -0.15, 0.035],
  [-0.15, 0.5, 0.025],
  [-0.2, -0.5, 0.025],
  [0.24, 0.55, 0.02],
  [-0.27, 0.05, 0.02],
  [0.12, -0.2, 0.022],
];

const spots: Marks = (g, h) => {
  g.fillStyle = "rgba(42,26,16,0.45)";
  for (const [x, y, r] of SPOTS) {
    g.beginPath();
    g.arc(x, y * h, r, 0, TAU);
    g.fill();
  }
};

/** The blue tang's dark "palette" mark. */
const tangMark: Marks = (g, h) => {
  g.strokeStyle = "#0B1230";
  g.lineCap = "round";
  g.lineWidth = h * 0.3;
  g.beginPath();
  g.moveTo(0.3, -h * 0.5);
  g.quadraticCurveTo(0.02, -h * 0.05, -0.24, -h * 0.45);
  g.moveTo(0.04, -h * 0.2);
  g.quadraticCurveTo(-0.04, h * 0.35, -0.22, h * 0.15);
  g.stroke();
};

/** Pink lines on the parrotfish's face. */
const parrotMark: Marks = (g, h) => {
  g.strokeStyle = "#F9A8D4";
  g.lineWidth = 0.025;
  g.beginPath();
  g.moveTo(0.48, -h * 0.1);
  g.quadraticCurveTo(0.36, -h * 0.5, 0.24, -h * 0.75);
  g.moveTo(0.47, h * 0.15);
  g.quadraticCurveTo(0.35, h * 0.35, 0.24, h * 0.62);
  g.stroke();
};

export const SPECIES = {
  sardine: {
    h: 0.12,
    top: "#29486B",
    belly: "#E3EBF2",
    fin: "rgba(160,185,205,0.7)",
    tail: "#6F8CAB",
    tall: 0.6,
    marks: shine,
  },
  clown: {
    h: 0.22,
    top: "#E8590C",
    belly: "#FF9A4D",
    fin: "#F76707",
    tail: "#F76707",
    marks: bands([0.3, 0.05, -0.22]),
  },
  tang: { h: 0.3, top: "#1D4ED8", belly: "#4F8DF7", fin: "#1E3A8A", tail: "#FACC15", marks: tangMark },
  yellow: { h: 0.4, top: "#EAB308", belly: "#FDE047", fin: "#FACC15", tail: "#F5C518", tall: 1.5 },
  angel: {
    h: 0.42,
    top: "#C7CED8",
    belly: "#F4F6F8",
    fin: "#9AA5B4",
    tail: "#C7CED8",
    tall: 2.4,
    marks: stripes([0.28, 0.06, -0.16], "rgba(20,20,26,0.85)", 0.07),
  },
  parrot: { h: 0.27, top: "#0D9488", belly: "#6EE7D8", fin: "#EC4899", tail: "#0F766E", marks: parrotMark },
  grouper: { h: 0.28, top: "#5B4636", belly: "#A6866A", fin: "#45362A", tail: "#4F3D2F", marks: spots },
  tuna: { h: 0.2, top: "#1B2840", belly: "#D9E1EA", fin: "#2A3A57", tail: "#2A3A57", tall: 0.8, marks: shine },
} satisfies Record<string, Species>;

const shapes = new Map<Species, { body: Path2D; tail: Path2D; fins: Path2D }>();

function shape(sp: Species) {
  const done = shapes.get(sp);
  if (done) return done;
  const { h } = sp;
  const f = sp.tall ?? 1;
  const t = Math.max(h * 0.85, 0.13);
  const body = new Path2D();
  body.moveTo(0.5, 0.01);
  body.bezierCurveTo(0.46, -h, 0.12, -h * 1.12, -0.1, -h * 0.85);
  body.bezierCurveTo(-0.22, -h * 0.6, -0.3, -h * 0.28, -0.34, -0.03);
  body.lineTo(-0.34, 0.03);
  body.bezierCurveTo(-0.3, h * 0.28, -0.22, h * 0.6, -0.1, h * 0.82);
  body.bezierCurveTo(0.12, h * 1.05, 0.44, h * 0.9, 0.5, 0.01);
  const tail = new Path2D();
  tail.moveTo(0.03, -0.03);
  tail.lineTo(-0.17, -t);
  tail.quadraticCurveTo(-0.1, 0, -0.17, t);
  tail.lineTo(0.03, 0.03);
  tail.closePath();
  const fins = new Path2D();
  fins.moveTo(0.3, -h * 0.85);
  fins.quadraticCurveTo(0.04, -h * (1 + 0.5 * f), -0.2, -h * (0.62 + 0.45 * f));
  fins.lineTo(-0.2, -h * 0.55);
  fins.closePath();
  fins.moveTo(0.08, h * 0.85);
  fins.quadraticCurveTo(-0.04, h * (1 + 0.35 * f), -0.22, h * (0.55 + 0.35 * f));
  fins.lineTo(-0.22, h * 0.5);
  fins.closePath();
  const out = { body, tail, fins };
  shapes.set(sp, out);
  return out;
}

/** Half the size of the box a fish of `sp` fits in, in lengths. */
export const fishHalf = (sp: Species) => Math.max(0.56, sp.h * (1 + 0.5 * (sp.tall ?? 1)) + 0.06);

export function drawFish(g: CanvasRenderingContext2D, sp: Species, ph: number) {
  const { body, tail, fins } = shape(sp);
  const { h } = sp;
  // Fins are thin and let light through.
  g.globalAlpha = 0.75;
  g.fillStyle = sp.fin;
  g.fill(fins);
  g.save();
  g.translate(-0.33, 0);
  g.rotate(Math.sin(ph) * 0.32);
  g.fillStyle = sp.tail;
  g.fill(tail);
  g.restore();
  g.globalAlpha = 1;
  const skin = g.createLinearGradient(0, -h, 0, h);
  skin.addColorStop(0, sp.top);
  skin.addColorStop(1, sp.belly);
  g.fillStyle = skin;
  g.fill(body);
  g.save();
  g.clip(body);
  sp.marks?.(g, h);
  // Volume: sunlight on the upper flank, shadow along the belly.
  const sheen = g.createRadialGradient(0.22, -h * 0.5, 0, 0.22, -h * 0.5, 0.38);
  sheen.addColorStop(0, "rgba(255,255,255,0.3)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sheen;
  g.fillRect(-0.4, -h * 1.3, 0.95, h * 2.6);
  const shade = g.createLinearGradient(0, h * 0.2, 0, h);
  shade.addColorStop(0, "rgba(0,10,20,0)");
  shade.addColorStop(1, "rgba(0,10,20,0.28)");
  g.fillStyle = shade;
  g.fillRect(-0.4, -h * 1.3, 0.95, h * 2.6);
  g.restore();
  // Gill line, a pectoral fin that keeps fluttering, and the eye.
  g.strokeStyle = "rgba(0,0,0,0.2)";
  g.lineWidth = 0.012;
  g.beginPath();
  g.arc(0.52, 0, Math.min(0.22, h * 0.9 + 0.04), 2.6, 3.7);
  g.stroke();
  g.save();
  g.translate(0.2, h * 0.3);
  g.rotate(0.6 + Math.sin(ph * 1.6) * 0.45);
  g.globalAlpha = 0.75;
  g.fillStyle = sp.fin;
  g.beginPath();
  g.ellipse(-0.06, 0, 0.08, 0.028, 0, 0, TAU);
  g.fill();
  g.restore();
  g.fillStyle = "#F8FAFC";
  g.beginPath();
  g.arc(0.38, -h * 0.22, 0.04, 0, TAU);
  g.fill();
  g.fillStyle = "#0B0F14";
  g.beginPath();
  g.arc(0.385, -h * 0.22, 0.026, 0, TAU);
  g.fill();
}
