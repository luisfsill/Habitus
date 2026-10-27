import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { pinned, useTheme } from "@/theme";

import { Icon } from "./icon";

interface Props {
  /** Called when the splash has played: time to unmount. */
  onDone: () => void;
}

const FALL_MS = 420;
const RIPPLE_MS = 1000;
const RIPPLE_GAP_MS = 150;
const RING = 90;
const DROP = 44;

function Ripple({ wave, color }: { wave: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.85 * (1 - wave.get()),
    transform: [{ scale: 0.3 + wave.get() * 5 }],
  }));
  return <Animated.View style={[styles.ring, { borderColor: color }, style]} />;
}

/** A drop falls to the middle of the screen and the whole screen ripples like water. Purely decorative. */
export function WaterSplash({ onDone }: Props) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const fall = useSharedValue(0);
  const waves = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const wash = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      onDone();
      return;
    }
    fall.set(withTiming(1, { duration: FALL_MS, easing: Easing.in(Easing.quad) }));
    waves.forEach((wave, i) => wave.set(withDelay(FALL_MS + i * RIPPLE_GAP_MS, withTiming(1, { duration: RIPPLE_MS, easing: Easing.out(Easing.quad) }))));
    wash.set(withDelay(FALL_MS, withSequence(withTiming(1, { duration: 260 }), withTiming(2, { duration: 700 }))));
    const id = setTimeout(onDone, FALL_MS + 2 * RIPPLE_GAP_MS + RIPPLE_MS);
    return () => clearTimeout(id);
    // Plays once per mount; the shared values are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dropStyle = useAnimatedStyle(() => ({
    // Falls from above the top edge, then splashes flat and vanishes on impact.
    opacity: fall.get() < 1 ? 1 : 0,
    transform: [{ translateY: (fall.get() - 1) * (height / 2 + DROP) }, { scaleY: 1 + fall.get() * 0.25 }],
  }));
  const washSize = Math.hypot(width, height);
  const washStyle = useAnimatedStyle(() => ({
    // Grows to cover the screen (0 to 1), then fades (1 to 2).
    opacity: wash.get() <= 1 ? 0.22 * wash.get() : 0.22 * (2 - wash.get()),
    transform: [{ scale: Math.min(wash.get(), 1) }],
  }));

  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, pinned, styles.center]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ width: washSize, height: washSize, borderRadius: washSize / 2, backgroundColor: colors.accent }, styles.abs, washStyle]} />
      {waves.map((wave, i) => (
        <Ripple key={i} wave={wave} color={colors.accent} />
      ))}
      <Animated.View style={dropStyle}>
        <Icon ios="drop.fill" android="water_drop" size={DROP} color={colors.accent} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", zIndex: 30 },
  abs: { position: "absolute" },
  ring: { position: "absolute", width: RING, height: RING, borderRadius: RING / 2, borderWidth: 2 },
});
