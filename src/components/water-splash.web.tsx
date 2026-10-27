import { SceneOverlay } from "./scene-overlay.web";
import { SPLASH_S, WATER_FRAG } from "./ui/water-splash-gl";

interface Props {
  /** Called when the splash has played: time to unmount. */
  onDone: () => void;
}

/** Web: a WebGL drop falls to the middle of the screen and the page turns to water (see ui/water-splash-gl.ts). */
export function WaterSplash({ onDone }: Props) {
  return <SceneOverlay frag={WATER_FRAG} duration={SPLASH_S} onDone={onDone} />;
}
