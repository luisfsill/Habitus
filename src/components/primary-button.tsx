import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { HIT, radius, space, type, useTheme } from "@/theme";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "filled" | "tinted" | "plain";
  disabled?: boolean;
  accessibilityHint?: string;
  destructive?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PrimaryButton({ label, onPress, variant = "filled", disabled, accessibilityHint, destructive }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const tint = destructive ? colors.danger : colors.accent;
  const background = variant === "filled" ? tint : variant === "tinted" ? colors.accentSoft : "transparent";
  const textColor = variant === "filled" ? colors.onAccent : destructive ? colors.danger : colors.accentText;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
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
      style={[styles.base, { backgroundColor: background, opacity: disabled ? 0.45 : 1 }, animated]}>
      <Animated.Text maxFontSizeMultiplier={1.8} style={[type.headline, { color: textColor }]}>
        {label}
      </Animated.Text>
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
