import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ActionRow } from "@/components/action-row";
import { AppText } from "@/components/app-text";
import { PrimaryButton } from "@/components/primary-button";
import { ReminderForm } from "@/components/reminder-form";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { isOccurrenceDone, parseLocal, type Reminder, type ReminderDraft, toLocal } from "@/domain/reminders";
import { useAppState } from "@/state/app-state";
import { useNow } from "@/state/use-now";
import { confirm } from "@/state/use-sign-out";
import { space } from "@/theme";

/** Back to where the user came from; a reminder opened by a notification has no history. */
function leave() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

/** A new reminder starts at the next whole hour. */
function blankDraft(): ReminderDraft {
  const at = new Date();
  at.setHours(at.getHours() + 1, 0, 0, 0);
  return { title: "", notes: "", at: toLocal(at), leads: [], repeat: null };
}

function draftOf({ title, notes, at, leads, repeat }: Reminder): ReminderDraft {
  return { title, notes, at, leads, repeat };
}

/** The occurrence and lead a notification opened this screen for (`?occ=…&lead=…`), when valid. */
interface Opened {
  occurrence?: string;
  lead: number;
}

function openedFrom(occ?: string, lead?: string): Opened {
  const n = Number(lead);
  return {
    occurrence: occ && parseLocal(occ) ? occ : undefined,
    lead: Number.isInteger(n) && n >= 0 ? n : 0,
  };
}

/**
 * Marcar como feito (or Desfazer feito), Adiar 10 min (opened from a notification) and Apagar lembrete.
 * From a notification, "feito" is about the occurrence that alerted, not the next one.
 */
function EditActions({ id, opened }: { id: string; opened: Opened }) {
  const { data, completeReminder, reopenReminder, snoozeReminder, deleteReminders } = useAppState();
  const reminder = data.reminders[id];
  const { occurrence, lead } = opened;
  const done = !!reminder && (occurrence ? isOccurrenceDone(reminder, occurrence) : reminder.doneAt != null);
  return (
    <Section title="Ações">
      <ActionRow
        label={done ? "Desfazer feito" : "Marcar como feito"}
        icon={done ? { ios: "arrow.uturn.backward", android: "undo" } : { ios: "checkmark.circle", android: "check_circle" }}
        onPress={() => {
          void (done ? reopenReminder(id) : completeReminder(id, occurrence));
          leave();
        }}
      />
      {occurrence && !done && (
        <ActionRow
          label="Adiar 10 min"
          icon={{ ios: "alarm", android: "snooze" }}
          onPress={() => {
            void snoozeReminder(id, occurrence, lead);
            leave();
          }}
        />
      )}
      <ActionRow
        label="Apagar lembrete"
        icon={{ ios: "trash", android: "delete" }}
        destructive
        onPress={() =>
          confirm("Apagar lembrete?", "Isso não pode ser desfeito.", "Apagar", () => {
            void deleteReminders([id]);
            leave();
          })
        }
      />
    </Section>
  );
}

function Editor({ id, existing, opened }: { id?: string; existing?: Reminder; opened: Opened }) {
  const { saveReminder } = useAppState();
  const now = useNow(30_000);
  const [draft, setDraft] = useState(() => (existing ? draftOf(existing) : blankDraft()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const change = (next: ReminderDraft) => {
    setDraft(next);
    setError(null);
  };
  const save = async () => {
    setSaving(true);
    const message = await saveReminder(draft, id);
    setSaving(false);
    if (message) setError(message);
    else leave();
  };

  return (
    <Screen
      underHeader
      title={id ? "Editar lembrete" : "Novo lembrete"}
      footer={
        <View style={styles.actions}>
          <View style={styles.grow}>
            <PrimaryButton label="Cancelar" variant="tinted" onPress={leave} />
          </View>
          <View style={styles.grow}>
            <PrimaryButton label="Salvar" glow disabled={!draft.title.trim()} loading={saving} onPress={() => void save()} />
          </View>
        </View>
      }>
      {/* The actions live in the footer; the header keeps only the title. */}
      <Stack.Screen options={{ headerLeft: () => null, headerRight: () => null }} />
      {error && (
        <AppText variant="subheadline" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
      <ReminderForm draft={draft} onChange={change} now={now} />
      {id && <EditActions id={id} opened={opened} />}
    </Screen>
  );
}

/** Create (`id` "novo") or edit a personal reminder; a notification adds `occ` and `lead`. */
export default function ReminderScreen() {
  const { id, occ, lead } = useLocalSearchParams<{ id: string; occ?: string; lead?: string }>();
  const { data } = useAppState();
  const isNew = id === "novo";
  // Read once: deleting from this screen must not swap the form for the "apagado" message while it closes.
  const [existing] = useState(() => (isNew ? undefined : data.reminders[id]));

  if (!isNew && (!existing || existing.deletedAt !== null)) {
    return (
      <Screen underHeader title="Lembrete">
        <AppText variant="body" color="secondaryLabel">
          Este lembrete foi apagado.
        </AppText>
        <PrimaryButton label="Voltar" onPress={leave} />
      </Screen>
    );
  }
  return <Editor id={isNew ? undefined : id} existing={existing} opened={openedFrom(occ, lead)} />;
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: space.md },
  grow: { flex: 1 },
});
