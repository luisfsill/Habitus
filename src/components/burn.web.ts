/**
 * Web: burns an element away. An SVG filter eats it in irregular patches (turbulence noise against a rising
 * threshold) with a glowing orange edge running ahead of the burn, then calls `done`. Purely visual.
 */

const NS = "http://www.w3.org/2000/svg";
let counter = 0;

function el(name: string, attrs: Record<string, string>, parent: Element): Element {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent.appendChild(node);
  return node;
}

/** Turns `noise` into an alpha mask that keeps what is above the threshold; returns the funcA node to animate. */
function threshold(filter: Element, inName: string, result: string): Element {
  const transfer = el("feComponentTransfer", { in: inName, result }, filter);
  return el("feFuncA", { type: "linear", slope: "10", intercept: "10" }, transfer);
}

/** Charred band (still there, scorched brown), the orange burning edge with its glow, and a thin hot core. */
function colorLayers(filter: Element) {
  el("feComposite", { in: "keep", in2: "sound", operator: "out", result: "charMask" }, filter);
  el("feFlood", { "flood-color": "#2A1206", "flood-opacity": "0.9", result: "brown" }, filter);
  el("feComposite", { in: "brown", in2: "charMask", operator: "in", result: "char" }, filter);
  // The burning edge: what is about to go but has not gone yet.
  el("feComposite", { in: "ahead", in2: "keep", operator: "out", result: "edge" }, filter);
  el("feFlood", { "flood-color": "#FF8A2A", result: "orange" }, filter);
  el("feComposite", { in: "orange", in2: "edge", operator: "in", result: "fire" }, filter);
  el("feGaussianBlur", { in: "fire", stdDeviation: "3", result: "glow" }, filter);
  // A thin yellow-white core along the burning line.
  el("feMorphology", { in: "edge", operator: "erode", radius: "1", result: "core" }, filter);
  el("feFlood", { "flood-color": "#FFE7A0", result: "yellow" }, filter);
  el("feComposite", { in: "yellow", in2: "core", operator: "in", result: "hot" }, filter);
}

function buildFilter(id: string) {
  const svg = el("svg", { width: "0", height: "0", style: "position:absolute" }, document.body);
  const filter = el("filter", { id, x: "-10%", y: "-10%", width: "120%", height: "120%", "color-interpolation-filters": "sRGB" }, svg);
  el("feTurbulence", { type: "fractalNoise", baseFrequency: "0.025", numOctaves: "2", seed: "4", result: "noise" }, filter);
  // Noise into the alpha channel.
  el("feColorMatrix", { in: "noise", type: "matrix", values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.3", result: "n" }, filter);
  const keep = threshold(filter, "n", "keep");
  const ahead = threshold(filter, "n", "ahead");
  const sound = threshold(filter, "n", "sound");
  colorLayers(filter);
  el("feComposite", { in: "SourceGraphic", in2: "keep", operator: "in", result: "left" }, filter);
  const merge = el("feMerge", {}, filter);
  for (const n of ["left", "char", "glow", "fire", "hot"]) el("feMergeNode", { in: n }, merge);
  return { svg, keep, ahead, sound };
}

export function burnAway(node: unknown, ms: number, done: () => void): void {
  const target = node as HTMLElement | null;
  if (!target?.style) return done();
  const id = `burn-${++counter}`;
  // Two copies, swapped every frame: WebKit (iPhone) does not repaint an element when only the attributes of its
  // filter change, so the text sat still and then vanished. A new filter url makes it redraw.
  const filters = [buildFilter(`${id}a`), buildFilter(`${id}b`)];
  const start = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const p = Math.min((now - start) / ms, 1);
    // Threshold climbs from "keep all" to "keep nothing"; the edge band runs a little ahead of it.
    const t = -0.1 + p * 1.25;
    for (const { keep, ahead, sound } of filters) {
      keep.setAttribute("intercept", String(-t * 10));
      ahead.setAttribute("intercept", String(-(t - 0.08) * 10));
      sound.setAttribute("intercept", String(-(t + 0.06) * 10));
    }
    target.style.filter = `url(#${id}${++frame % 2 ? "a" : "b"})`;
    if (p < 1) return void requestAnimationFrame(tick);
    target.style.opacity = "0";
    target.style.filter = "";
    for (const { svg } of filters) svg.remove();
    done();
  };
  tick(start);
}
