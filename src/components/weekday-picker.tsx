import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";

import { ALL_WEEKDAYS, type Weekday } from "@/domain/time";
import { HIT, radius, type, useTheme } from "@/theme";

import { AppText } from "./app-text";

// 7 dots must fit a 375 pt phone inside a card; hitSlop restores the 44 pt target.
const DOT = 40;
const SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];
export const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

interface Props {
  value: readonly Weekday[];
  onChange: (days: Weekday[]) => void;
}

export function WeekdayPicker({ value, onChange }: Props) {
  const { colors } = useTheme();
  const toggle = (day: Weekday) => {
    void Haptics.selectionAsync();
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));
  };

  return (
    <View style={styles.row} accessibilityRole="toolbar" accessibilityLabel="Dias da semana ativos">
      {ALL_WEEKDAYS.map((day) => {
        const on = value.includes(day);
        return (
          <Pressable
            key={day}
            onPress={() => toggle(day)}
            accessibilityRole="checkbox"
            accessibilityLabel={WEEKDAY_NAMES[day]}
            accessibilityState={{ checked: on }}
            hitSlop={(HIT - DOT) / 2}
            style={[styles.day, { backgroundColor: on ? colors.accent : colors.fill }]}>
            <AppText style={[type.headline, { color: on ? colors.onAccent : colors.secondaryLabel }]} maxFontSizeMultiplier={1.3}>
              {SHORT[day]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: 4 },
  day: {
    width: DOT,
    height: DOT,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
