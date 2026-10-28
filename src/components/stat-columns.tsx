import { Pressable, StyleSheet, View } from "react-native";

import { type Palette, space, useTheme } from "@/theme";

import { AppText } from "./app-text";

export interface Stat {
  value: string;
  label: string;
  color?: keyof Palette;
  onPress?: () => void;
  /** Spoken instead of "label: value". */
  accessibilityLabel?: string;
}

interface Props {
  stats: readonly Stat[];
  /** Columns per row; more stats wrap into further rows. */
  columns?: number;
}

/** Row of figures split by hairlines like a table header. */
export function StatColumns({ stats, columns = stats.length }: Props) {
  const { colors } = useTheme();
  const rows = Math.ceil(stats.length / columns);
  return (
    <View style={[styles.wrap, { borderColor: colors.separator }]}>
      {stats.map((stat, i) => {
        const cell = [
          styles.cell,
          { width: `${100 / columns}%` as const, borderColor: colors.separator },
          (i + 1) % columns !== 0 && styles.right,
          Math.floor(i / columns) < rows - 1 && styles.bottom,
        ];
        const body = (
          <>
            <AppText variant="title2" color={stat.color ?? "label"} style={styles.digits} maxFontSizeMultiplier={1.3}>
              {stat.value}
            </AppText>
            <AppText variant="footnote" color="secondaryLabel" align="center">
              {stat.label}
            </AppText>
          </>
        );
        const label = stat.accessibilityLabel ?? `${stat.label}: ${stat.value}`;
        return stat.onPress ? (
          <Pressable key={stat.label} onPress={stat.onPress} accessibilityRole="button" accessibilityLabel={label} style={cell}>
            {body}
          </Pressable>
        ) : (
          <View key={stat.label} accessible accessibilityLabel={label} style={cell}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: { alignItems: "center", justifyContent: "center", paddingVertical: space.md, paddingHorizontal: space.xs, gap: 2 },
  right: { borderRightWidth: StyleSheet.hairlineWidth },
  bottom: { borderBottomWidth: StyleSheet.hairlineWidth },
  digits: { fontVariant: ["tabular-nums"] },
});
