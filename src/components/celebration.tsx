import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import type { TrickIndex } from "@/domain/tricks";
import { pinned } from "@/theme";

interface Props {
  trick: TrickIndex;
  /** Called when the celebration has played: time to unmount. */
  onDone: () => void;
}

const SUN_MS = 2600;

/** Native: a warm glow that grows from the top-right corner and fades (the web plays a WebGL scene instead). */
function SunGlow({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.set(withSequence(withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: SUN_MS - 700 })));
    const id = setTimeout(onDone, SUN_MS);
    return () => clearTimeout(id);
    // Plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const size = Math.hypot(width, height) * 1.2;
  const style = useAnimatedStyle(() => ({ opacity: 0.35 * glow.get(), transform: [{ scale: 0.4 + 0.6 * glow.get() }] }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, pinned, styles.layer]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.sun, { width: size, height: size, borderRadius: size / 2, top: -size / 2, right: -size / 2 }, style]} />
    </View>
  );
}

/** The full-screen celebration for a finished tip (Sorria: sun). Tips without one end at once. */
export function Celebration({ trick, onDone }: Props) {
  const reduceMotion = useReducedMotion();
  const plays = trick === 0 && !reduceMotion;
  useEffect(() => {
    if (!plays) onDone();
  }, [plays, onDone]);
  return plays ? <SunGlow onDone={onDone} /> : null;
}

const styles = StyleSheet.create({
  layer: { zIndex: 30, overflow: "hidden" },
  sun: { position: "absolute", backgroundColor: "#FFC86B" },
});
