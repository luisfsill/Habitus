import { router, Stack } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppText } from "@/components/app-text";
import { HeaderButton } from "@/components/header-button";
import { PrimaryButton } from "@/components/primary-button";
import { ReminderRow } from "@/components/reminder-row";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { SwipeToDelete } from "@/components/swipe-to-delete";
import { doneLabel, groupLabel, MONTH_NAMES, reminderSummary, shortDay } from "@/domain/reminder-text";
import { doneReminders, pendingReminders, type Reminder } from "@/domain/reminders";
import { formatTime, minutesOfDay } from "@/domain/time";
import { useAppState } from "@/state/app-state";
import { useNow } from "@/state/use-now";
import { confirm } from "@/state/use-sign-out";
import { HIT, space } from "@/theme";

type Tab = "upcoming" | "done";
const TABS = [
  { value: "upcoming", label: "Próximos" },
  { value: "done", label: "Concluídos" },
] as const;

const open = (id: string) => router.push({ pathname: "/lembretes/[id]", params: { id } });
const time = (at: Date) => formatTime(minutesOfDay(at));

/** Consecutive items with the same label, in order. */
function groupBy<T>(items: readonly T[], label: (item: T) => string): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const key = label(item);
    const last = groups[groups.length - 1];
    if (last?.label === key) last.items.push(item);
    else groups.push({ label: key, items: [item] });
  }
  return groups;
}

function monthOf(doneAt: number, now: Date): string {
  const d = new Date(doneAt);
  const month = MONTH_NAMES[d.getMonth()];
  return d.getFullYear() === now.getFullYear() ? month : `${month} de ${d.getFullYear()}`;
}

function Empty({ text }: { text: string }) {
  return (
    <AppText variant="body" color="secondaryLabel" align="center" style={styles.empty}>
      {text}
    </AppText>
  );
}

function Upcoming({ now }: { now: Date }) {
  const { data, completeReminder, deleteReminders } = useAppState();
  const groups = groupBy(pendingReminders(data.reminders, now), (p) => groupLabel(p.at, now, p.overdue));
  if (!groups.length) return <Empty text="Nenhum lembrete por aqui." />;
  return groups.map((group) => (
    <Section key={group.label} title={group.label}>
      {group.items.map(({ reminder, at, overdue }) => (
        // Deletes the whole reminder, repeats included, without completing it.
        <SwipeToDelete key={reminder.id} title={reminder.title} onDelete={() => void deleteReminders([reminder.id])}>
          {(guard) => (
            <ReminderRow
              time={time(at)}
              // "Hoje" and "Amanhã" already head the section.
              day={group.label === "Hoje" || group.label === "Amanhã" ? undefined : shortDay(at, now)}
              title={reminder.title}
              detail={reminderSummary(reminder) || undefined}
              overdue={overdue}
              onPress={guard(() => open(reminder.id))}
              onToggleDone={guard(() => void completeReminder(reminder.id))}
            />
          )}
        </SwipeToDelete>
      ))}
    </Section>
  ));
}

function Done({ now, selected, onSelect }: { now: Date; selected: Set<string> | null; onSelect: (id: string) => void }) {
  const { data, reopenReminder, deleteReminders } = useAppState();
  const groups = groupBy(doneReminders(data.reminders), (r) => monthOf(r.doneAt ?? 0, now));
  if (!groups.length) return <Empty text="Nada concluído ainda." />;
  // No time column: "Feito em …" already dates the row.
  const row = (reminder: Reminder) => (
    <SwipeToDelete
      key={reminder.id}
      title={reminder.title}
      enabled={!selected}
      // A deliberate swipe and tap, so no confirmation, as in iOS.
      onDelete={() => void deleteReminders([reminder.id])}>
      {(guard) => (
        <ReminderRow
          title={reminder.title}
          detail={doneLabel(reminder.doneAt ?? 0)}
          done
          selected={selected ? selected.has(reminder.id) : undefined}
          onPress={guard(() => (selected ? onSelect(reminder.id) : open(reminder.id)))}
          onToggleDone={guard(() => void reopenReminder(reminder.id))}
        />
      )}
    </SwipeToDelete>
  );
  return groups.map((group) => (
    <Section key={group.label} title={group.label}>
      {group.items.map(row)}
    </Section>
  ));
}

function DeleteBar({ count, onDelete }: { count: number; onDelete: () => void }) {
  return (
    <View style={styles.bar}>
      <AppText variant="body" color="secondaryLabel">
        {count === 1 ? "1 selecionado" : `${count} selecionados`}
      </AppText>
      <Pressable
        onPress={onDelete}
        disabled={count === 0}
        accessibilityRole="button"
        accessibilityLabel="Apagar"
        accessibilityState={{ disabled: count === 0 }}
        style={({ pressed }) => [styles.delete, { opacity: count === 0 ? 0.35 : pressed ? 0.6 : 1 }]}>
        <AppText variant="headline" color="danger">
          Apagar
        </AppText>
      </Pressable>
    </View>
  );
}

/** All reminders: upcoming ones by day or month, done ones by month with multi-select delete. */
export default function RemindersScreen() {
  const { data, deleteReminders } = useAppState();
  const now = useNow(1000);
  const [tab, setTab] = useState<Tab>("upcoming");
  // null outside selection mode.
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const done = doneReminders(data.reminders);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const remove = () => {
    if (!selected?.size) return;
    const n = selected.size;
    const title = n === 1 ? "Apagar 1 lembrete?" : `Apagar ${n} lembretes?`;
    confirm(title, "Isso não pode ser desfeito.", "Apagar", () => {
      void deleteReminders([...selected]);
      setSelected(null);
    });
  };

  const selecting = selected !== null;
  const header = selecting
    ? {
        headerLeft: () => <HeaderButton label="Selecionar todos" onPress={() => setSelected(new Set(done.map((r) => r.id)))} />,
        headerRight: () => <HeaderButton label="OK" strong onPress={() => setSelected(null)} />,
      }
    : {
        headerLeft: undefined,
        headerRight: () =>
          tab === "done" ? (
            done.length > 0 && <HeaderButton label="Selecionar" onPress={() => setSelected(new Set())} />
          ) : (
            <HeaderButton label="Novo lembrete" icon={{ ios: "plus", android: "add" }} onPress={() => open("novo")} />
          ),
      };

  const footer = selecting ? (
    <DeleteBar count={selected.size} onDelete={remove} />
  ) : tab === "upcoming" ? (
    <PrimaryButton label="+ Novo lembrete" onPress={() => open("novo")} />
  ) : undefined;

  return (
    <Screen underHeader title="Lembretes" footer={footer}>
      <Stack.Screen options={header} />
      <SegmentedTabs
        options={TABS}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setSelected(null);
        }}
      />
      {/* Gestures need a root view; this local one keeps the web page scrolling as the document. */}
      <GestureHandlerRootView style={styles.lists}>
        {tab === "upcoming" ? <Upcoming now={now} /> : <Done now={now} selected={selected} onSelect={toggle} />}
      </GestureHandlerRootView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Same spacing the Screen puts between sections, which this wrapper would otherwise swallow.
  lists: { gap: space.xl },
  empty: { paddingVertical: space.xxl },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: HIT },
  delete: { minHeight: HIT, justifyContent: "center", paddingLeft: space.lg },
});
