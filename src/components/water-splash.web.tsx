import { useEffect } from "react";

import { SceneOverlay } from "./scene-overlay.web";
import { FALL_S, SPLASH_S, WATER_FRAG } from "./ui/water-splash-gl";

interface Props {
  /** Called when the splash has played: time to unmount. */
  onDone: () => void;
}

/** The page dips as the drop lands, then settles in damped swells like a water surface. */
const WOBBLE: Keyframe[] = [
  { transform: "none" },
  { transform: "translateY(4px) scale(.994)" },
  { transform: "translateY(-2.5px) scale(1.003)" },
  { transform: "translateY(1.5px)" },
  { transform: "translateY(-.8px)" },
  { transform: "translateY(.3px)" },
  { transform: "none" },
];

/** Web: a WebGL drop falls to the middle of the screen and the page turns to water (see ui/water-splash-gl.ts). */
export function WaterSplash({ onDone }: Props) {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Tabs stay mounted, so several pages may carry the id; the hidden ones just wobble unseen.
    const pages = document.querySelectorAll<HTMLElement>('[id="screen-content"]');
    const runs = [...pages].map((el) => el.animate(WOBBLE, { duration: 1300, delay: FALL_S * 1000, easing: "ease-out" }));
    return () => runs.forEach((run) => run.cancel());
  }, []);
  return <SceneOverlay frag={WATER_FRAG} duration={SPLASH_S} onDone={onDone} />;
}
