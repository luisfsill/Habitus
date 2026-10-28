/** The app's only console adapter. Never log user-written text. */
export const log = {
  warn(message: string, error?: unknown) {
    if (__DEV__) console.warn(`[habitus] ${message}`, error ?? "");
  },
  error(message: string, error?: unknown) {
    console.error(`[habitus] ${message}`, error instanceof Error ? error.message : (error ?? ""));
  },
};

// MediaPipe's WebAssembly writes its status lines ("INFO: Created TensorFlow Lite XNNPACK delegate for CPU.",
// "W0000 00:00:...") to console.error, which the dev overlay shows as errors.
const LIBRARY_STATUS = /^(INFO|WARNING):|^[IW]\d{4} /;
let quiet = false;

/** Drops MediaPipe's status lines from console.error, once; real errors still go through. */
export function quietLibraryStatus() {
  if (quiet) return;
  quiet = true;
  const error = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && LIBRARY_STATUS.test(args[0])) return;
    error(...args);
  };
}
