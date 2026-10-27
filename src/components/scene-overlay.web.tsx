import { useEffect, useRef } from "react";

import { useTheme } from "@/theme";

import { drawScene, initSceneGL, sceneDpr } from "./ui/fullscreen-gl";

interface Props {
  /** Fragment shader of the scene (see ui/fullscreen-gl.ts for its uniforms). */
  frag: string;
  /** Seconds the scene lasts. */
  duration: number;
  /** Called when the scene has played: time to unmount. */
  onDone: () => void;
}

/**
 * Web: plays a full-screen WebGL scene once over the page, without catching taps. Without WebGL, or with
 * reduced motion, it ends at once. Purely decorative.
 */
export function SceneOverlay({ frag, duration, onDone }: Props) {
  const { scheme } = useTheme();
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    const glc = cv && !matchMedia("(prefers-reduced-motion: reduce)").matches ? initSceneGL(cv, frag) : null;
    if (!cv || !glc) {
      onDone();
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    cv.width = Math.round(w * sceneDpr());
    cv.height = Math.round(h * sceneDpr());
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      if (t >= duration) return onDone();
      drawScene(glc, t, { w, h, dark: scheme === "dark" });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      glc.gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Plays once per mount; a new scene remounts with a new key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvas} aria-hidden="true" style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 30 }} />;
}
