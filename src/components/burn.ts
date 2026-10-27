/** Native: no SVG filters on views, so there is no burn; the caller falls back to its own fade. */
export function burnAway(_node: unknown, _ms: number, done: () => void): void {
  done();
}

/** True where burnAway really burns (the web). */
export const canBurn = false;
