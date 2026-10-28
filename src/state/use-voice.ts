import { useEffect, useRef } from "react";

import { listenForVoice } from "@/services/fire-sensors";

/** Antes de dormir: the live microphone level (0…1) while `enabled`, read every step by the moon screen. */
export function useVoice(enabled: boolean) {
  const level = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const stop = listenForVoice((value) => (level.current = value));
    return () => {
      stop();
      level.current = 0;
    };
  }, [enabled]);
  return level;
}
