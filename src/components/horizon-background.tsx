import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

/** Fixed positions (% of the screen) so the sky looks the same every time. */
const STARS = [
  [8, 6], [22, 14], [37, 4], [55, 11], [71, 7], [88, 15], [14, 24], [46, 22], [63, 28], [82, 26],
  [5, 38], [29, 33], [52, 40], [76, 36], [93, 44], [18, 48], [40, 52], [67, 50], [85, 57], [10, 60],
] as const;

function Star({ x, y, index }: { x: number; y: number; index: number }) {
  const reduce = useReducedMotion();
  const opacity = useSharedValue(0.8);
  useEffect(() => {
    if (reduce) return;
    const half = 1400 + (index % 5) * 300;
    opacity.set(
      withDelay(
        (index * 370) % 2600,
        withRepeat(withSequence(withTiming(0.15, { duration: half }), withTiming(0.9, { duration: half })), -1),
      ),
    );
  }, [reduce, index, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const size = index % 4 === 0 ? 3 : 2;
  return <Animated.View style={[styles.star, { left: `${x}%`, top: `${y}%`, width: size, height: size }, style]} />;
}

/** Night sky: a few twinkling stars and a cobalt glow rising behind the form. */
export function HorizonBackground() {
  const reduce = useReducedMotion();
  const glow = useSharedValue(0.85);
  useEffect(() => {
    if (!reduce) glow.set(withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduce, glow]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="horizon" cx="50%" cy="108%" rx="95%" ry="62%">
              <Stop offset="0" stopColor="#3D7BFF" stopOpacity={0.6} />
              <Stop offset="0.45" stopColor="#0A1E5A" stopOpacity={0.4} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#horizon)" />
        </Svg>
      </Animated.View>
      {STARS.map(([x, y], i) => (
        <Star key={i} x={x} y={y} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  star: { position: "absolute", borderRadius: 2, backgroundColor: "#FFFFFF" },
});
