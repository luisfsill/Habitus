/** The app's only console adapter. Never log user-written text. */
export const log = {
  warn(message: string, error?: unknown) {
    if (__DEV__) console.warn(`[habitus] ${message}`, error ?? "");
  },
  error(message: string, error?: unknown) {
    console.error(`[habitus] ${message}`, error instanceof Error ? error.message : (error ?? ""));
  },
};
