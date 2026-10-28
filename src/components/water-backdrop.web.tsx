import { useEffect, useRef } from "react";

import { palettes } from "@/theme";

import { initSceneGL } from "./ui/fullscreen-gl";
import { BACKDROP_FRAG } from "./ui/water-backdrop-gl";

interface Props {
  scheme: "light" | "dark";
  /** The mouse stirs the water: ripples spread where it moves and, stronger, where it clicks. */
  ripples?: boolean;
}

/** The water is soft and fills the screen: half the CSS resolution is plenty and keeps phones cool. */
const SCALE = 0.5;
/** About 30 frames a second: the water drifts slowly, more would only cost battery. */
const FRAME_MS = 32;

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
}

/** Same depth gradient as the shader, for browsers without WebGL. */
const FALLBACK = {
  light: "linear-gradient(180deg,#E3F1F8 0%,#C3E2F1 45%,#CDE6F3 75%,#E3F1F8 100%)",
  dark: "linear-gradient(180deg,#041526 0%,#03233B 45%,#04203A 75%,#041526 100%)",
};

/**
 * Ripples for the shader's six `uDrops` slots (x, y, start time, strength), reused round robin: a weak one where the
 * mouse moves, a strong one where it clicks. All zero (no ripples) when `on` is false.
 */
function mouseRipples(start: number, on: () => boolean) {
  const drops = new Float32Array(24);
  let slot = 0;
  let last = { x: -1e4, y: -1e4 };
  const touch = (x: number, y: number, strength: number) => {
    if (!on()) return;
    drops.set([x, y, (performance.now() - start) / 1000, strength], slot * 4);
    slot = (slot + 1) % 6;
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || Math.hypot(e.clientX - last.x, e.clientY - last.y) < 70) return;
    last = { x: e.clientX, y: e.clientY };
    touch(e.clientX, e.clientY, 0.35);
  };
  const onDown = (e: PointerEvent) => touch(e.clientX, e.clientY, 1);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  const stop = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
  };
  return { drops, stop };
}

/**
 * Web: live water behind the whole app, one fixed canvas the root layout keeps mounted (one shader for every
 * screen, see ui/water-backdrop-gl.ts). Paused while the tab is hidden; with "reduce motion" it draws one still frame.
 */
export function WaterBackdrop({ scheme, ripples }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Read each frame, so a theme or page change does not build a new WebGL context (browsers cap how many live at once).
  const live = useRef({ scheme, ripples });
  // With "reduce motion" nothing redraws on its own, so a theme change paints its one still frame here.
  const repaint = useRef<() => void>(undefined);
  useEffect(() => {
    live.current = { scheme, ripples };
    repaint.current?.();
  }, [scheme, ripples]);

  useEffect(() => {
    const cv = canvasRef.current;
    const scene = cv ? initSceneGL(cv, BACKDROP_FRAG, ["uBase", "uDrops"]) : null;
    if (!cv || !scene) return;
    const { gl, u } = scene;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const stir = mouseRipples(start, () => !!live.current.ripples && !reduce);
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const bw = Math.round(w * SCALE);
      const bh = Math.round(h * SCALE);
      if (cv.width !== bw || cv.height !== bh) {
        cv.width = bw;
        cv.height = bh;
      }
      gl.viewport(0, 0, bw, bh);
      gl.uniform2f(u.uRes, w, h);
      gl.uniform1f(u.uDpr, SCALE);
      gl.uniform1f(u.uT, reduce ? 20 : (now - start) / 1000);
      const theme = live.current.scheme;
      gl.uniform2f(u.uC, w / 2, h / 2);
      gl.uniform1f(u.uDark, theme === "dark" ? 1 : 0);
      gl.uniform3f(u.uBase, ...rgb(palettes[theme].background));
      gl.uniform4fv(u.uDrops, stir.drops);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < FRAME_MS) return;
      last = now;
      draw(now);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (document.visibilityState !== "visible") return;
      if (reduce) draw(performance.now());
      else raf = requestAnimationFrame(tick);
    };
    const redraw = () => reduce && draw(performance.now());
    repaint.current = redraw;
    run();
    document.addEventListener("visibilitychange", run);
    window.addEventListener("resize", redraw);
    return () => {
      stir.stop();
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("resize", redraw);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        background: FALLBACK[scheme],
      }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
