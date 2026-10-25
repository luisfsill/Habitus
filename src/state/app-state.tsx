import * as Haptics from "expo-haptics";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { progressOf, type Progress, type Reward, rewardBetween } from "@/domain/achievements";
import { type AppData, defaultData, type Settings, withCompletion } from "@/domain/app-data";
import { claimData, mergeData } from "@/domain/sync";
import { computeSchedule, type ScheduleResult } from "@/domain/schedule";
import { trickDayKey } from "@/domain/bedtime";
import { dayKey } from "@/domain/time";
import type { TrickIndex } from "@/domain/tricks";
import { log } from "@/services/log";
import { registerBackgroundActions } from "@/services/notification-responses";
import {
  cancelTrick,
  configureNotifications,
  getPermissionState,
  hasExactAlarms,
  type PermissionState,
  requestExactAlarms,
  requestPermission,
  rescheduleAll,
} from "@/services/notifications";
import { clearData, loadData, saveData } from "@/services/storage";
import { pushMerged } from "@/services/sync";

interface AppStateValue {
  data: AppData;
  ready: boolean;
  permission: PermissionState;
  /** False on Android 12+ until the user allows exact alarms. */
  exactAlarms: boolean;
  /** Level, belt, badges and stats derived from the history. */
  progress: Progress;
  /** Last celebration to show ("+10 XP", level-up, new badge), if any. */
  reward: Reward | null;
  dismissReward: () => void;
  /** Validates the merged settings; saves and reschedules only when valid. */
  updateSettings: (patch: Partial<Settings>) => Promise<ScheduleResult>;
  completeOnboarding: () => Promise<void>;
  completeTrick: (index: TrickIndex) => Promise<void>;
  setGratitude: (text: string) => Promise<void>;
  askPermission: () => Promise<PermissionState>;
  askExactAlarms: () => Promise<void>;
  /** True while some change has not reached the server yet. */
  syncPending: boolean;
  /** Re-reads storage (background actions) and reschedules. */
  refresh: () => Promise<void>;
  reset: () => Promise<void>;
}

const Context = createContext<AppStateValue | null>(null);

/** Wait after the last change before sending, so a burst of taps is one request. */
const PUSH_DELAY_MS = 2000;
/** On a device with nothing saved for this account, wait this long for the server copy before showing onboarding. */
const FIRST_SYNC_WAIT_MS = 8000;

export function AppStateProvider({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("undetermined");
  const [exactAlarms, setExactAlarms] = useState(true);
  const [reward, setReward] = useState<Reward | null>(null);
  const [syncPending, setSyncPending] = useState(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  const progress = useMemo(() => progressOf(data, new Date()), [data]);
  const dismissReward = useCallback(() => setReward(null), []);

  /** Sends local data and takes in what other devices sent. Offline just leaves it pending. */
  const sync = useCallback(async () => {
    if (!userId) return;
    try {
      const merged = await pushMerged(userId, dataRef.current);
      // Changes made while the request was in flight stay: merge again over the current data.
      const next = mergeData(dataRef.current, merged);
      setSyncPending(false);
      if (JSON.stringify(next) === JSON.stringify(dataRef.current)) return;
      dataRef.current = next;
      setData(next);
      await saveData(next);
      await rescheduleAll(next);
    } catch (error) {
      setSyncPending(true);
      log.warn("sync failed, will retry", error);
    }
  }, [userId]);

  const schedulePush = useCallback(() => {
    if (!userId) return;
    setSyncPending(true);
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => void sync(), PUSH_DELAY_MS);
  }, [userId, sync]);

  useEffect(() => () => clearTimeout(pushTimer.current ?? undefined), []);

  const commit = useCallback(
    async (next: AppData) => {
      dataRef.current = next;
      setData(next);
      await saveData(next);
      await rescheduleAll(next);
      schedulePush();
    },
    [schedulePush],
  );

  const refresh = useCallback(async () => {
    const [stored, state, exact] = await Promise.all([loadData(), getPermissionState(), hasExactAlarms()]);
    // Signed out, nothing is shown and no reminder fires; another account's data is never used.
    const own = userId ? claimData(stored, userId) : defaultData();
    if (userId && own !== stored) await saveData(own);
    dataRef.current = own;
    setData(own);
    setPermission(state);
    setExactAlarms(exact);
    await rescheduleAll(own);
    const synced = sync();
    // Only a fresh device waits for the network (capped), so a slow connection never blocks the app.
    if (userId && !own.onboarded) await Promise.race([synced, new Promise((done) => setTimeout(done, FIRST_SYNC_WAIT_MS))]);
  }, [sync, userId]);

  useEffect(() => {
    const boot = async () => {
      try {
        await configureNotifications();
        await registerBackgroundActions();
        await refresh();
      } catch (error) {
        log.error("startup failed", error);
      } finally {
        setReady(true);
      }
    };
    void boot();
    // Reschedule every time the app comes back, as the 7-day window slides.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const value = useMemo<AppStateValue>(
    () => ({
      data,
      ready,
      syncPending,
      permission,
      exactAlarms,
      progress,
      reward,
      dismissReward,
      refresh,
      async updateSettings(patch) {
        const current = dataRef.current;
        const settings = { ...current.settings, ...patch };
        const result = computeSchedule(settings.start, settings.end, settings.days);
        // A bedtime typed by the user restarts the learning from that answer.
        const sleepLog = settings.bedtime !== current.settings.bedtime ? {} : current.sleepLog;
        if (result.ok) await commit({ ...current, settings, sleepLog, settingsUpdatedAt: Date.now() });
        return result;
      },
      async completeOnboarding() {
        setPermission(await getPermissionState());
        await commit({ ...dataRef.current, onboarded: true });
      },
      async completeTrick(index) {
        const now = new Date();
        const today = trickDayKey(index, now);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const next = withCompletion(dataRef.current, today, index, now);
        setReward(rewardBetween(progressOf(dataRef.current, now), progressOf(next, now)));
        dataRef.current = next;
        setData(next);
        await saveData(next);
        await cancelTrick(today, index);
        schedulePush();
      },
      async setGratitude(text) {
        const today = dayKey(new Date());
        const { [today]: _previous, ...others } = dataRef.current.gratitude;
        const gratitude = text.trim() ? { ...others, [today]: text.trim() } : others;
        const next = { ...dataRef.current, gratitude };
        dataRef.current = next;
        setData(next);
        await saveData(next);
        schedulePush();
      },
      async askExactAlarms() {
        const granted = await requestExactAlarms();
        setExactAlarms(granted);
        // Alarms set before the grant stay inexact until rescheduled.
        if (granted) await rescheduleAll(dataRef.current);
      },
      async askPermission() {
        const state = await requestPermission();
        setPermission(state);
        await rescheduleAll(dataRef.current);
        return state;
      },
      async reset() {
        clearTimeout(pushTimer.current ?? undefined);
        await clearData();
        // resetAt makes this empty copy win every later merge, on this and other devices.
        await commit({ ...defaultData(), owner: userId, resetAt: Date.now() });
      },
    }),
    [data, ready, syncPending, permission, exactAlarms, progress, reward, dismissReward, refresh, commit, schedulePush, userId],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(Context);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}
