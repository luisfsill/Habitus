import * as Haptics from "expo-haptics";
import { useCallback, useMemo } from "react";

import type { AppData } from "@/domain/app-data";
import {
  buildReminder,
  completeReminder as markDone,
  deleteReminder,
  nextOccurrence,
  parseLocal,
  type ReminderDraft,
  reopenReminder as markOpen,
  toLocal,
  validateDraft,
} from "@/domain/reminders";
import { cancelReminder, cancelReminderOccurrence, scheduleReminderSnooze } from "@/services/notifications";

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Personal reminder actions. Each cancels first, then reads the latest data and commits it with no
 * await in between, so a change made while cancelling is not overwritten (save, reschedule, sync).
 */
export function useReminderActions({ dataRef, commit }: {
  dataRef: { current: AppData };
  commit: (next: AppData) => Promise<void>;
}) {
  const saveReminder = useCallback(
    async (draft: ReminderDraft, id?: string) => {
      const now = new Date();
      const error = validateDraft(draft, now);
      if (error) return error;
      if (id) await cancelReminder(id);
      const current = dataRef.current;
      const key = id ?? newId();
      const reminder = buildReminder(draft, key, now, id ? current.reminders[id] : undefined);
      await commit({ ...current, reminders: { ...current.reminders, [key]: reminder } });
      return null;
    },
    [dataRef, commit],
  );

  /** Marks `occurrence` done (opened from its notification), or the next one when it is missing or invalid. */
  const completeReminder = useCallback(
    async (id: string, occurrence?: string) => {
      const now = new Date();
      const target = dataRef.current.reminders[id];
      if (!target || target.deletedAt) return;
      const given = occurrence ? parseLocal(occurrence) : null;
      const at = given ?? nextOccurrence(target, now);
      if (!at) return;
      const local = toLocal(at);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await (given ? cancelReminderOccurrence(id, local) : cancelReminder(id));
      const current = dataRef.current;
      const reminder = current.reminders[id];
      if (!reminder || reminder.deletedAt) return;
      await commit({ ...current, reminders: { ...current.reminders, [id]: markDone(reminder, local, now) } });
    },
    [dataRef, commit],
  );

  const reopenReminder = useCallback(
    async (id: string) => {
      const current = dataRef.current;
      const reminder = current.reminders[id];
      if (!reminder || reminder.deletedAt) return;
      await commit({ ...current, reminders: { ...current.reminders, [id]: markOpen(reminder, new Date()) } });
    },
    [dataRef, commit],
  );

  /** "Adiar 10 min" on the reminder screen (web notifications have no buttons). */
  const snoozeReminder = useCallback(
    (id: string, occurrence: string, lead: number) => scheduleReminderSnooze(id, occurrence, lead, dataRef.current),
    [dataRef],
  );

  const deleteReminders = useCallback(
    async (ids: readonly string[]) => {
      const now = new Date();
      for (const id of ids) await cancelReminder(id);
      const current = dataRef.current;
      const reminders = { ...current.reminders };
      for (const id of ids) {
        const reminder = reminders[id];
        if (!reminder || reminder.deletedAt) continue;
        reminders[id] = deleteReminder(reminder, now);
      }
      await commit({ ...current, reminders });
    },
    [dataRef, commit],
  );

  return useMemo(
    () => ({ saveReminder, completeReminder, reopenReminder, snoozeReminder, deleteReminders }),
    [saveReminder, completeReminder, reopenReminder, snoozeReminder, deleteReminders],
  );
}
