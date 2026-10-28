import { useEffect, useRef, useState } from "react";

import { canSeeSmiles, watchSmile } from "@/services/smile";

/**
 * Sorria: the live smile score (0…1) from the front camera, from `start()`, called on a tap. Without a camera (the
 * native app, offline) or once it fails, `canSee` is false: holding is left.
 */
export function useSmile() {
  const [canSee, setCanSee] = useState(canSeeSmiles);
  const [watching, setWatching] = useState(false);
  const score = useRef(0);
  const stop = useRef<() => void>(() => undefined);
  useEffect(() => () => stop.current(), []);
  const start = () => {
    setWatching(true);
    stop.current = watchSmile(
      (value) => (score.current = value),
      () => {
        setWatching(false);
        setCanSee(false);
      },
    );
  };
  return { canSee, watching, score, start, stop: () => stop.current() };
}
