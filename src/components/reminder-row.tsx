import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";

import { HIT, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

interface Props {
  /** Left column; done rows leave it out. */
  time?: string;
  /** Under the time, e.g. "Sex, 30". */
  day?: string;
  title: string;
  /** Second line, e.g. "↻ toda semana · antecipa 1 h". */
  detail?: string;
  /** Replaces the day with "Atrasado" in red. */
  overdue?: boolean;
  done?: boolean;
  /** Defined only in selection mode: shows a selection circle and hides the chevron. */
  selected?: boolean | undefined;
  onPress: () => void;
  /** Shows the circle to complete on the left (stands in for swipe actions). */
  onToggleDone?: () => void;
}

const CIRCLE = 24;

function DoneCircle({ done, title, onPress }: { done: boolean; title: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${done ? "Desfazer" : "Concluir"} ${title}`}
      accessibilityState={{ checked: done }}
      hitSlop={(HIT - CIRCLE) / 2}
      onPress={() => {
        // Completing gets its success haptic from the action itself.
        if (done) void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Circle on={done} tint={colors.success} />
    </Pressable>
  );
}

function describe({ time, day, title, detail, overdue, done }: Props): string {
  const when = [time, overdue ? "atrasado" : day].filter(Boolean).join(", ");
  return `${when ? `${when}: ` : ""}${title}${done ? ", concluído" : ""}${detail ? `. ${detail}` : ""}`;
}

function Circle({ on, tint }: { on: boolean; tint: string }) {
  const { colors } = useTheme();
  return (
    <Icon
      ios={on ? "checkmark.circle.fill" : "circle"}
      android={on ? "check_circle" : "radio_button_unchecked"}
      size={CIRCLE}
      color={on ? tint : colors.secondaryLabel}
    />
  );
}

function Texts({ time, day, title, detail, overdue, done }: Props) {
  const caption = overdue ? "Atrasado" : day;
  const tone = done ? "secondaryLabel" : "label";
  return (
    <>
      {time ? (
        <View style={styles.when}>
          <AppText variant="headline" color={tone} style={styles.digits}>
            {time}
          </AppText>
          {caption ? (
            <AppText variant="caption" color={overdue ? "danger" : "secondaryLabel"} numberOfLines={1}>
              {caption}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <View style={styles.body}>
        <AppText variant="body" color={tone} style={done && styles.struck} numberOfLines={2}>
          {title}
        </AppText>
        {detail ? (
          <AppText variant="footnote" color="secondaryLabel" numberOfLines={1}>
            {detail}
          </AppText>
        ) : null}
      </View>
    </>
  );
}

/** One reminder in a list: time and day, title and detail, a chevron; optional complete or select circle. */
export function ReminderRow(props: Props) {
  const { title, done = false, selected, onPress, onToggleDone } = props;
  const { colors } = useTheme();
  const selecting = selected !== undefined;

  return (
    <View style={styles.row}>
      {onToggleDone && !selecting && <DoneCircle done={done} title={title} onPress={onToggleDone} />}
      <Pressable
        onPress={onPress}
        accessibilityRole={selecting ? "checkbox" : "button"}
        accessibilityLabel={describe(props)}
        accessibilityState={selecting ? { checked: selected } : undefined}
        accessibilityHint={selecting ? undefined : "Abre o lembrete"}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}>
        {selecting && <Circle on={selected} tint={colors.accent} />}
        <Texts {...props} />
        {!selecting && <Icon ios="chevron.right" android="chevron_right" size={16} color={colors.secondaryLabel} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.md, minHeight: HIT },
  when: { width: 50 },
  digits: { fontVariant: ["tabular-nums"] },
  body: { flex: 1, gap: 2 },
  struck: { textDecorationLine: "line-through" },
});
