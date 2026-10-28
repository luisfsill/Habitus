import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { alertLabel, formatLead, joinList, shortDate } from "@/domain/reminder-text";
import { draftAlerts, draftOccurrences, MAX_LEADS, MAX_NOTES, MAX_TITLE, type ReminderDraft } from "@/domain/reminders";
import { HIT, space, useTheme } from "@/theme";

import { ActionRow } from "./action-row";
import { AppText } from "./app-text";
import { DateField } from "./date-field";
import { Icon } from "./icon";
import { LeadPicker } from "./lead-picker";
import { unitWord } from "./picker-parts";
import { RepeatPicker } from "./repeat-picker";
import { Section } from "./section";
import { TextField } from "./text-field";
import { TimeField } from "./time-field";
import { ToggleSwitch } from "./toggle-switch";

interface Props {
  draft: ReminderDraft;
  onChange: (draft: ReminderDraft) => void;
  /** For the previews in the section footers. */
  now: Date;
}

const DEFAULT_LEAD = 60;
const DEFAULT_REPEAT = { every: 1, unit: "week" } as const;

function Fields({ draft, onChange }: Props) {
  return (
    <View style={styles.fields}>
      <TextField
        label="Título"
        placeholder="Ex.: Estudar inglês"
        value={draft.title}
        maxLength={MAX_TITLE}
        autoCapitalize="sentences"
        style={styles.field}
        onChangeText={(title) => onChange({ ...draft, title })}
      />
      <TextField
        label="Notas"
        placeholder="Opcional"
        value={draft.notes}
        maxLength={MAX_NOTES}
        autoCapitalize="sentences"
        multiline
        style={styles.field}
        onChangeText={(notes) => onChange({ ...draft, notes })}
      />
    </View>
  );
}

function When({ draft, onChange }: Props) {
  const date = draft.at.slice(0, 10);
  const time = draft.at.slice(11);
  return (
    <Section title="Quando">
      <DateField label="Data" value={date} onChange={(next) => onChange({ ...draft, at: `${next}T${time}` })} />
      <TimeField label="Hora" value={time} onChange={(next) => onChange({ ...draft, at: `${date}T${next}` })} />
    </Section>
  );
}

function LeadRow({ lead, open, onToggle, onRemove }: { lead: number; open: boolean; onToggle: () => void; onRemove: () => void }) {
  const { colors } = useTheme();
  const label = `${formatLead(lead)} antes`;
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`Antecipação: ${label}`}
        accessibilityHint="Ajusta a antecipação"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.row, styles.grow, { opacity: pressed ? 0.6 : 1 }]}>
        <Icon ios="bell" android="notifications" size={20} color={colors.accent} />
        <AppText variant="body" color={open ? "accentText" : "label"} style={styles.grow}>
          {label}
        </AppText>
      </Pressable>
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Remover antecipação de ${formatLead(lead)}`}
        style={({ pressed }) => [styles.side, { opacity: pressed ? 0.6 : 1 }]}>
        <Icon ios="minus.circle.fill" android="do_not_disturb_on" size={22} color={colors.danger} />
      </Pressable>
    </View>
  );
}

function alertsFooter(draft: ReminderDraft, now: Date): string | undefined {
  const alerts = draftAlerts(draft, now);
  if (!alerts.length) return undefined;
  const count = alerts.length === 1 ? "1 aviso" : `${alerts.length} avisos`;
  return `Você recebe ${count}: ${joinList(alerts.map((at) => alertLabel(at, now)))}`;
}

function Leads({ draft, onChange, now }: Props) {
  // Index of the lead whose picker is open.
  const [editing, setEditing] = useState<number | null>(null);
  const { leads } = draft;
  const setLeads = (next: number[]) => onChange({ ...draft, leads: next });
  const add = () => {
    let lead = DEFAULT_LEAD;
    while (leads.includes(lead)) lead += DEFAULT_LEAD;
    setLeads([...leads, lead]);
    setEditing(leads.length);
  };
  const rows = leads.flatMap((lead, i) => {
    const open = editing === i;
    const row = (
      <LeadRow
        key={`lead-${i}`}
        lead={lead}
        open={open}
        onToggle={() => setEditing(open ? null : i)}
        onRemove={() => {
          setLeads(leads.filter((_, j) => j !== i));
          setEditing(null);
        }}
      />
    );
    const picker = <LeadPicker key={`picker-${i}`} value={lead} onChange={(v) => setLeads(leads.map((l, j) => (j === i ? v : l)))} />;
    return open ? [row, picker] : [row];
  });
  return (
    <Section title="Antecipar">
      {rows}
      {leads.length < MAX_LEADS && (
        <ActionRow label="Adicionar antecipação" icon={{ ios: "plus.circle.fill", android: "add_circle" }} onPress={add} />
      )}
      <AppText variant="footnote" color="secondaryLabel">{alertsFooter(draft, now)}</AppText>
    </Section>
  );
}

function Repeat({ draft, onChange, now }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const { repeat } = draft;
  const footer = repeat ? `Próximas: ${joinList(draftOccurrences(draft, now, 3).map((at) => shortDate(at, now)))}` : undefined;
  return (
    <Section title="Repetir">
      <View style={styles.row}>
        <Icon ios="arrow.clockwise" android="repeat" size={20} color={colors.accent} />
        <AppText variant="body" style={styles.grow}>
          Repetir
        </AppText>
        <ToggleSwitch
          accessibilityLabel="Repetir"
          value={repeat !== null}
          onValueChange={(on) => {
            onChange({ ...draft, repeat: on ? DEFAULT_REPEAT : null });
            setOpen(false);
          }}
        />
      </View>
      {repeat && (
        <Pressable
          onPress={() => setOpen((was) => !was)}
          accessibilityRole="button"
          accessibilityLabel={`A cada ${repeat.every} ${unitWord(repeat.unit, repeat.every)}`}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
          <View style={styles.iconSpace} />
          <AppText variant="body" style={styles.grow}>
            A cada
          </AppText>
          <AppText variant="body" color="accentText">
            {`${repeat.every} ${unitWord(repeat.unit, repeat.every)}`}
          </AppText>
        </Pressable>
      )}
      {repeat && open && <RepeatPicker value={repeat} onChange={(next) => onChange({ ...draft, repeat: next })} />}
      {footer && <AppText variant="footnote" color="secondaryLabel">{footer}</AppText>}
    </Section>
  );
}

/** The reminder form's sections: title and notes, Quando, Antecipar and Repetir, each with a live preview. */
export function ReminderForm(props: Props) {
  return (
    <>
      <Fields {...props} />
      <When {...props} />
      <Leads {...props} />
      <Repeat {...props} />
    </>
  );
}

const styles = StyleSheet.create({
  fields: { gap: space.md },
  // TextField's flex basis is for the admin's wrapping rows; stacked, it would become a height.
  field: { flexGrow: 0, flexBasis: "auto" },
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", gap: space.md },
  grow: { flex: 1 },
  side: { minWidth: HIT, minHeight: HIT, alignItems: "flex-end", justifyContent: "center" },
  iconSpace: { width: 20 },
});
