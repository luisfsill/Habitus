import { Pressable, StyleSheet } from "react-native";

import { HIT, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

interface Props {
  label: string;
  icon: { ios: string; android: string };
  onPress: () => void;
  destructive?: boolean;
  /** Shows a chevron: the row opens another screen. */
  navigates?: boolean;
}

/** A tappable list row with a leading icon, for actions and links inside a section. */
export function ActionRow({ label, icon, onPress, destructive, navigates }: Props) {
  const { colors } = useTheme();
  const tint = destructive ? colors.danger : colors.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={navigates ? "link" : "button"}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <Icon ios={icon.ios} android={icon.android} size={20} color={tint} />
      <AppText variant="body" color={destructive ? "danger" : "label"} style={styles.label}>
        {label}
      </AppText>
      {navigates && <Icon ios="chevron.right" android="chevron_right" size={16} color={colors.secondaryLabel} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", gap: space.md },
  label: { flex: 1 },
});
