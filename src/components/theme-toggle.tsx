import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { backdrops, HIT, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

// Port of the "cinematic theme switcher" (shadcn/framer-motion) to Reanimated,
// at about half its size so it sits in proportion inside the account menu.
const TRACK_W = 56;
const TRACK_H = 32;
const BORDER = 1;
const PAD = 3;
const THUMB = TRACK_H - 2 * (BORDER + PAD);
const TRAVEL = TRACK_W - 2 * (BORDER + PAD) - THUMB;
const PARTICLES = [0, 1, 2];

// RN's `backgroundImage` takes CSS gradient strings.
type Painted = ViewStyle;

const LOOK = {
  light: {
    track: {
      ...backdrops.light,
      borderColor: "rgba(203, 213, 225, 0.6)",
      boxShadow:
        "inset 2px 2px 5px rgba(148, 163, 184, 0.5), inset -2px -2px 5px rgba(255, 255, 255, 1), inset 0 1px 2px rgba(148, 163, 184, 0.4), 0 1px 2px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.08)",
    },
    thumb: {
      backgroundColor: "#ffffff",
      backgroundImage: "linear-gradient(145deg, #ffffff 0%, #fefefe 50%, #f8fafc 100%)",
      borderColor: "rgba(255, 255, 255, 0.9)",
      boxShadow: "inset 1px 1px 2px rgba(203, 213, 225, 0.3), 0 3px 10px rgba(0, 0, 0, 0.18), 0 1px 4px rgba(0, 0, 0, 0.12)",
    },
    particle: "radial-gradient(circle, rgba(251, 191, 36, 0.7) 0%, rgba(251, 191, 36, 0) 70%)",
    sun: "#d97706",
    moon: "#334155",
    icon: "#f59e0b",
  },
  dark: {
    track: {
      ...backdrops.dark,
      borderColor: "rgba(51, 65, 85, 0.6)",
      boxShadow:
        "inset 2px 2px 5px rgba(0, 0, 0, 0.9), inset -2px -2px 5px rgba(71, 85, 105, 0.4), inset 0 1px 2px rgba(0, 0, 0, 1), 0 1px 2px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.4)",
    },
    thumb: {
      backgroundColor: "#475569",
      backgroundImage: "linear-gradient(145deg, #64748b 0%, #475569 50%, #334155 100%)",
      borderColor: "rgba(148, 163, 184, 0.3)",
      boxShadow: "inset 1px 1px 2px rgba(100, 116, 139, 0.4), inset -1px -1px 2px rgba(0, 0, 0, 0.8), 0 3px 10px rgba(0, 0, 0, 0.6), 0 1px 4px rgba(0, 0, 0, 0.5)",
    },
    particle: "radial-gradient(circle, rgba(147, 197, 253, 0.5) 0%, rgba(147, 197, 253, 0) 70%)",
    sun: "#fef9c3",
    moon: "#fef9c3",
    icon: "#fef08a",
  },
} satisfies Record<"light" | "dark", { track: Painted; thumb: Painted; particle: string; sun: string; moon: string; icon: string }>;

/** One glow ring that bursts out of the thumb; `burst` changes on every toggle. */
function Particle({ index, burst, dark }: { index: number; burst: number; dark: boolean }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (!burst) return;
    const delay = index * 100;
    const duration = dark ? 500 : 600 + index * 100;
    scale.set(0);
    scale.set(withDelay(delay, withTiming(dark ? 4 : 5, { duration })));
    opacity.set(withDelay(delay, withSequence(withTiming(1, { duration: duration / 2 }), withTiming(0, { duration: duration / 2 }))));
  }, [burst, dark, index, opacity, scale]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ scale: scale.get() }] }));
  return <Animated.View pointerEvents="none" style={[styles.particle, { backgroundImage: LOOK[dark ? "dark" : "light"].particle } as Painted, style]} />;
}

interface Props {
  onChange: (theme: "light" | "dark") => void;
}

/** Light/dark switch: a recessed pill whose thumb springs across and bursts a glow. */
export function ThemeToggle({ onChange }: Props) {
  const { scheme } = useTheme();
  const dark = scheme === "dark";
  const look = LOOK[scheme];
  const [burst, setBurst] = useState(0);
  const press = useSharedValue(1);
  // mass 1 as in framer-motion; Reanimated 4 defaults to 4, which overshoots far more.
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: withSpring(dark ? TRAVEL : 0, { stiffness: 300, damping: 20, mass: 1 }) }] }));
  const track = useAnimatedStyle(() => ({ transform: [{ scale: press.get() }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Tema escuro"
      accessibilityState={{ checked: dark }}
      onPressIn={() => press.set(withTiming(0.98, { duration: 80 }))}
      onPressOut={() => press.set(withTiming(1, { duration: 120 }))}
      onPress={() => {
        void Haptics.selectionAsync();
        setBurst((b) => b + 1);
        onChange(dark ? "light" : "dark");
      }}
      style={styles.row}>
      <AppText variant="body" style={styles.label}>
        {dark ? "Escuro" : "Claro"}
      </AppText>
      <Animated.View style={[styles.track, look.track, track]}>
        <View style={styles.icons} pointerEvents="none">
          <Icon ios="sun.max" android="light_mode" size={11} color={look.sun} />
          <Icon ios="moon" android="dark_mode" size={11} color={look.moon} />
        </View>
        <Animated.View style={[styles.thumb, look.thumb, thumb]}>
          {PARTICLES.map((i) => (
            <Particle key={i} index={i} burst={burst} dark={dark} />
          ))}
          <Icon ios={dark ? "moon.fill" : "sun.max.fill"} android={dark ? "dark_mode" : "light_mode"} size={11} color={look.icon} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.md, paddingVertical: space.xs },
  // Pushes the switch to the right edge of the menu row.
  label: { flex: 1 },
  track: { width: TRACK_W, height: TRACK_H, borderRadius: TRACK_H / 2, borderWidth: BORDER, padding: PAD, justifyContent: "center" },
  icons: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 7 },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2, borderWidth: BORDER, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  particle: { position: "absolute", width: 10, height: 10, borderRadius: 5 },
});
