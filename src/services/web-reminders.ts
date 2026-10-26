import type { PermissionState } from "@/domain/notification-actions";
import { type PlannedNotification, reminderUrl } from "@/domain/notification-plan";

import { log } from "./log";

// shortcut: the web has no API to schedule a notification for a closed page, so
// reminders fire from timers while the PWA is open (or recently backgrounded).
// Reminders with the app fully closed need Web Push and a server.
const HORIZON_MS = 24 * 60 * 60 * 1000;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function webPermissionState(): PermissionState {
  // iOS only exposes Notification to PWAs added to the home screen.
  if (typeof Notification === "undefined") return "undetermined";
  if (Notification.permission === "granted") return "granted";
  return Notification.permission === "denied" ? "denied" : "undetermined";
}

export async function requestWebPermission(): Promise<PermissionState> {
  if (typeof Notification === "undefined") return "denied";
  return (await Notification.requestPermission()) === "granted" ? "granted" : "denied";
}

async function show(item: PlannedNotification): Promise<void> {
  if (webPermissionState() !== "granted") return;
  const options = { body: item.body, icon: "/icon-192.png", tag: item.id, data: { url: reminderUrl(item) } };
  try {
    // Android Chrome only allows notifications from a service worker.
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) await registration.showNotification(item.title, options);
    else new Notification(item.title, options);
  } catch (error) {
    log.error("could not show web notification", error);
  }
}

/** Arms timers for the items due within the next 24 hours. */
export function addWebReminders(items: readonly PlannedNotification[], now = Date.now()): void {
  for (const item of items) {
    const delay = item.date.getTime() - now;
    if (delay <= 0 || delay > HORIZON_MS) continue;
    clearTimeout(timers.get(item.id));
    timers.set(
      item.id,
      setTimeout(() => {
        timers.delete(item.id);
        void show(item);
      }, delay),
    );
  }
}

export function cancelWebReminder(predicate: (id: string) => boolean): void {
  for (const [id, timer] of timers) {
    if (!predicate(id)) continue;
    clearTimeout(timer);
    timers.delete(id);
  }
}

export const webPendingCount = (): number => timers.size;
