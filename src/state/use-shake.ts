import { useEffect, useRef } from "react";

import { listenForShake } from "@/services/fire-sensors";

/** Postura de poder: the phone's live movement (0 still … 1 shaken), from `start()`, called on a tap (iOS asks then). */
export function useShake() {
  const shake = useRef(0);
  const stop = useRef<() => void>(() => undefined);
  useEffect(() => () => stop.current(), []);
  const start = () => {
    stop.current();
    stop.current = listenForShake((value) => (shake.current = value));
  };
  return { shake, start };
}
