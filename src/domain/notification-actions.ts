import { isTrickIndex, type TrickIndex } from "./tricks";

export const TRICK_CATEGORY = "trick";
export const ACTION_DONE = "done";
export const ACTION_SNOOZE = "snooze";
export const ACTION_OK = "ok";
export const REMINDER_CATEGORY = "reminder";
export const REMINDER_LEAD_CATEGORY = "reminder-lead";

/** Payload stored in each notification's `content.data`. */
export interface NotificationPayload {
  kind: "opening" | "trick" | "water" | "reminder";
  dayKey: string;
  trickIndex?: TrickIndex;
  reminderId?: string;
  occurrence?: string;
  lead?: number;
}

export type ResponseIntent =
  | { type: "open-today" }
  | { type: "open-trick"; trickIndex: TrickIndex; dayKey: string }
  | { type: "done"; trickIndex: TrickIndex; dayKey: string }
  | { type: "snooze"; trickIndex: TrickIndex; dayKey: string }
  | { type: "open-reminder"; reminderId: string; occurrence: string; lead: number }
  | { type: "reminder-done"; reminderId: string; occurrence: string }
  | { type: "reminder-snooze"; reminderId: string; occurrence: string; lead: number }
  | { type: "dismiss" };

const KINDS = ["opening", "trick", "water", "reminder"];

function readReminder(dayKey: string, reminderId: unknown, occurrence: unknown, lead: unknown): NotificationPayload | null {
  if (typeof reminderId !== "string" || typeof occurrence !== "string" || typeof lead !== "number") return null;
  return { kind: "reminder", dayKey, reminderId, occurrence, lead };
}

function readPayload(data: unknown): NotificationPayload | null {
  if (typeof data !== "object" || data === null) return null;
  const { kind, dayKey, trickIndex, reminderId, occurrence, lead } = data as Record<string, unknown>;
  if (typeof kind !== "string" || !KINDS.includes(kind) || typeof dayKey !== "string") return null;
  if (kind === "reminder") return readReminder(dayKey, reminderId, occurrence, lead);
  if (kind === "trick" && !isTrickIndex(trickIndex)) return null;
  return { kind: kind as NotificationPayload["kind"], dayKey, trickIndex: kind === "trick" ? (trickIndex as TrickIndex) : undefined };
}

function reminderIntent(action: string, { reminderId = "", occurrence = "", lead = 0 }: NotificationPayload): ResponseIntent {
  if (action === ACTION_DONE) return { type: "reminder-done", reminderId, occurrence };
  if (action === ACTION_SNOOZE) return { type: "reminder-snooze", reminderId, occurrence, lead };
  if (action === ACTION_OK) return { type: "dismiss" };
  return { type: "open-reminder", reminderId, occurrence, lead };
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
  if (payload?.kind === "reminder") return reminderIntent(actionIdentifier, payload);
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
