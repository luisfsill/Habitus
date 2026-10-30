import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { HIT, radius, useTheme } from "@/theme";

import { AppText } from "./app-text";

const HEIGHT = 32;
const INSET = 2;
// Ease-out with no overshoot: the pill settles without a bounce.
const SLIDE = { duration: 220, easing: Easing.out(Easing.cubic) };

interface Props<T extends string> {
  /** `dot` puts a small red dot after the label, e.g. for news behind that tab. */
  options: readonly { value: T; label: string; dot?: boolean }[];
  value: T;
  onChange: (value: T) => void;
}

/** iOS segmented control: grey track, cobalt pill that slides to the chosen tab. */
export function SegmentedTabs<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const segment = width > 0 ? (width - 2 * INSET) / options.length : 0;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const placed = useRef(false);
  useEffect(() => {
    if (segment === 0) return;
    const to = index * segment;
    // Jumps into place on first layout; slides only when the choice changes.
    x.set(placed.current && !reduceMotion ? withTiming(to, SLIDE) : to);
    placed.current = true;
  }, [index, segment, reduceMotion, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: colors.fill }]}>
      {segment > 0 && <Animated.View style={[styles.pill, { width: segment, backgroundColor: colors.accent }, pill]} />}
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.dot ? `${option.label}, novidades` : option.label}
            accessibilityState={{ selected: on }}
            hitSlop={(HIT - HEIGHT) / 2}
            onPress={() => {
              if (on) return;
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={styles.tab}>
            <AppText
              variant="footnote"
              maxFontSizeMultiplier={1.4}
              numberOfLines={1}
              style={[styles.label, { color: on ? colors.onAccent : colors.secondaryLabel }]}>
              {option.label}
            </AppText>
            {option.dot && <View style={[styles.dot, { backgroundColor: colors.danger }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // A phone's width at most: on a wide screen two or three tabs spread over the column would read as a bar.
  track: { flexDirection: "row", height: HEIGHT, maxWidth: 420, padding: INSET, borderRadius: radius.sm },
  pill: { position: "absolute", top: INSET, bottom: INSET, left: INSET, borderRadius: radius.sm - INSET },
  tab: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontWeight: "600" },
});
