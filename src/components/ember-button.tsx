import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { HIT, radius, space } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

const EMBER = "#E2571B";
const FLAME = "#FFB25B";

/** A button for the fire scene: glowing ember orange with a slow, flame-like pulse of light around it. */
export function EmberButton({ label, onPress, disabled }: Props) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withSequence(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1, true));
  }, [pulse, reduceMotion]);
  const glow = useAnimatedStyle(() => ({ shadowOpacity: 0.45 + 0.4 * pulse.get(), shadowRadius: 14 + 10 * pulse.get() }));

  return (
    <Animated.View style={[styles.halo, glow, disabled && styles.off]}>
      <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        {/* A lighter top half, like light catching the edge of a coal. */}
        <View style={styles.shine} />
        <Icon ios="flame.fill" android="local_fire_department" size={20} color="#FFF4E6" />
        <AppText variant="headline" style={styles.text}>
          {label}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  halo: { borderRadius: radius.pill, shadowColor: "#FF6A1A", shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  button: {
    minHeight: HIT + 4,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    backgroundColor: EMBER,
    borderWidth: 1,
    borderColor: FLAME,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    overflow: "hidden",
  },
  shine: { position: "absolute", top: 0, left: 0, right: 0, height: "50%", backgroundColor: "rgba(255,210,150,0.18)" },
  pressed: { transform: [{ scale: 0.97 }], backgroundColor: "#C9481A" },
  text: { color: "#FFF4E6", fontWeight: "700", letterSpacing: 0.3 },
  off: { opacity: 0.6 },
});
