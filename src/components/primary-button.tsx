import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { HIT, radius, space, type, useTheme } from "@/theme";

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
  /** Cobalt halo around a filled button. */
  glow?: boolean;
}

function halo(color: string) {
  return { shadowColor: color, shadowOpacity: 0.75, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } };
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PrimaryButton({ label, onPress, variant = "filled", disabled, accessibilityHint, destructive, loading, shake, glow }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const shift = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: shift.get() }, { scale: scale.get() }] }));

  useEffect(() => {
    if (!shake) return;
    const step = (x: number) => withTiming(x, { duration: 50 });
    shift.set(withSequence(step(-10), step(10), step(-7), step(7), step(-3), step(0)));
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [shake, shift]);

  const tint = destructive ? colors.danger : colors.accent;
  const background = variant === "filled" ? tint : variant === "tinted" ? colors.accentSoft : "transparent";
  const textColor = variant === "filled" ? colors.onAccent : destructive ? colors.danger : colors.accentText;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPressIn={() => {
        scale.set(withSpring(0.97, { damping: 18, stiffness: 300 }));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, { damping: 14, stiffness: 220 }));
      }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={[
        styles.base,
        { backgroundColor: background, opacity: disabled ? 0.45 : 1 },
        glow && !disabled && halo(tint),
        animated,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Animated.Text maxFontSizeMultiplier={1.8} style={[type.headline, { color: textColor }]}>
          {label}
        </Animated.Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Math.max(HIT, 52),
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
