import { Pressable, StyleSheet, View } from "react-native";

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
  /** Helper line under the label. */
  detail?: string;
}

/** A tappable list row with a leading icon, for actions and links inside a section. */
export function ActionRow({ label, icon, onPress, destructive, navigates, detail }: Props) {
  const { colors } = useTheme();
  const tint = destructive ? colors.danger : colors.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={navigates ? "link" : "button"}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <Icon ios={icon.ios} android={icon.android} size={20} color={tint} />
      <View style={styles.label}>
        <AppText variant="body" color={destructive ? "danger" : "label"}>
          {label}
        </AppText>
        {detail && (
          <AppText variant="footnote" color="secondaryLabel">
            {detail}
          </AppText>
        )}
      </View>
      {navigates && <Icon ios="chevron.right" android="chevron_right" size={16} color={colors.secondaryLabel} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", gap: space.md },
  label: { flex: 1 },
});
