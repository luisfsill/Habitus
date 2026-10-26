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

/** Today's water: cups against the goal, a thin bar and one-tap +1. */
export function WaterRow({ cups, goal, onAdd, onRemove }: Props) {
  const { colors } = useTheme();
  const done = cups >= goal;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Icon ios="drop.fill" android="water_drop" size={22} color={done ? colors.success : colors.accent} />
        <View style={styles.text} accessible accessibilityLabel={`Água: ${cups} de ${goal} copos${done ? ", meta batida" : ""}`}>
          <AppText variant="headline">
            {cups} de {goal} copos
          </AppText>
          <AppText variant="footnote" color={done ? "successText" : "secondaryLabel"}>
            {done ? "Meta de hoje batida!" : `Faltam ${goal - cups} para a meta`}
          </AppText>
        </View>
        <Pressable
          onPress={onRemove}
          disabled={cups === 0}
          accessibilityRole="button"
          accessibilityLabel="Tirar um copo"
          hitSlop={6}
          style={[styles.minus, { backgroundColor: colors.fill, opacity: cups === 0 ? 0.4 : 1 }]}>
          <Icon ios="minus" android="remove" size={16} color={colors.label} />
        </Pressable>
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Bebi um copo"
          style={({ pressed }) => [styles.add, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}>
          <AppText variant="subheadline" style={styles.addText}>
            +1 copo
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
  wrap: { gap: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: HIT },
  text: { flex: 1, gap: 2 },
  minus: { width: 36, height: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  add: { height: 36, paddingHorizontal: space.md, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  addText: { color: "#FFFFFF", fontWeight: "700" },
  track: { height: 4, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },
});
