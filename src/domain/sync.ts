import type { AppData } from "./app-data";

/**
 * Combines this device's data with the copy on the server. Nothing is ever
 * removed: a trick done on any device stays done. On the same day the local
 * gratitude and sleep sample win; settings follow the newest edit.
 */
export function mergeData(local: AppData, remote: AppData): AppData {
  const completions: Record<string, readonly number[]> = { ...remote.completions };
  for (const [day, indices] of Object.entries(local.completions)) {
    completions[day] = [...new Set([...(completions[day] ?? []), ...indices])].sort((a, b) => a - b);
  }
  const remoteSettingsWin = remote.settingsUpdatedAt > local.settingsUpdatedAt;
  return {
    version: 1,
    onboarded: local.onboarded || remote.onboarded,
    settings: remoteSettingsWin ? remote.settings : local.settings,
    settingsUpdatedAt: remoteSettingsWin ? remote.settingsUpdatedAt : local.settingsUpdatedAt,
    completions,
    gratitude: { ...remote.gratitude, ...local.gratitude },
    sleepLog: { ...remote.sleepLog, ...local.sleepLog },
  };
}
