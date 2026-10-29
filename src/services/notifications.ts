import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

import { type AppData, completedKeys, scheduleFor } from "@/domain/app-data";
import {
  ACTION_DONE,
  ACTION_OK,
  ACTION_SNOOZE,
  type NotificationPayload,
  type PermissionState,
  REMINDER_CATEGORY,
  REMINDER_LEAD_CATEGORY,
  toPermissionState,
  TRICK_CATEGORY,
} from "@/domain/notification-actions";
import {
  isOneOffId,
  type PlannedNotification,
  planAll,
  planTestRun,
  reminderSnooze,
  snoozeNotification,
  snoozePrefix,
} from "@/domain/notification-plan";
import { parseLocal } from "@/domain/reminders";
import type { TrickIndex } from "@/domain/tricks";

import { log } from "./log";
import { ensurePushSubscription, pushActive, queuePush, unqueuePush } from "./web-push";
import {
  addWebReminders,
  cancelWebReminder,
  requestWebPermission,
  showWebNotice,
  webPermissionState,
} from "./web-reminders";

// Channel ids keep the old word: renaming them would drop the sound choices Android already saved.
const CHANNEL_SOUND = "truques";
const CHANNEL_SILENT = "truques-silencioso";

export type { PermissionState };

/** expo-notifications exists only on iOS/Android; the PWA uses ./web-reminders. */
const supported = Platform.OS !== "web";
let soundEnabled = true;

/** Call once at startup, before any notification can arrive. */
export async function configureNotifications(): Promise<void> {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: soundEnabled,
        shouldSetBadge: false,
      }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_SOUND, {
      name: "Dicas do dia",
      // Omitting `sound` keeps the system default; "default" is read as a custom file name.
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_SILENT, {
      name: "Dicas do dia (sem som)",
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
    });
  }

  // iOS cannot reliably run JS for a background action on a local
  // notification, so there the buttons bring the app forward to record it.
  // Android handles them headless through the background task.
  const foreground = Platform.OS === "ios";
  await Notifications.setNotificationCategoryAsync(TRICK_CATEGORY, [
    { identifier: ACTION_DONE, buttonTitle: "Feita", options: { opensAppToForeground: foreground } },
    { identifier: ACTION_SNOOZE, buttonTitle: "Adiar 10 min", options: { opensAppToForeground: foreground } },
  ]);
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
    { identifier: ACTION_DONE, buttonTitle: "Feito", options: { opensAppToForeground: foreground } },
    { identifier: ACTION_SNOOZE, buttonTitle: "Adiar 10 min", options: { opensAppToForeground: foreground } },
  ]);
  await Notifications.setNotificationCategoryAsync(REMINDER_LEAD_CATEGORY, [
    { identifier: ACTION_OK, buttonTitle: "Ok", options: { opensAppToForeground: false } },
    { identifier: ACTION_SNOOZE, buttonTitle: "Adiar 10 min", options: { opensAppToForeground: foreground } },
  ]);
}

function categoryFor(item: PlannedNotification): string | undefined {
  if (item.kind === "trick") return TRICK_CATEGORY;
  if (item.kind === "reminder") return item.lead === 0 ? REMINDER_CATEGORY : REMINDER_LEAD_CATEGORY;
  return undefined;
}

export async function getPermissionState(): Promise<PermissionState> {
  if (!supported) return webPermissionState();
  return toPermissionState(await Notifications.getPermissionsAsync());
}

export async function requestPermission(): Promise<PermissionState> {
  if (!supported) return requestWebPermission();
  // Right after a refusal Android may still allow asking again; for the UI it is a "no".
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted ? "granted" : "denied";
}

/** Android 12+: without exact alarms the OS may deliver reminders up to an hour late. */
export async function hasExactAlarms(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  return (await Notifications.getExactAlarmPermissionsAsync()).granted;
}

/** Opens the "Alarms & reminders" system screen; resolves when the user returns. */
export async function requestExactAlarms(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  return (await Notifications.requestExactAlarmPermissionsAsync()).granted;
}

export function openSystemSettings(): Promise<void> {
  if (!supported) {
    // Browsers have no settings deep link; tell the user where to look.
    globalThis.alert?.("Ative as notificações deste site nas configurações do navegador e recarregue a página.");
    return Promise.resolve();
  }
  return Linking.openSettings();
}

async function schedule(item: PlannedNotification): Promise<void> {
  if (!supported) return pushActive() ? queuePush([item]) : addWebReminders([item]);
  const data: NotificationPayload = {
    kind: item.kind,
    dayKey: item.dayKey,
    trickIndex: item.trickIndex,
    reminderId: item.reminderId,
    occurrence: item.occurrence,
    lead: item.lead,
  };
  await Notifications.scheduleNotificationAsync({
    identifier: item.id,
    content: {
      title: item.title,
      body: item.body,
      data: { ...data },
      sound: soundEnabled ? "default" : false,
      categoryIdentifier: categoryFor(item),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: item.date,
      channelId: soundEnabled ? CHANNEL_SOUND : CHANNEL_SILENT,
    },
  });
}

