import * as Haptics from "expo-haptics";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { progressOf, type Progress, type Reward, rewardBetween } from "@/domain/achievements";
import { type AppData, defaultData, type Settings, withCompletion } from "@/domain/app-data";
import { claimData, mergeData } from "@/domain/sync";
import { computeSchedule, type ScheduleResult } from "@/domain/schedule";
import { trickDayKey } from "@/domain/bedtime";
import type { ReminderDraft } from "@/domain/reminders";
import { dayKey } from "@/domain/time";
import { cupsOn, nextCups } from "@/domain/water";
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
  setAccessCutoff,
} from "@/services/notifications";
import { playCelebration } from "@/services/sound";
import { clearData, loadData, saveData } from "@/services/storage";
import { pushMerged } from "@/services/sync";

import { useReminderActions } from "./use-reminders";

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
  /** The tip just finished, while its full-screen celebration plays. */
  celebration: TrickIndex | null;
  dismissCelebration: () => void;
  /** Validates the merged settings; saves and reschedules only when valid. */
  updateSettings: (patch: Partial<Settings>) => Promise<ScheduleResult>;
  completeOnboarding: () => Promise<void>;
  completeTrick: (index: TrickIndex) => Promise<void>;
  setGratitude: (text: string) => Promise<void>;
  /** One cup more or less today; replans the water reminders when the goal is crossed. */
  addWater: (delta: 1 | -1) => Promise<void>;
  /** Creates (no id) or edits a reminder. Returns the validation message, or null when saved. */
  saveReminder: (draft: ReminderDraft, id?: string) => Promise<string | null>;
  /** Marks `occurrence` (from a notification) or the next occurrence done, with a success haptic. */
  completeReminder: (id: string, occurrence?: string) => Promise<void>;
  /** Snoozes one alert of a reminder for 10 minutes. */
  snoozeReminder: (id: string, occurrence: string, lead: number) => Promise<void>;
  reopenReminder: (id: string) => Promise<void>;
  deleteReminders: (ids: readonly string[]) => Promise<void>;
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

/** One cup more or less today. Crossing the goal replans today's water reminders. */
function useAddWater({ dataRef, setData, setReward, commit, schedulePush }: {
  dataRef: { current: AppData };
  setData: (data: AppData) => void;
  setReward: (reward: Reward | null) => void;
  commit: (next: AppData) => Promise<void>;
  schedulePush: () => void;
}) {
  return useCallback(
    async (delta: 1 | -1) => {
      const now = new Date();
      const today = dayKey(now);
      const current = dataRef.current;
      const before = cupsOn(current.water, today);
      const cups = nextCups(before, delta);
      if (cups === before) return;
      const next = { ...current, water: { ...current.water, [today]: { cups, at: now.getTime() } } };
      setReward(rewardBetween(progressOf(current, now), progressOf(next, now)));
      void Haptics.selectionAsync();
      const goal = current.settings.water.goal;
      if (before >= goal !== cups >= goal) return commit(next);
      dataRef.current = next;
      setData(next);
      await saveData(next);
      schedulePush();
    },
    [dataRef, setData, setReward, commit, schedulePush],
  );
}

interface ProviderProps {
  children: ReactNode;
  userId: string | null;
  /** End of the account's access in ms (null: no limit); reminders stop there. */
  accessCutoff: number | null;
}

/** The "+10 XP" toast and the full-screen scene of the tip just finished; a new scene plays its sound. */
function useCelebrations() {
  const [reward, setReward] = useState<Reward | null>(null);
  const [celebration, setScene] = useState<TrickIndex | null>(null);
  const setCelebration = useCallback((index: TrickIndex | null) => {
    if (index !== null) playCelebration(index);
    setScene(index);
  }, []);
  return { reward, setReward, celebration, setCelebration };
}

export function AppStateProvider({ children, userId, accessCutoff }: ProviderProps) {
  const [data, setData] = useState<AppData>(defaultData);
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("undetermined");
  const [exactAlarms, setExactAlarms] = useState(true);
  const { reward, setReward, celebration, setCelebration } = useCelebrations();
  const [syncPending, setSyncPending] = useState(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  const progress = useMemo(() => progressOf(data, new Date()), [data]);

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

  const addWater = useAddWater({ dataRef, setData, setReward, commit, schedulePush });
  const reminderActions = useReminderActions({ dataRef, commit });

  const refresh = useCallback(async () => {
    const [stored, state, exact] = await Promise.all([loadData(), getPermissionState(), hasExactAlarms()]);
    // Signed out, nothing is shown and no reminder fires; another account's data is never used.
    const own = userId ? claimData(stored, userId) : defaultData();
    if (userId && own !== stored) await saveData(own);
    dataRef.current = own;
    setData(own);
    setPermission(state);
    setExactAlarms(exact);
    // Not awaited: on the web it talks to the push server, and the screen should not wait for that.
    rescheduleAll(own).catch((error: unknown) => log.error("could not reschedule", error));
    const synced = sync();
    // Only a fresh device waits for the network (capped), so a slow connection never blocks the app.
    if (userId && !own.onboarded) await Promise.race([synced, new Promise((done) => setTimeout(done, FIRST_SYNC_WAIT_MS))]);
  }, [sync, userId]);

  // Runs before the boot effect below, so the first schedule already respects the cutoff.
  const booted = useRef(false);
  useEffect(() => {
    setAccessCutoff(accessCutoff === null ? null : new Date(accessCutoff));
    if (booted.current) void rescheduleAll(dataRef.current);
  }, [accessCutoff]);

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
        booted.current = true;
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
      dismissReward: () => setReward(null),
      celebration,
      dismissCelebration: () => setCelebration(null),
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
        setCelebration(index);
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
      addWater,
      ...reminderActions,
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
    [data, ready, syncPending, permission, exactAlarms, progress, reward, setReward, celebration, setCelebration, refresh, commit, schedulePush, userId, addWater, reminderActions],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(Context);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}
