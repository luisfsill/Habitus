import { Pressable, StyleSheet, View } from "react-native";

import { HIT, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

interface Props {
  cups: number;
  goal: number;
  onAdd: () => void;
  onRemove: () => void;
}

const GLASS = "🥛";

/** Today's water in one line: cups against the goal, one-tap −1 / +1, and a thin bar under it. */
export function WaterRow({ cups, goal, onAdd, onRemove }: Props) {
  const { colors } = useTheme();
  const done = cups >= goal;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Icon ios="drop.fill" android="water_drop" size={18} color={done ? colors.success : colors.accent} />
        <View style={styles.text} accessible accessibilityLabel={`Água: ${cups} de ${goal} copos${done ? ", meta batida" : ""}`}>
          <AppText variant="subheadline" numberOfLines={1}>
            <AppText variant="subheadline" style={styles.addText}>
              {cups}/{goal} copos
            </AppText>
            <AppText variant="subheadline" color={done ? "successText" : "secondaryLabel"}>
              {done ? " · meta batida!" : ` · faltam ${goal - cups}`}
            </AppText>
          </AppText>
        </View>
        <Pressable
          onPress={onRemove}
          disabled={cups === 0}
          accessibilityRole="button"
          accessibilityLabel="Tirar um copo"
          hitSlop={6}
          style={[styles.add, { backgroundColor: colors.fill, opacity: cups === 0 ? 0.4 : 1 }]}>
          <AppText variant="subheadline" style={[styles.addText, { color: colors.label }]}>
            −1 {GLASS}
          </AppText>
        </Pressable>
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Bebi um copo"
          style={({ pressed }) => [styles.add, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}>
          <AppText variant="subheadline" style={[styles.addText, styles.onAccent]}>
            +1 {GLASS}
          </AppText>
        </Pressable>
      </View>
      <View style={[styles.track, { backgroundColor: colors.ringTrack }]}>
        <View style={[styles.fill, { width: `${Math.min(cups / goal, 1) * 100}%`, backgroundColor: done ? colors.success : colors.accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: HIT },
  text: { flex: 1 },
  add: { height: 32, paddingHorizontal: space.md, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  addText: { fontWeight: "700" },
  onAccent: { color: "#FFFFFF" },
  track: { height: 3, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },
});
