import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";

import { ALL_WEEKDAYS, type Weekday } from "@/domain/time";
import { HIT, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { ToggleSwitch } from "./toggle-switch";
import { WEEKDAY_NAMES, WeekdayPicker } from "./weekday-picker";

interface Props {
  value: readonly Weekday[];
  onChange: (days: Weekday[]) => void;
}

const PRESETS: readonly { label: string; days: readonly Weekday[] }[] = [
  { label: "Todos os dias", days: ALL_WEEKDAYS },
  { label: "Dias úteis", days: [1, 2, 3, 4, 5] },
  { label: "Fim de semana", days: [0, 6] },
];

const same = (a: readonly Weekday[], b: readonly Weekday[]) => a.length === b.length && a.every((d) => b.includes(d));
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The week at a glance: how many days, the seven dots, quick presets. */
export function WeekdaySummary({ value, onChange }: Props) {
  const { colors } = useTheme();
  const count = value.length;
  return (
    <View style={styles.summary}>
      <View style={styles.count}>
        <AppText variant="largeTitle" color="accentText" style={styles.digits}>
          {count}
        </AppText>
        <AppText variant="body" color="secondaryLabel">
          {count === 1 ? "dia por semana com dicas" : "dias por semana com dicas"}
        </AppText>
      </View>
      <WeekdayPicker value={value} onChange={onChange} />
      <View style={styles.presets}>
        {PRESETS.map((preset) => {
          const on = same(value, preset.days);
          return (
            <Pressable
              key={preset.label}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange([...preset.days]);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, { backgroundColor: on ? colors.accentSoft : colors.fill, borderColor: on ? colors.accent : "transparent" }]}>
              <AppText variant="subheadline" color={on ? "accentText" : "label"}>
                {preset.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** One row for a day: a briefcase on weekdays, a sofa on the weekend, and a switch. */
export function WeekdayRow({ day, value, onChange }: Props & { day: Weekday }) {
  const { colors } = useTheme();
  const on = value.includes(day);
  const weekend = day === 0 || day === 6;
  const name = capitalize(WEEKDAY_NAMES[day]);
  return (
    <View style={styles.row}>
      <Icon ios={weekend ? "sofa" : "briefcase"} android={weekend ? "weekend" : "work"} size={20} color={on ? colors.accent : colors.secondaryLabel} />
      <AppText variant="body" color={on ? "label" : "secondaryLabel"} style={styles.name}>
        {name}
      </AppText>
      <ToggleSwitch
        value={on}
        onValueChange={(next) => onChange(next ? [...value, day].sort((a, b) => a - b) : value.filter((d) => d !== day))}
        accessibilityLabel={name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: space.lg },
  count: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
  digits: { fontVariant: ["tabular-nums"] },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: { minHeight: HIT, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, justifyContent: "center" },
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", gap: space.md },
  name: { flex: 1 },
});
