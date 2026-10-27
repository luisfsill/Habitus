import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { MONTHS, WEEKDAYS } from "@/domain/reminder-text";
import { addDays, dayKey, fromDayKey } from "@/domain/time";
import { HIT, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { WheelDate } from "./wheel-date";

interface Props {
  label: string;
  /** "YYYY-MM-DD". */
  value: string;
  onChange: (value: string) => void;
}

/** "Hoje, 27 out", "Sex, 30 out", "Ter, 2 fev 2027". */
function dateLabel(value: string): string {
  const date = fromDayKey(value);
  const today = new Date();
  const day = value === dayKey(today) ? "Hoje" : value === dayKey(addDays(today, 1)) ? "Amanhã" : WEEKDAYS[date.getDay()];
  const year = date.getFullYear() === today.getFullYear() ? "" : ` ${date.getFullYear()}`;
  return `${day}, ${date.getDate()} ${MONTHS[date.getMonth()]}${year}`;
}

/** A settings-style row: label on the left, the date on the right. Same shape as TimeField. */
export function DateField({ label, value, onChange }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const onPicked = (_event: unknown, date: Date) => onChange(dayKey(date));
  const shown = dateLabel(value);

  let control;
  if (Platform.OS === "ios") {
    control = (
      <DateTimePicker
        value={fromDayKey(value)}
        mode="date"
        display="compact"
        locale="pt-BR"
        accentColor={colors.accent}
        onValueChange={onPicked}
        accessibilityLabel={label}
      />
    );
  } else {
    // Android opens the system dialog; the web opens day/month/year wheels below the row.
    const android = Platform.OS === "android";
    const highlight = !android && open;
    control = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown}`}
        accessibilityHint={android ? "Abre o seletor de data" : undefined}
        accessibilityState={android ? undefined : { expanded: open }}
        onPress={() =>
          android
            ? DateTimePickerAndroid.open({ value: fromDayKey(value), mode: "date", onValueChange: onPicked })
            : setOpen((was) => !was)
        }
        style={[styles.pill, { backgroundColor: highlight ? colors.accent : colors.fill }]}>
        <AppText variant="headline" style={highlight && { color: colors.onAccent }}>
          {shown}
        </AppText>
      </Pressable>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        <AppText variant="body" style={styles.label}>
          {label}
        </AppText>
        {control}
      </View>
      {open && <WheelDate value={value} onChange={onChange} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  pill: {
    minHeight: HIT - 6,
    minWidth: 84,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { flex: 1 },
});
