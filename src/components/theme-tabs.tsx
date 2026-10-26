import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { type LayoutRectangle, Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import type { ThemePreference } from "@/domain/app-data";
import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

// Port of the "tabs" variant of designali's shadcn Theme switcher (size lg, with labels).
const OPTIONS: readonly { value: ThemePreference; label: string; ios: string; android: string }[] = [
  { value: "light", label: "Claro", ios: "sun.max", android: "light_mode" },
  { value: "dark", label: "Escuro", ios: "moon", android: "dark_mode" },
  { value: "auto", label: "Automático", ios: "desktopcomputer", android: "desktop_windows" },
];

const LOOK = {
  // Light track a step darker than the original #f8fafc so the white pill shows on the light backdrop.
  light: { track: "#e9eef4", border: "#d5dde7", pill: "#ffffff" },
  dark: { track: "#1e293b", border: "#334155", pill: "#334155" },
} as const;

// framer-motion's spring uses mass 1; Reanimated 4 defaults to 4, which wobbles far more.
const SPRING = { stiffness: 500, damping: 30, mass: 1 };

interface Props {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}

/** Light / dark / automatic tabs with icons; a raised pill springs to the selected one. */
export function ThemeTabs({ value, onChange }: Props) {
  const { colors, scheme } = useTheme();
  const look = LOOK[scheme];
  const [frames, setFrames] = useState<Partial<Record<ThemePreference, LayoutRectangle>>>({});
  const frame = frames[value];
  const first = frames[OPTIONS[0].value];
  const last = frames[OPTIONS[OPTIONS.length - 1].value];
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  // The pill's inner edges: the spring may wobble, but never past the track.
  const min = first?.x ?? 0;
  const max = last ? last.x + last.width : 0;

  useEffect(() => {
    if (!frame) return;
    // First layout jumps into place; later changes spring.
    if (w.get() === 0) {
      x.set(frame.x);
      w.set(frame.width);
      return;
    }
    x.set(withSpring(frame.x, SPRING));
    w.set(withSpring(frame.width, SPRING));
  }, [frame, w, x]);

  const pill = useAnimatedStyle(() => {
    const left = Math.max(x.get(), min);
    const right = Math.min(x.get() + w.get(), max);
    return { width: Math.max(right - left, 0), transform: [{ translateX: left }] };
  });

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Aparência" style={[styles.track, { backgroundColor: look.track, borderColor: look.border }]}>
      <Animated.View style={[styles.pill, { backgroundColor: look.pill }, pill]} />
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            onLayout={(e) => {
              const layout = e.nativeEvent.layout;
              setFrames((f) => ({ ...f, [option.value]: layout }));
            }}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={styles.tab}>
            <Icon ios={option.ios} android={option.android} size={18} color={selected ? colors.label : colors.secondaryLabel} />
            <AppText variant="subheadline" color={selected ? "label" : "secondaryLabel"} style={styles.label}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", alignSelf: "stretch", padding: space.xs, borderRadius: radius.sm, borderWidth: 1 },
  pill: { position: "absolute", top: space.xs, bottom: space.xs, left: 0, borderRadius: radius.sm - 4, boxShadow: "0 1px 2px rgba(0, 0, 0, 0.12)" },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, height: 38, paddingHorizontal: space.lg },
  label: { fontWeight: "500" },
});
