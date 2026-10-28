import { useEffect, useRef, useState } from "react";

import { canRecognize, listenForWords } from "@/services/speech";

/**
 * The browser's word recognition for a tip's text (Antes de dormir, Metas em voz alta), started by a tap: Safari only
 * starts it there. Without it (Firefox, offline, native app) or once it fails, `canSpeak` is false: holding is left.
 */
export function useWords() {
  const [canSpeak, setCanSpeak] = useState(canRecognize);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const stop = useRef<() => void>(() => undefined);
  useEffect(() => () => stop.current(), []);
  const listen = () => {
    setListening(true);
    stop.current = listenForWords(setHeard, () => {
      setListening(false);
      setCanSpeak(false);
    });
  };
  return { canSpeak, listening, heard, listen, stop: () => stop.current() };
}
