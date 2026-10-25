import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import { formatTime, parseTime } from "@/domain/time";
import { HIT, radius, space, type, useTheme } from "@/theme";

import { AppText } from "./app-text";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
export function TimeField({ label, value, onChange }: Props) {
  const { colors } = useTheme();
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
    control = (
      <TextInput
        accessibilityLabel={label}
        defaultValue={value}
        maxLength={5}
        inputMode="numeric"
        onChangeText={(text) => parseTime(text) !== null && onChange(text)}
        style={[styles.pill, styles.webInput, type.headline, styles.digits, { backgroundColor: colors.fill, color: colors.label }]}
      />
    );
  }

  return (
    <View style={styles.row}>
      <AppText variant="body" style={styles.label}>
        {label}
      </AppText>
      {control}
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
  webInput: { width: 96, flexGrow: 0 },
  digits: { fontVariant: ["tabular-nums"] },
});
