import { log } from "./log";

// Antes de dormir: the browser's own speech recognition turns the phrase into text (Google's service in Chrome and
// Edge, Apple's in Safari), so the screen can check each word. The app keeps neither the audio nor the text.

interface RecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}

type RecognitionClass = new () => Recognition;

function recognitionClass(): RecognitionClass | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Words can be recognized here: a browser that has speech recognition (not Firefox, not the native app), online. */
export function canRecognize(): boolean {
  return recognitionClass() !== undefined && typeof navigator !== "undefined" && navigator.onLine;
}

/** Errors that just mean nothing was said yet, or that we stopped it. */
const HARMLESS = new Set(["no-speech", "aborted"]);

/**
 * Listens in Portuguese and calls `onText` with everything heard since it started, words still being said included,
 * so they light up at once. The browser ends a session after a silence: it starts again until stopped. `onFail` is
 * called once when it cannot go on (permission denied, no network). Call it from a tap: Safari only starts it there.
 */
export function listenForWords(onText: (text: string) => void, onFail: () => void): () => void {
  const Recognition = recognitionClass();
  let stopped = false;
  let current: Recognition | null = null;
  // Text of the sessions that already ended, and of the running one.
  let before = "";
  let latest = "";
  const fail = (error: unknown) => {
    if (stopped) return;
    stopped = true;
    log.warn("speech recognition stopped", error);
    onFail();
  };
  const begin = () => {
    if (!Recognition) return fail("no speech recognition");
    const r = new Recognition();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (event) => {
      latest = Array.from(event.results, (result) => result[0].transcript).join(" ");
      onText(`${before} ${latest}`);
    };
    r.onerror = (event) => {
      if (!HARMLESS.has(event.error)) fail(event.error);
    };
    r.onend = () => {
      if (stopped) return;
      before = `${before} ${latest}`;
      latest = "";
      begin();
    };
    current = r;
    try {
      r.start();
    } catch (error) {
      fail(error);
    }
  };
  begin();
  return () => {
    stopped = true;
    current?.abort();
  };
}
