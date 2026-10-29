import type { ReactNode } from "react";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

const STEP_MS = 50;

/** Shakes its content sideways for about half a second each time `trigger` changes (not on mount, not for 0). */
export function ShakeView({ trigger, children }: { trigger: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    if (trigger === 0 || reduced) return;
    x.value = withSequence(
      ...[8, -8, 8, -8, 6, -6, 4, -4].map((to) => withTiming(to, { duration: STEP_MS })),
      withTiming(0, { duration: STEP_MS }),
    );
  }, [trigger, reduced, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
