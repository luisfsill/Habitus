import { StyleSheet, View } from "react-native";

import { computeSchedule, trickTimeLabels } from "@/domain/schedule";
import type { Weekday } from "@/domain/time";
import { TRICKS } from "@/domain/tricks";
import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";

interface Props {
  start: string;
  end: string;
  days: readonly Weekday[];
}

/** Live preview of the five computed times, or the validation error. */
export function SchedulePreview({ start, end, days }: Props) {
  const { colors } = useTheme();
  const result = computeSchedule(start, end, days);

  if (!result.ok) {
    return (
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
        <AppText variant="subheadline" color="danger">
          {result.message}
        </AppText>
      </View>
    );
  }

  const times = trickTimeLabels(result.schedule);
  return (
    <View accessibilityLiveRegion="polite" style={styles.list}>
      {TRICKS.map((trick, i) => (
        <View
          key={trick.index}
          accessible
          accessibilityLabel={`${times[i]}, ${trick.title}`}
          style={[styles.item, i > 0 && { borderTopColor: colors.separator, borderTopWidth: StyleSheet.hairlineWidth }]}>
          <AppText variant="headline" color="accentText" style={styles.time}>
            {times[i]}
          </AppText>
          <AppText variant="body" style={styles.title}>
            {trick.title}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  item: { flexDirection: "row", alignItems: "center", gap: space.lg, minHeight: 44, paddingVertical: space.sm },
  time: { width: 56, fontVariant: ["tabular-nums"] },
  title: { flex: 1 },
  error: { paddingVertical: space.sm },
});
