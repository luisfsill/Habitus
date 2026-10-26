import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

import { type AppData, completedKeys, scheduleFor } from "@/domain/app-data";
import {
  ACTION_DONE,
  ACTION_SNOOZE,
  type NotificationPayload,
  type PermissionState,
  toPermissionState,
  TRICK_CATEGORY,
} from "@/domain/notification-actions";
import {
  isOneOffId,
  type PlannedNotification,
  planNotifications,
  planTestRun,
  snoozeNotification,
  snoozePrefix,
} from "@/domain/notification-plan";
import type { TrickIndex } from "@/domain/tricks";

import { log } from "./log";
import { ensurePushSubscription, pushActive, queuePush, unqueuePush } from "./web-push";
import {
  addWebReminders,
  cancelWebReminder,
  requestWebPermission,
  webPendingCount,
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
  const data: NotificationPayload = { kind: item.kind, dayKey: item.dayKey, trickIndex: item.trickIndex };
  await Notifications.scheduleNotificationAsync({
    identifier: item.id,
    content: {
      title: item.title,
      body: item.body,
      data: { ...data },
      sound: soundEnabled ? "default" : false,
      categoryIdentifier: item.kind === "trick" ? TRICK_CATEGORY : undefined,
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

/**
 * Rebuilds the next days (7, or 3 with water reminders on) from current data, keeping snoozes and test
 * notifications. Returns how many plan notifications are now pending.
 */
/** End of the account's access (null: no limit). Set by the app before rescheduling. */
let accessCutoff: Date | null = null;

export function setAccessCutoff(until: Date | null): void {
  accessCutoff = until;
}

export async function rescheduleAll(data: AppData, now = new Date()): Promise<number> {
  soundEnabled = data.settings.sound;
  // Web push first: the server sends the reminders, so they arrive with the PWA closed.
  // It must be on before clearing, or stale rows (tips done elsewhere) would stay queued.
  if (!supported && !pushActive() && (await getPermissionState()) === "granted") await ensurePushSubscription();
  await cancelWhere((id) => !isOneOffId(id));
  const result = scheduleFor(data, now);
  if (!data.onboarded || !result.ok) return 0;
  if ((await getPermissionState()) !== "granted") return 0;
  const { start, end, water } = data.settings;
  const plan = planNotifications(result.schedule, now, {
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

/** One trick notification a few seconds from now. */
export async function sendTestNotification(trickIndex: TrickIndex = 1): Promise<void> {
  const now = new Date();
  const [, ...tricks] = planTestRun(now, 0, 3);
  await schedule(tricks[trickIndex]);
}

/** Adds a compressed 5-minute "day" on top of the real schedule. */
export async function scheduleTestRun(windowMinutes = 5): Promise<Date[]> {
  const plan = planTestRun(new Date(), windowMinutes);
  await scheduleAll(plan);
  return plan.map((n) => n.date);
}

export async function pendingCount(): Promise<number> {
  if (!supported) return webPendingCount();
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}
