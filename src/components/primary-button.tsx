import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { HIT, type Palette, radius, space, type, useTheme } from "@/theme";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "filled" | "tinted" | "plain";
  disabled?: boolean;
  accessibilityHint?: string;
  destructive?: boolean;
  /** Shows a spinner and ignores presses. */
  loading?: boolean;
  /** Bump this number to shake the button (an error). */
  shake?: number;
  /** The main call to action of a screen: a brighter water blue. */
  glow?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
/** Web: frosted glass for the tinted pill (see Glass). */
const WEB_BLUR = { backdropFilter: "blur(12px) saturate(1.4)", WebkitBackdropFilter: "blur(12px) saturate(1.4)" } as ViewStyle;
const RIPPLE = 40;

/** A ring of water spreading from where the finger landed; nothing with "reduce motion". */
function useRipple(color: string) {
  const reduce = useReducedMotion();
  const [at, setAt] = useState({ x: 0, y: 0 });
  const grow = useSharedValue(0);
  const fade = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: fade.get(), transform: [{ scale: grow.get() }] }));
  const start = (x: number, y: number) => {
    if (reduce) return;
    setAt({ x, y });
    grow.set(0.2);
    fade.set(0.35);
    grow.set(withTiming(9, { duration: 650, easing: Easing.out(Easing.cubic) }));
    fade.set(withTiming(0, { duration: 650, easing: Easing.in(Easing.quad) }));
  };
  const node = <Animated.View pointerEvents="none" style={[styles.ripple, { backgroundColor: color, left: at.x - RIPPLE / 2, top: at.y - RIPPLE / 2 }, style]} />;
  return { start, node };
}

/** Fill and label colour of each variant. No drop shadows: the pill sits flat on the water. */
function looks(variant: NonNullable<Props["variant"]>, colors: Palette, { destructive, glow }: Pick<Props, "destructive" | "glow">) {
  if (variant === "filled") {
    const fill = destructive ? colors.danger : glow ? colors.waterTop : colors.accent;
    // A thin line of light along the top edge, like the rim of the glass cards.
    const pill: ViewStyle = { backgroundColor: fill, borderColor: "rgba(255,255,255,0.22)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" };
    return { pill, text: colors.onAccent };
  }
  const text = destructive ? colors.danger : colors.accentText;
  if (variant === "plain") return { pill: { borderColor: "transparent" }, text };
  const pill: ViewStyle = {
    backgroundColor: colors.glass,
    borderColor: colors.glassEdge,
    boxShadow: `inset 0 1px 0 ${colors.glassRim}`,
    ...(Platform.OS === "web" ? WEB_BLUR : null),
  };
  return { pill, text };
}

/**
 * Pill of the "water glass" theme. Filled: clear water blue with a rim of light; tinted: frosted glass; plain: just
 * the label. Pressing sends a ripple out from the finger.
 */
export function PrimaryButton({ label, onPress, variant = "filled", disabled, accessibilityHint, destructive, loading, shake, glow }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const shift = useSharedValue(0);
  const ripple = useRipple(variant === "filled" ? "#FFFFFF" : colors.accent);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: shift.get() }, { scale: scale.get() }] }));

  useEffect(() => {
    if (!shake) return;
    const step = (x: number) => withTiming(x, { duration: 50 });
    shift.set(withSequence(step(-10), step(10), step(-7), step(7), step(-3), step(0)));
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [shake, shift]);

  const { pill, text } = looks(variant, colors, { destructive, glow });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPressIn={(e) => {
        scale.set(withSpring(0.97, { damping: 18, stiffness: 300 }));
        if (variant !== "plain") ripple.start(e.nativeEvent.locationX, e.nativeEvent.locationY);
      }}
      onPressOut={() => {
        scale.set(withSpring(1, { damping: 14, stiffness: 220 }));
      }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.base, pill, { opacity: disabled ? 0.45 : 1 }, animated]}>
      {ripple.node}
      {loading ? (
        <ActivityIndicator color={text} />
      ) : (
        <Animated.Text maxFontSizeMultiplier={1.8} style={[type.headline, { color: text }]}>
          {label}
        </Animated.Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Math.max(HIT, 52),
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: { position: "absolute", width: RIPPLE, height: RIPPLE, borderRadius: RIPPLE / 2 },
});
