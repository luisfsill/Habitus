import AsyncStorage from "@react-native-async-storage/async-storage";

import { type AppData, defaultData, sanitizeData, withCompletion } from "@/domain/app-data";

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
  const next = withCompletion(await loadData(), day, trickIndex);
  await saveData(next);
  return next;
}

export async function clearData(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
