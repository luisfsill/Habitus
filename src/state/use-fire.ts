import { useEffect, useRef } from "react";

import { initialBlow, judgeBlow } from "@/domain/blow";
import { listenForBlow, listenForTilt } from "@/services/fire-sensors";

/**
 * Feeds the Foco total fire: microphone blow and phone tilt, while `enabled`. When `armed` (the timer is done),
 * a strong enough blow calls `onBlownOut` once, and each blow that was too weak calls `onAttempt` with how many
 * there have been (rules in domain/blow.ts). Returns the live input the fire reads every frame.
 */
export function useFire(enabled: boolean, armed: boolean, onBlownOut: () => void, onAttempt?: (attempts: number) => void) {
  const input = useRef({ blow: 0, tilt: 0 });
  const armedRef = useRef(armed);
  const onOut = useRef(onBlownOut);
  const onTry = useRef(onAttempt);
  useEffect(() => {
    armedRef.current = armed;
    onOut.current = onBlownOut;
    onTry.current = onAttempt;
  }, [armed, onBlownOut, onAttempt]);

  useEffect(() => {
    if (!enabled) return;
    let blow = initialBlow;
    let fired = false;
    const stopBlow = listenForBlow((level) => {
      input.current.blow = level;
      if (!armedRef.current || fired) return;
      const { state, event } = judgeBlow(blow, level, Date.now());
      blow = state;
      if (event === "attempt") onTry.current?.(state.attempts);
      if (event !== "out") return;
      fired = true;
      onOut.current();
    });
    const stopTilt = listenForTilt((radians) => (input.current.tilt = Math.max(-0.8, Math.min(0.8, radians))));
    return () => {
      stopBlow();
      stopTilt();
    };
  }, [enabled]);

  return input;
}
