import * as Haptics from "expo-haptics";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { progressOf, type Progress, type Reward, rewardBetween } from "@/domain/achievements";
import { type AppData, defaultData, type Settings, withCompletion } from "@/domain/app-data";
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
  /** Re-reads storage (background actions) and reschedules. */
  refresh: () => Promise<void>;
  reset: () => Promise<void>;
}

const Context = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("undetermined");
  const [exactAlarms, setExactAlarms] = useState(true);
  const [reward, setReward] = useState<Reward | null>(null);
  const dataRef = useRef(data);
  const progress = useMemo(() => progressOf(data, new Date()), [data]);
  const dismissReward = useCallback(() => setReward(null), []);

  const commit = useCallback(async (next: AppData) => {
    dataRef.current = next;
    setData(next);
    await saveData(next);
    await rescheduleAll(next);
  }, []);

  const refresh = useCallback(async () => {
    const [stored, state, exact] = await Promise.all([loadData(), getPermissionState(), hasExactAlarms()]);
    dataRef.current = stored;
    setData(stored);
    setPermission(state);
    setExactAlarms(exact);
    await rescheduleAll(stored);
  }, []);

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
      },
      async setGratitude(text) {
        const today = dayKey(new Date());
        const { [today]: _previous, ...others } = dataRef.current.gratitude;
        const gratitude = text.trim() ? { ...others, [today]: text.trim() } : others;
        const next = { ...dataRef.current, gratitude };
        dataRef.current = next;
        setData(next);
        await saveData(next);
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
        await clearData();
        const fresh = defaultData();
        dataRef.current = fresh;
        setData(fresh);
        await rescheduleAll(fresh);
      },
    }),
    [data, ready, permission, exactAlarms, progress, reward, dismissReward, refresh, commit],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(Context);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}
