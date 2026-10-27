import { useEffect, type ReactNode } from "react";
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { type Palette, useTheme } from "@/theme";

import { Icon } from "./icon";
import type { Row } from "./install-scenes";

/** Building blocks shared by the drawn phone (`InstallPhone`) and its Safari screens. */

export const LOGO = { uri: "/icon-192.png" };

/** Tiny text for the drawing: fixed size, so large text settings don't break the mockup. */
export function T({ children, size = 8, color, bold }: { children: ReactNode; size?: number; color: string; bold?: boolean }) {
  return (
    <Text numberOfLines={1} maxFontSizeMultiplier={1} style={{ fontSize: size, color, fontWeight: bold ? "700" : "400" }}>
      {children}
    </Text>
  );
}

/** Pulse ring and a tapping hand, centred on the parent (x as a fraction of its width). */
function Tap({ x = 0.5 }: { x?: number }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce) t.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }), -1));
  }, [t, reduce]);
  const ring = useAnimatedStyle(() => ({
    opacity: reduce ? 0.6 : 0.9 * (1 - t.get()),
    transform: [{ scale: reduce ? 1 : 0.5 + t.get() * 1.2 }],
  }));
  const hand = useAnimatedStyle(() => {
    // Presses during the first third of the cycle, rests for the rest.
    const p = t.get() < 0.15 ? t.get() / 0.15 : t.get() < 0.3 ? (0.3 - t.get()) / 0.15 : 0;
    return { transform: [{ translateX: 5 - p * 5 }, { translateY: 5 - p * 5 }, { scale: 1 - p * 0.12 }] };
  });
  return (
    <View pointerEvents="none" style={[styles.tap, { left: `${x * 100}%` }]}>
      <Animated.View style={[styles.ring, { borderColor: colors.accent, backgroundColor: colors.accentSoft }, ring]} />
      <Animated.View style={[styles.hand, hand]}>
        <Icon ios="hand.point.up.left.fill" android="touch_app" size={26} color={colors.label} />
      </Animated.View>
    </View>
  );
}

/** Wraps a control; when `on`, the pulse and the hand sit on it. */
export function Hot({ on, x, style, children }: { on: boolean; x?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <View style={style}>
      {children}
      {on && <Tap x={x} />}
    </View>
  );
}

export function BarIcon({ name, color, size = 13 }: { name: string; color: string; size?: number }) {
  return <Icon ios={name} android={name} size={size} color={color} />;
}

/** Menu or list rows, icon first; the hot row is tinted. */
export function Rows({ rows, colors }: { rows: Row[]; colors: Palette }) {
  return rows.map((row) => (
    <Hot key={row.label} on={!!row.hot} x={0.8} style={[styles.row, row.hot && { backgroundColor: colors.accentSoft }]}>
      <BarIcon name={row.icon} color={row.hot ? colors.accent : colors.label} />
      <T color={row.hot ? colors.accentText : colors.label} bold={row.hot}>
        {row.label}
      </T>
    </Hot>
  ));
}

const styles = StyleSheet.create({
  tap: { position: "absolute", top: "50%", width: 0, height: 0 },
  ring: { position: "absolute", left: -14, top: -14, width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  hand: { position: "absolute", left: -9, top: -2 },
  row: { height: 22, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, borderRadius: 6 },
});
