import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

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
  /** Halo of light around a filled button. */
  glow?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
/** Web: frosted glass for the tinted pill (see Glass). */
const WEB_BLUR = { backdropFilter: "blur(12px) saturate(1.4)", WebkitBackdropFilter: "blur(12px) saturate(1.4)" } as ViewStyle;
const RIPPLE = 40;

/** Water in the pill: a clear top fading to deep blue, like the drop in the tab bar. */
function Water({ top, deep }: { top: string; deep: string }) {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={top} />
          <Stop offset="1" stopColor={deep} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#water)" />
    </Svg>
  );
}

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
    fade.set(0.45);
    grow.set(withTiming(9, { duration: 650, easing: Easing.out(Easing.cubic) }));
    fade.set(withTiming(0, { duration: 650, easing: Easing.in(Easing.quad) }));
  };
  const node = <Animated.View pointerEvents="none" style={[styles.ripple, { backgroundColor: color, left: at.x - RIPPLE / 2, top: at.y - RIPPLE / 2 }, style]} />;
  return { start, node };
}

interface Look {
  /** Outer shadow, on the pressable so the pill's clipping does not cut it. */
  shell: ViewStyle;
  pill: ViewStyle;
  text: string;
}

/** Shadow, glass and label colour of each variant. `halo`: the glow prop, on an enabled button. */
function looks(variant: NonNullable<Props["variant"]>, colors: Palette, dark: boolean, { destructive, halo }: { destructive?: boolean; halo: boolean }): Look {
  const tint = destructive ? colors.danger : colors.waterTop;
  if (variant === "filled") {
    return {
      shell: { boxShadow: `0 10px 24px -12px ${tint}${halo ? `, 0 0 22px 2px ${tint}88` : ""}` },
      pill: { boxShadow: "inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -3px 8px rgba(0,30,60,0.35)", backgroundColor: destructive ? colors.danger : undefined },
      text: colors.onAccent,
    };
  }
  const text = destructive ? colors.danger : colors.accentText;
  if (variant === "plain") return { shell: {}, pill: {}, text };
  return {
    text,
    shell: { boxShadow: `0 8px 20px -14px ${dark ? "#000000" : colors.shadow}` },
    pill: {
      backgroundColor: colors.glass,
      borderColor: colors.glassEdge,
      borderWidth: StyleSheet.hairlineWidth,
      boxShadow: `inset 0 1px 0 ${colors.glassRim}`,
      ...(Platform.OS === "web" ? WEB_BLUR : null),
    },
  };
}

/**
 * Pill of the "water glass" theme. Filled: water behind glass, with a meniscus of light along the top and a ripple
 * where it is pressed. Tinted: a frosted glass pill. Plain: just the label.
 */
export function PrimaryButton({ label, onPress, variant = "filled", disabled, accessibilityHint, destructive, loading, shake, glow }: Props) {
  const { colors, scheme } = useTheme();
  const scale = useSharedValue(1);
  const shift = useSharedValue(0);
  const filled = variant === "filled";
  const ripple = useRipple(filled ? "#FFFFFF" : colors.accent);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: shift.get() }, { scale: scale.get() }] }));

  useEffect(() => {
    if (!shake) return;
    const step = (x: number) => withTiming(x, { duration: 50 });
    shift.set(withSequence(step(-10), step(10), step(-7), step(7), step(-3), step(0)));
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [shake, shift]);

  const { shell, pill, text: textColor } = looks(variant, colors, scheme === "dark", { destructive, halo: !!glow && !disabled });

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
      style={[styles.base, shell, { opacity: disabled ? 0.45 : 1 }, animated]}>
      <View style={[styles.pill, pill]}>
        {filled && !destructive && <Water top={colors.waterTop} deep={colors.waterDeep} />}
        {filled && <View pointerEvents="none" style={styles.meniscus} />}
        {ripple.node}
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Animated.Text maxFontSizeMultiplier={1.8} style={[type.headline, { color: textColor }]}>
            {label}
          </Animated.Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: Math.max(HIT, 52), borderRadius: radius.pill },
  pill: {
    flexGrow: 1,
    minHeight: Math.max(HIT, 52),
    borderRadius: radius.pill,
    overflow: "hidden",
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    alignItems: "center",
    justifyContent: "center",
  },
  // The bright curve of the water's surface, just under the top of the glass.
  meniscus: { position: "absolute", top: 2, left: "8%", right: "8%", height: "38%", borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.12)" },
  ripple: { position: "absolute", width: RIPPLE, height: RIPPLE, borderRadius: RIPPLE / 2 },
});
