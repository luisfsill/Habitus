import { type PlannedNotification, pushRow } from "@/domain/notification-plan";

import { log } from "./log";
import { supabase } from "./supabase";

// Web Push: reminders sent by the Supabase function `push-send` (see supabase/push.sql),
// so they arrive with the PWA closed. Without it, ./web-reminders only fires while the app is open.
const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;

let active = false;

/** True once this browser is subscribed and the server queue is in use. */
export const pushActive = (): boolean => active;

function supported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY && !!supabase;
}

// getRegistration, not `ready`: `ready` never settles when the worker failed to register (e.g. dev server).
async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

/**
 * Subscribes this browser (notification permission must already be granted) and
 * saves the subscription for the signed-in account. Returns whether push is now active.
 */
export async function ensurePushSubscription(): Promise<boolean> {
  if (!supported() || !supabase) return (active = false);
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.active) return (active = false);
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY }));
    const { endpoint, keys } = subscription.toJSON();
    if (!endpoint || !keys?.p256dh || !keys.auth) return (active = false);
    const { error } = await supabase.from("push_subscriptions").upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: "endpoint" });
    if (error) throw error;
    return (active = true);
  } catch (error) {
    log.warn("web push unavailable, falling back to in-app timers", error);
    return (active = false);
  }
}

/** Adds (or replaces, by id) reminders in this account's server queue. */
export async function queuePush(items: readonly PlannedNotification[]): Promise<void> {
  if (!active || !supabase || items.length === 0) return;
  const { error } = await supabase.from("push_queue").upsert(items.map(pushRow), { onConflict: "user_id,id" });
  if (error) log.error("could not queue push reminders", error);
}

/** Removes queued reminders whose id matches `predicate`. */
export async function unqueuePush(predicate: (id: string) => boolean): Promise<void> {
  if (!active || !supabase) return;
  const { data, error } = await supabase.from("push_queue").select("id");
  if (error) return log.error("could not read push queue", error);
  const ids = (data as { id: string }[]).map((row) => row.id).filter(predicate);
  if (ids.length === 0) return;
  const removed = await supabase.from("push_queue").delete().in("id", ids);
  if (removed.error) log.error("could not clear push reminders", removed.error);
}

/** On sign-out: this browser stops receiving the account's reminders. */
export async function forgetPushDevice(): Promise<void> {
  if (!supported() || !supabase) return;
  try {
    const subscription = await currentSubscription();
    if (!subscription) return;
    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  } catch (error) {
    log.warn("could not forget push device", error);
  } finally {
    active = false;
  }
}
