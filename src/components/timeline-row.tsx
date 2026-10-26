import { Pressable, StyleSheet, View } from "react-native";

import type { TrickStatus } from "@/domain/history";
import type { Trick } from "@/domain/tricks";
import { HIT, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

interface Props {
  trick: Trick;
  time: string;
  status: TrickStatus;
  /** Shown on the right of the next trick, e.g. its countdown. */
  countdown?: string;
  onPress: () => void;
}

const STATUS_LABEL: Record<TrickStatus, string> = { done: "Feita", next: "Próxima", pending: "Pendente" };

/** One list row of the day: time, trick, and a check, countdown or chevron on the right. */
export function TimelineRow({ trick, time, status, countdown, onPress }: Props) {
  const { colors } = useTheme();
  const done = status === "done";
  const next = status === "next";
  const tint = next ? "accentText" : "label";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${time}, dica ${trick.index + 1}: ${trick.title}. ${STATUS_LABEL[status]}${countdown ? `, em ${countdown}` : ""}.`}
      accessibilityHint="Abre a dica"
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <AppText variant="subheadline" color={next ? "accentText" : "secondaryLabel"} style={styles.time}>
        {time}
      </AppText>
      <View style={styles.body}>
        <AppText variant="headline" color={tint}>
          {trick.title}
        </AppText>
        <AppText variant="footnote" color="secondaryLabel" numberOfLines={1}>
          {trick.summary}
        </AppText>
      </View>
      {done && <Icon ios="checkmark.circle.fill" android="check_circle" size={22} color={colors.success} />}
      {next && countdown && (
        <AppText variant="headline" color="accentText" style={styles.digits}>
          {countdown}
        </AppText>
      )}
      {!done && !countdown && <Icon ios="chevron.right" android="chevron_right" size={16} color={colors.secondaryLabel} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: HIT },
  time: { width: 48, fontVariant: ["tabular-nums"] },
  body: { flex: 1, gap: 2 },
  digits: { fontVariant: ["tabular-nums"] },
});
