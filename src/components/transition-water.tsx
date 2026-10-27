import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { palettes } from "@/theme";

import { Icon } from "./icon";

const { waterTop, waterDeep, accentText } = palettes.dark;

/** [left %, diameter, seconds to rise, delay in seconds]: fixed, so the curtain looks the same every time. */
const BUBBLES = [
  [8, 6, 9, 0],
  [19, 10, 12, 3.5],
  [31, 5, 8, 1.2],
  [44, 8, 11, 6],
  [57, 4, 7.5, 2.4],
  [68, 9, 10, 4.8],
  [79, 6, 9.5, 0.6],
  [90, 7, 12, 7.2],
] as const;

function Bubble({ left, size, rise, delay, height }: { left: number; size: number; rise: number; delay: number; height: number }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    y.set(withDelay(delay * 1000, withRepeat(withTiming(1, { duration: rise * 1000, easing: Easing.linear }), -1)));
  }, [reduce, y, rise, delay]);
  const style = useAnimatedStyle(() => {
    const k = reduce ? (left % 37) / 37 : y.get();
    // Fades in near the bottom and out before the top; sways a little on the way up.
    const opacity = Math.min(k / 0.1, 1) * Math.min((1 - k) / 0.25, 1) * 0.7;
    return { opacity, transform: [{ translateY: -k * (height + 40) }, { translateX: Math.sin(k * 12 + left) * 6 }] };
  });
  return <Animated.View style={[styles.bubble, { left: `${left}%`, width: size, height: size, borderRadius: size / 2 }, style]} />;
}

/** A few bubbles rising slowly through the curtain; still with "reduce motion". */
export function Bubbles() {
  const { height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {BUBBLES.map(([left, size, rise, delay]) => (
        <Bubble key={left} left={left} size={size} rise={rise} delay={delay} height={height} />
      ))}
    </View>
  );
}

/** The finish: the ring fills with water from the bottom, a small wave rolling on top, and a white check over it. */
export function WaterFill({ size, stroke }: { size: number; stroke: number }) {
  const reduce = useReducedMotion();
  const level = useSharedValue(reduce ? 1 : 0);
  const roll = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    level.set(withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    roll.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1));
  }, [reduce, level, roll]);
  // Full, the surface sits a little below the top so the wave still shows.
  const water = useAnimatedStyle(() => ({ transform: [{ translateY: size - level.get() * size * 0.86 }, { translateX: -roll.get() * size }] }));

  const w = size * 2;
  const crest = 8;
  // Two wave periods of `size` each: sliding by one period loops without a seam.
  const q = size / 4;
  const wave = `M0 ${crest} Q${q} 0 ${2 * q} ${crest} T${4 * q} ${crest} T${6 * q} ${crest} T${8 * q} ${crest} V${size + crest} H0 Z`;
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderWidth: stroke }]}>
      <Animated.View style={[styles.water, { width: w, height: size + crest }, water]}>
        <Svg width={w} height={size + crest}>
          <Defs>
            <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={waterTop} />
              <Stop offset="1" stopColor={waterDeep} />
            </LinearGradient>
          </Defs>
          <Path d={wave} fill="url(#fill)" />
        </Svg>
      </Animated.View>
      <Icon ios="checkmark" android="check" size={52} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { position: "absolute", bottom: -20, borderWidth: 1, borderColor: "rgba(186,230,253,0.6)", backgroundColor: "rgba(186,230,253,0.08)" },
  ring: { overflow: "hidden", alignItems: "center", justifyContent: "center", borderColor: accentText, backgroundColor: "rgba(125,211,252,0.08)" },
  water: { position: "absolute", left: 0, top: 0 },
});
