import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { passwordChecks, passwordStrength } from "@/domain/auth-rules";
import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";

const LABELS = ["", "Fraca", "Razoável", "Boa", "Forte"] as const;

function Bar({ on, color }: { on: boolean; color: string }) {
  const { colors } = useTheme();
  const fill = useSharedValue(on ? 1 : 0);
  useEffect(() => fill.set(withSpring(on ? 1 : 0, { damping: 18 })), [on, fill]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.get() }] }));
  return (
    <View style={[styles.track, { backgroundColor: colors.fill }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, style]} />
    </View>
  );
}

/** Four bars and a live checklist of the password rules. */
export function PasswordMeter({ password }: { password: string }) {
  const { colors } = useTheme();
  const strength = passwordStrength(password);
  const checks = passwordChecks(password);
  const color = strength <= 1 ? colors.danger : strength === 2 ? colors.warm : colors.success;
  const rules = [
    { ok: checks.length, text: "8+ caracteres" },
    { ok: checks.letter, text: "uma letra" },
    { ok: checks.number, text: "um número" },
  ];

  return (
    <View style={styles.root} accessible accessibilityLabel={`Força da senha: ${LABELS[strength] || "vazia"}`}>
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((n) => (
          <Bar key={n} on={strength >= n} color={color} />
        ))}
      </View>
      <View style={styles.rules}>
        {rules.map((rule) => (
          <AppText key={rule.text} variant="caption" style={{ color: rule.ok ? colors.success : colors.secondaryLabel }}>
            {rule.ok ? "✓" : "○"} {rule.text}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  bars: { flexDirection: "row", gap: space.xs },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { flex: 1, transformOrigin: "left center" },
  rules: { flexDirection: "row", flexWrap: "wrap", columnGap: space.md },
});
