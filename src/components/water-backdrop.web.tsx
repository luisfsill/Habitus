import { useEffect, useRef } from "react";

import { palettes } from "@/theme";

import { initSceneGL } from "./ui/fullscreen-gl";
import { BACKDROP_FRAG } from "./ui/water-backdrop-gl";

interface Props {
  scheme: "light" | "dark";
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
 * Web: live water behind the whole app, one fixed canvas the root layout keeps mounted (one shader for every
 * screen, see ui/water-backdrop-gl.ts). Paused while the tab is hidden; with "reduce motion" it draws one still frame.
 */
export function WaterBackdrop({ scheme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    const scene = cv ? initSceneGL(cv, BACKDROP_FRAG, ["uBase"]) : null;
    if (!cv || !scene) return;
    const { gl, u } = scene;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
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
      gl.uniform2f(u.uC, w / 2, h / 2);
      gl.uniform1f(u.uDark, scheme === "dark" ? 1 : 0);
      gl.uniform3f(u.uBase, ...rgb(palettes[scheme].background));
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
    run();
    document.addEventListener("visibilitychange", run);
    window.addEventListener("resize", redraw);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("resize", redraw);
    };
  }, [scheme]);

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
