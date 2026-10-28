import { StyleSheet, View } from "react-native";

import { computeSchedule, trickTimeLabels } from "@/domain/schedule";
import type { Weekday } from "@/domain/time";
import { TRICKS } from "@/domain/tricks";
import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

interface Props {
  start: string;
  end: string;
  days: readonly Weekday[];
  bedtime?: number;
}

const DOT = 12;

/** The day's six tips as a vertical timeline: a dot per time on a thin line, the last one a moon. */
export function ScheduleTimeline({ start, end, days, bedtime }: Props) {
  const { colors } = useTheme();
  const result = computeSchedule(start, end, days, bedtime);

  if (!result.ok) {
    return (
      <View accessibilityRole="alert" accessibilityLiveRegion="polite">
        <AppText variant="subheadline" color="danger">
          {result.message}
        </AppText>
      </View>
    );
  }

  const times = trickTimeLabels(result.schedule);
  const last = TRICKS.length - 1;
  return (
    <View accessibilityLiveRegion="polite">
      {TRICKS.map((trick, i) => (
        <View key={trick.index} accessible accessibilityLabel={`${times[i]}, ${trick.title}`} style={styles.item}>
          <View style={styles.rail}>
            <View style={[styles.line, { backgroundColor: i === 0 ? "transparent" : colors.separator }]} />
            {i === last ? (
              <Icon ios="moon.fill" android="bedtime" size={DOT + 4} color={colors.accent} />
            ) : (
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
            )}
            <View style={[styles.line, { backgroundColor: i === last ? "transparent" : colors.separator }]} />
          </View>
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
  item: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 48 },
  rail: { width: DOT + 4, alignSelf: "stretch", alignItems: "center" },
  line: { flex: 1, width: 2 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  time: { width: 56, fontVariant: ["tabular-nums"] },
  title: { flex: 1 },
});
