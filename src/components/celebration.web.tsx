import { useEffect } from "react";

import type { TrickIndex } from "@/domain/tricks";

import { SceneOverlay } from "./scene-overlay.web";
import { SUN_FRAG, SUN_S } from "./ui/sun-rays-gl";

interface Props {
  trick: TrickIndex;
  /** Called when the celebration has played: time to unmount. */
  onDone: () => void;
}

// Tips that have their own scene so far.
const SCENES: Partial<Record<TrickIndex, { frag: string; duration: number }>> = {
  0: { frag: SUN_FRAG, duration: SUN_S },
};

/** Web: the full-screen scene for a finished tip (Sorria: sun rays). Tips without a scene end at once. */
export function Celebration({ trick, onDone }: Props) {
  const scene = SCENES[trick];
  useEffect(() => {
    if (!scene) onDone();
  }, [scene, onDone]);
  return scene ? <SceneOverlay frag={scene.frag} duration={scene.duration} onDone={onDone} /> : null;
}
