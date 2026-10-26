import { isTrickIndex, type TrickIndex } from "./tricks";

export const TRICK_CATEGORY = "trick";
export const ACTION_DONE = "done";
export const ACTION_SNOOZE = "snooze";

/** Payload stored in each notification's `content.data`. */
export interface NotificationPayload {
  kind: "opening" | "trick" | "water";
  dayKey: string;
  trickIndex?: TrickIndex;
}

export type ResponseIntent =
  | { type: "open-today" }
  | { type: "open-trick"; trickIndex: TrickIndex; dayKey: string }
  | { type: "done"; trickIndex: TrickIndex; dayKey: string }
  | { type: "snooze"; trickIndex: TrickIndex; dayKey: string };

function readPayload(data: unknown): NotificationPayload | null {
  if (typeof data !== "object" || data === null) return null;
  const { kind, dayKey, trickIndex } = data as Record<string, unknown>;
  if ((kind !== "opening" && kind !== "trick" && kind !== "water") || typeof dayKey !== "string") return null;
  if (kind === "trick" && !isTrickIndex(trickIndex)) return null;
  return { kind, dayKey, trickIndex: kind === "trick" ? (trickIndex as TrickIndex) : undefined };
}

/**
 * Payload of a notification's content. JS listeners get `content.data`; the
 * Android headless task gets the raw bundle, where it is `content.dataString`.
 */
export function contentData(content: unknown): unknown {
  if (typeof content !== "object" || content === null) return undefined;
  const { data } = content as { data?: unknown };
  if (data && typeof data === "object") return data;
  // Read only as a fallback: on JS-side objects `dataString` is a deprecated getter.
  const { dataString } = content as { dataString?: unknown };
  if (typeof dataString !== "string") return undefined;
  try {
    return JSON.parse(dataString) as unknown;
  } catch {
    return undefined;
  }
}

/** Maps a notification response (action id + data) to what the app should do. */
export function interpretResponse(actionIdentifier: string, data: unknown): ResponseIntent {
  const payload = readPayload(data);
  if (!payload || payload.trickIndex === undefined) return { type: "open-today" };
  const target = { trickIndex: payload.trickIndex, dayKey: payload.dayKey };
  if (actionIdentifier === ACTION_DONE) return { type: "done", ...target };
  if (actionIdentifier === ACTION_SNOOZE) return { type: "snooze", ...target };
  return { type: "open-trick", ...target };
}

export type PermissionState = "granted" | "denied" | "undetermined";

/**
 * Android 13+ reports `denied` before the user was ever asked; only
 * `canAskAgain: false` means the system prompt can no longer be shown.
 */
export function toPermissionState(p: { granted: boolean; canAskAgain: boolean }): PermissionState {
  if (p.granted) return "granted";
  return p.canAskAgain ? "undetermined" : "denied";
}
