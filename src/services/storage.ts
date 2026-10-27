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

/** Whether this browser holds a login (web only: the Supabase client keeps it as `sb-<project>-auth-token`). */
export function hasStoredSession(): boolean {
  try {
    return Object.keys(localStorage).some((key) => /^sb-.+-auth-token$/.test(key));
  } catch {
    return false;
  }
}
