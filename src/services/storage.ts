import AsyncStorage from "@react-native-async-storage/async-storage";

import { parseCachedProfile, type Profile } from "@/domain/access";
import { type AppData, defaultData, sanitizeData, withCompletion } from "@/domain/app-data";
import { completeReminder } from "@/domain/reminders";

import { log } from "./log";

const KEY = "habitus:data:v1";

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? sanitizeData(JSON.parse(raw)) : defaultData();
  } catch (error) {
    log.error("could not read saved data", error);
    return defaultData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch (error) {
    log.error("could not save data", error);
  }
}

/** Read-modify-write used by background notification actions. */
export async function markDoneInStorage(day: string, trickIndex: number): Promise<AppData> {
  const next = withCompletion(await loadData(), day, trickIndex, new Date());
  await saveData(next);
  return next;
}

/** Marks one occurrence of a reminder as done from a notification action. */
export async function markReminderDoneInStorage(reminderId: string, occurrence: string): Promise<AppData> {
  const data = await loadData();
  const reminder = data.reminders[reminderId];
  if (!reminder) return data;
  const next = { ...data, reminders: { ...data.reminders, [reminderId]: completeReminder(reminder, occurrence, new Date()) } };
  await saveData(next);
  return next;
}

export async function clearData(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

/** Where the Supabase client keeps the login session (localStorage on the web). */
export const authStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

const PROFILE_KEY = "habitus:profile:v1";

/** Last profile read from the server, so a paid user is not locked out offline. */
export async function loadProfileCache(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? parseCachedProfile(JSON.parse(raw)) : null;
  } catch (error) {
    log.error("could not read cached profile", error);
    return null;
  }
}

export async function saveProfileCache(profile: Profile | null): Promise<void> {
  try {
    if (profile) await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    else await AsyncStorage.removeItem(PROFILE_KEY);
  } catch (error) {
    log.error("could not save profile", error);
  }
}

const LOGIN_CURTAIN_KEY = "habitus:login-curtain";

/** Web: signed in from the landing's dialog, whose page then reloads. Kept for this tab only, across that reload. */
export function markLoginCurtain() {
  try {
    sessionStorage.setItem(LOGIN_CURTAIN_KEY, "1");
  } catch {
    // Storage blocked: the app opens without the curtain.
  }
}

/** Whether the page was reloaded by a sign-in in the landing's dialog; reading clears it. */
export function takeLoginCurtain(): boolean {
  try {
    const marked = sessionStorage.getItem(LOGIN_CURTAIN_KEY) !== null;
    sessionStorage.removeItem(LOGIN_CURTAIN_KEY);
    return marked;
  } catch {
    return false;
  }
}

const STICKER_SEEN_KEY = "habitus:sticker-seen:v1";
const FEED_SEEN_KEY = "habitus:feed-seen:v1";

async function seenMap(key: string): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(key);
  const value: unknown = raw ? JSON.parse(raw) : null;
  return value && typeof value === "object" ? (value as Record<string, string>) : {};
}

/** Conversas: when the last animated sticker danced in the chat with `peer`, or null if none has yet. */
export async function loadStickerSeen(peer: string): Promise<string | null> {
  try {
    const seen = (await seenMap(STICKER_SEEN_KEY))[peer];
    return typeof seen === "string" ? seen : null;
  } catch (error) {
    log.warn("could not read danced stickers", error);
    return null;
  }
}

export async function saveStickerSeen(peer: string, at: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STICKER_SEEN_KEY, JSON.stringify({ ...(await seenMap(STICKER_SEEN_KEY)), [peer]: at }));
  } catch (error) {
    log.warn("could not save danced stickers", error);
  }
}

/** Feed: when `me` last opened the Feed tab (the newest post's time then), or null if never. */
export async function loadFeedSeen(me: string): Promise<string | null> {
  try {
    const seen = (await seenMap(FEED_SEEN_KEY))[me];
    return typeof seen === "string" ? seen : null;
  } catch (error) {
    log.warn("could not read feed seen", error);
    return null;
  }
}

export async function saveFeedSeen(me: string, at: string): Promise<void> {
  try {
    await AsyncStorage.setItem(FEED_SEEN_KEY, JSON.stringify({ ...(await seenMap(FEED_SEEN_KEY)), [me]: at }));
  } catch (error) {
    log.warn("could not save feed seen", error);
  }
}
