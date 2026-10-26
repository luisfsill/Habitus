import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";

import { HIT, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

interface Props {
  label: string;
  /** The current value, already formatted ("8 copos", "1h30"). */
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  canMinus: boolean;
  canPlus: boolean;
}

function Step({ ios, android, label, enabled, onPress }: { ios: string; android: string; label: string; enabled: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      hitSlop={6}
      style={[styles.step, { backgroundColor: colors.fill, opacity: enabled ? 1 : 0.4 }]}>
      <Icon ios={ios} android={android} size={16} color={colors.label} />
    </Pressable>
  );
}

/** A setting row with − and + around its value. */
export function Stepper({ label, value, onMinus, onPlus, canMinus, canPlus }: Props) {
  return (
    <View style={styles.row} accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="body" style={styles.label}>
        {label}
      </AppText>
      <Step ios="minus" android="remove" label={`Diminuir ${label.toLowerCase()}`} enabled={canMinus} onPress={onMinus} />
      <AppText variant="body" style={styles.value}>
        {value}
      </AppText>
      <Step ios="plus" android="add" label={`Aumentar ${label.toLowerCase()}`} enabled={canPlus} onPress={onPlus} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", gap: space.md },
  label: { flex: 1 },
  value: { minWidth: 72, textAlign: "center", fontVariant: ["tabular-nums"] },
  step: { width: 32, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
