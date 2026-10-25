import { Pressable, StyleSheet, View } from "react-native";

import type { TrickStatus } from "@/domain/history";
import type { Trick } from "@/domain/tricks";
import { HIT, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

interface Props {
  trick: Trick;
  time: string;
  status: TrickStatus;
  last?: boolean;
  onPress: () => void;
}

const STATUS_LABEL: Record<TrickStatus, string> = { done: "Feito", next: "Próximo", pending: "Pendente" };

export function TimelineRow({ trick, time, status, last, onPress }: Props) {
  const { colors } = useTheme();
  const done = status === "done";
  const next = status === "next";
  const dot = done ? colors.success : next ? colors.accent : colors.fill;
  const pillBg = done ? colors.successSoft : next ? colors.accentSoft : colors.fill;
  const pillText = done ? "successText" : next ? "accentText" : "secondaryLabel";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${time}, truque ${trick.index + 1}: ${trick.title}. ${STATUS_LABEL[status]}.`}
      accessibilityHint="Abre o truque"
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: dot }]}>
          <Icon
            ios={done ? "checkmark" : trick.symbol.ios}
            android={done ? "check" : trick.symbol.android}
            size={16}
            color={done || next ? colors.onAccent : colors.secondaryLabel}
          />
        </View>
        {!last && <View style={[styles.line, { backgroundColor: colors.separator }]} />}
      </View>
      <View style={styles.body}>
        <AppText variant="footnote" color="secondaryLabel" style={styles.digits}>
          {time}
        </AppText>
        <AppText variant="headline">{trick.title}</AppText>
        <AppText variant="subheadline" color="secondaryLabel">
          {trick.summary}
        </AppText>
      </View>
      <View style={[styles.pill, { backgroundColor: pillBg }]}>
        <AppText variant="caption" color={pillText}>
          {STATUS_LABEL[status]}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md, minHeight: HIT },
  rail: { alignItems: "center", width: 32 },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  line: { flex: 1, width: 2, marginVertical: 4, borderRadius: 1 },
  body: { flex: 1, paddingBottom: space.lg, gap: 2 },
  pill: { alignSelf: "flex-start", marginTop: 14, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  digits: { fontVariant: ["tabular-nums"] },
});
