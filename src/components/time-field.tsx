import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { formatTime, parseTime } from "@/domain/time";
import { HIT, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { WheelTime } from "./wheel-time";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Leading icon, as in a settings list. */
  icon?: { ios: string; android: string };
}

function toDate(value: string): Date {
  const minutes = parseTime(value) ?? 0;
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

function fromDate(date: Date): string {
  return formatTime(date.getHours() * 60 + date.getMinutes());
}

/** A settings-style row: label on the left, native time picker on the right. */
export function TimeField({ label, value, onChange, icon }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const onPicked = (_event: unknown, date: Date) => onChange(fromDate(date));

  let control;
  if (Platform.OS === "ios") {
    control = (
      <DateTimePicker
        value={toDate(value)}
        mode="time"
        display="compact"
        locale="pt-BR"
        accentColor={colors.accent}
        onValueChange={onPicked}
        accessibilityLabel={label}
      />
    );
  } else if (Platform.OS === "android") {
    control = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityHint="Abre o seletor de horário"
        onPress={() =>
          DateTimePickerAndroid.open({ value: toDate(value), mode: "time", is24Hour: true, onValueChange: onPicked })
        }
        style={[styles.pill, { backgroundColor: colors.fill }]}>
        <AppText variant="headline" style={styles.digits}>{value}</AppText>
      </Pressable>
    );
  } else {
    // The web: a pill that opens hour/minute wheels below the row (a typed field has no ":" key on the iPhone).
    control = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((shown) => !shown)}
        style={[styles.pill, { backgroundColor: open ? colors.accent : colors.fill }]}>
        <AppText variant="headline" style={[styles.digits, open && styles.onAccent]}>{value}</AppText>
      </Pressable>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        {icon && <Icon ios={icon.ios} android={icon.android} size={20} color={colors.accent} />}
        <AppText variant="body" style={styles.label}>
          {label}
        </AppText>
        {control}
      </View>
      {open && <WheelTime value={value} onChange={onChange} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: HIT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  pill: {
    minHeight: HIT - 6,
    minWidth: 84,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  label: { flex: 1 },
  digits: { fontVariant: ["tabular-nums"] },
  onAccent: { color: "#FFFFFF" },
});
