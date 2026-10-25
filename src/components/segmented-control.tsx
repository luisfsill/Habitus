import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";

import { HIT, radius, useTheme } from "@/theme";

import { AppText } from "./app-text";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** iOS-style segmented control; screen readers hear it as a radio group. */
export function SegmentedControl<T extends string>({ label, options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.track, { backgroundColor: colors.fill }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={[styles.segment, selected && { backgroundColor: colors.surface, shadowColor: colors.shadow }, selected && styles.raised]}>
            <AppText variant="subheadline" color={selected ? "label" : "secondaryLabel"} style={selected && styles.bold} maxFontSizeMultiplier={1.4}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", borderRadius: radius.sm, padding: 3, gap: 3 },
  segment: { flex: 1, minHeight: HIT - 6, borderRadius: radius.sm - 2, alignItems: "center", justifyContent: "center" },
  raised: { shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  bold: { fontWeight: "600" },
});
