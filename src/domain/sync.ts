import { type AppData, defaultData } from "./app-data";
import { mergeReminders } from "./reminders";
import { mergeWaterLog } from "./water";

/**
 * Combines this device's data with the copy on the server. A trick done on
 * any device stays done. On the same day the local gratitude and sleep sample
 * win; settings follow the newest edit. A newer "Resetar dados" on either side
 * wins over everything older.
 */
export function mergeData(local: AppData, remote: AppData): AppData {
  if (local.resetAt !== remote.resetAt) return local.resetAt > remote.resetAt ? local : remote;
  const completions: Record<string, readonly number[]> = { ...remote.completions };
  for (const [day, indices] of Object.entries(local.completions)) {
    completions[day] = [...new Set([...(completions[day] ?? []), ...indices])].sort((a, b) => a - b);
  }
  const remoteSettingsWin = remote.settingsUpdatedAt > local.settingsUpdatedAt;
  const winner = remoteSettingsWin ? remote : local;
  // A new bedtime restarts the learning: the other side's samples belong to the old answer.
  const sleepLog =
    local.settings.bedtime === remote.settings.bedtime ? { ...remote.sleepLog, ...local.sleepLog } : winner.sleepLog;
  return {
    ...local,
    onboarded: local.onboarded || remote.onboarded,
    settings: winner.settings,
    settingsUpdatedAt: winner.settingsUpdatedAt,
    completions,
    gratitude: { ...remote.gratitude, ...local.gratitude },
    sleepLog,
    water: mergeWaterLog(local.water, remote.water),
    reminders: mergeReminders(local.reminders, remote.reminders),
  };
}

/** Data stored on this device, as seen by `userId`: another account's data is never shown or uploaded. */
export function claimData(stored: AppData, userId: string): AppData {
  if (stored.owner === userId) return stored;
  if (stored.owner === null) return { ...stored, owner: userId };
  return { ...defaultData(), owner: userId };
}
