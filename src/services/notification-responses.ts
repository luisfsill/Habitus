import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { contentData, interpretResponse, type ResponseIntent } from "@/domain/notification-actions";

import { log } from "./log";
import { cancelReminderOccurrence, scheduleReminderSnooze, scheduleSnooze } from "./notifications";
import { loadData, markDoneInStorage, markReminderDoneInStorage } from "./storage";

const BACKGROUND_TASK = "habitus-notification-actions";
const handled = new Set<string>();

export function intentFor(response: Notifications.NotificationResponse): ResponseIntent {
  return interpretResponse(response.actionIdentifier, contentData(response.notification.request.content));
}

/**
 * Applies the side effects of "Feita" / "Adiar" exactly once per response.
 * Returns the intent so the UI can navigate or refresh.
 */
export async function applyResponse(response: Notifications.NotificationResponse): Promise<ResponseIntent> {
  const intent = intentFor(response);
  // Android may deliver one action twice (headless task + JS listener); apply it once.
  const id = `${response.notification.request.identifier}:${response.actionIdentifier}`;
  const actionable = ["done", "snooze", "reminder-done", "reminder-snooze", "dismiss"];
  if (!actionable.includes(intent.type)) return intent;
  if (handled.has(id)) return intent;
  handled.add(id);

  try {
    if (intent.type === "done") await markDoneInStorage(intent.dayKey, intent.trickIndex);
    if (intent.type === "snooze") await scheduleSnooze(intent.dayKey, intent.trickIndex);
    if (intent.type === "reminder-done") {
      await markReminderDoneInStorage(intent.reminderId, intent.occurrence);
      await cancelReminderOccurrence(intent.reminderId, intent.occurrence);
    }
    if (intent.type === "reminder-snooze") {
      await scheduleReminderSnooze(intent.reminderId, intent.occurrence, intent.lead, await loadData());
    }
    await Notifications.dismissNotificationAsync(response.notification.request.identifier);
  } catch (error) {
    log.error("could not apply notification action", error);
  }
  return intent;
}

// Module scope on purpose: the task must be defined before the OS can
// deliver a headless action (Android, app backgrounded or killed).
TaskManager.defineTask<Notifications.NotificationTaskPayload>(BACKGROUND_TASK, async ({ data }) => {
  if (data && "actionIdentifier" in data) await applyResponse(data);
});

export async function registerBackgroundActions(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.registerTaskAsync(BACKGROUND_TASK);
  } catch (error) {
    // Expo Go may not support headless tasks; actions then apply when the app opens.
    log.warn("background notification task unavailable", error);
  }
}
