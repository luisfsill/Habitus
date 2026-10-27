import { Pressable, StyleSheet } from "react-native";

import { HIT, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

interface Props {
  /** Shown as text, or read aloud when `icon` is set. */
  label: string;
  onPress: () => void;
  /** Shows an icon instead of the text. */
  icon?: { ios: string; android: string };
  /** Bold, for the confirming action (Salvar, OK). */
  strong?: boolean;
  disabled?: boolean;
}

/** A text or icon button for a stack header (headerLeft / headerRight). */
export function HeaderButton({ label, onPress, icon, strong, disabled }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.button, { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 }]}>
      {icon ? (
        <Icon ios={icon.ios} android={icon.android} size={24} color={colors.accent} />
      ) : (
        <AppText variant="body" style={[{ color: colors.accent }, strong && styles.strong]}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: HIT, minWidth: HIT, paddingHorizontal: space.sm, alignItems: "center", justifyContent: "center" },
  strong: { fontWeight: "600" },
});