async function scheduleAll(items: readonly PlannedNotification[]): Promise<void> {
  // One request for the whole web push queue instead of one per reminder.
  if (!supported && pushActive()) return queuePush(items);
  for (const item of items) await schedule(item);
}

/** Cancels every scheduled notification whose id matches `predicate`. */
async function cancelWhere(predicate: (id: string) => boolean): Promise<void> {
  if (!supported) {
    cancelWebReminder(predicate);
    return unqueuePush(predicate);
  }
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ids = scheduled.map((n) => n.identifier).filter(predicate);
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

/** End of the account's access (null: no limit). Set by the app before rescheduling. */
let accessCutoff: Date | null = null;

export function setAccessCutoff(until: Date | null): void {
  accessCutoff = until;
}

/**
 * Rebuilds the next days (7, or 3 with water reminders on) of tips plus personal reminders (60 days, in
 * the slots tips leave free), keeping snoozes and test notifications. Invalid tip hours do not block
 * reminders. Returns how many plan notifications are now pending.
 */
export function rescheduleAll(data: AppData, now = new Date()): Promise<number> {
  // One at a time: the boot run is not awaited, and an older plan must never land after a newer one.
  const run = rescheduling.then(() => reschedule(data, now));
  rescheduling = run.catch(() => 0);
  return run;
}

let rescheduling: Promise<unknown> = Promise.resolve();

async function reschedule(data: AppData, now: Date): Promise<number> {
  soundEnabled = data.settings.sound;
  // Web push first: the server sends the reminders, so they arrive with the PWA closed.
  // It must be on before clearing, or stale rows (tips done elsewhere) would stay queued.
  // Not for signed-out data (sign-out passes defaultData): that would re-subscribe the device while leaving.
  if (!supported && data.onboarded && !pushActive() && (await getPermissionState()) === "granted") await ensurePushSubscription();
  await cancelWhere((id) => !isOneOffId(id));
  const result = scheduleFor(data, now);
  if (!data.onboarded) return 0;
  if ((await getPermissionState()) !== "granted") return 0;
  const { start, end, water } = data.settings;
  const plan = planAll(result.ok ? result.schedule : null, data.reminders, now, {
    completed: completedKeys(data.completions),
    until: accessCutoff ?? undefined,
    water: { settings: water, start, end, log: data.water },
  });
  try {
    await scheduleAll(plan);
  } catch (error) {
    log.error("could not schedule notifications", error);
  }
  return plan.length;
}

export async function scheduleSnooze(day: string, trickIndex: TrickIndex, now = new Date()): Promise<void> {
  await schedule(snoozeNotification(day, trickIndex, now));
}

/** Cancels a trick's pending notification and snoozes once it is done. */
export async function cancelTrick(day: string, trickIndex: TrickIndex): Promise<void> {
  const prefix = snoozePrefix(day, trickIndex);
  await cancelWhere((id) => id === `${day}:trick:${trickIndex}` || id.startsWith(prefix));
}

/** Cancels every pending alert of a reminder (all occurrences, leads and snoozes). */
export async function cancelReminder(id: string): Promise<void> {
  await cancelWhere((rid) => rid.startsWith(`rem:${id}:`));
}

/** Cancels the pending alerts of one occurrence of a reminder. */
export async function cancelReminderOccurrence(id: string, occurrence: string): Promise<void> {
  await cancelWhere((rid) => rid.startsWith(`rem:${id}:${occurrence}:`));
}

/** Snoozes one alert of a reminder, reading its text from the stored data. */
export async function scheduleReminderSnooze(
  reminderId: string,
  occurrence: string,
  lead: number,
  data: AppData,
  now = new Date(),
): Promise<void> {
  const reminder = data.reminders[reminderId];
  const date = parseLocal(occurrence);
  if (!reminder || reminder.deletedAt !== null || !date) return;
  await schedule(reminderSnooze(reminder, date, lead, now));
}

/** A chat message while the app is open (the server push covers it closed); the same id replaces the server's notice. */
export async function showMessageNotice(id: string, title: string, body: string, url: string): Promise<void> {
  if (!supported) return showWebNotice(id, title, body, url);
  await Notifications.scheduleNotificationAsync({ identifier: id, content: { title, body, data: { url } }, trigger: null });
}

/** One trick notification a few seconds from now. */
export async function sendTestNotification(trickIndex: TrickIndex = 1): Promise<void> {
  const now = new Date();
  const [, ...tricks] = planTestRun(now, 0, 3);
  await schedule(tricks[trickIndex]);
}
