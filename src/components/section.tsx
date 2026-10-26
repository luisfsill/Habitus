import { Children, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";

interface Props {
  title: string;
  footer?: string;
  /** Right side of the title row, e.g. month arrows. */
  accessory?: ReactNode;
  children: ReactNode;
}

/** Edge-to-edge list: small caps label, rows split by hairlines, hairlines above and below. */
export function Section({ title, footer, accessory, children }: Props) {
  const { colors } = useTheme();
  const line = { borderColor: colors.separator };
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <AppText variant="footnote" color="secondaryLabel" accessibilityRole="header" style={styles.title}>
          {title.toUpperCase()}
        </AppText>
        {accessory}
      </View>
      <View style={[styles.list, line]}>
        {Children.toArray(children).map((child, i) => (
          <View key={i} style={[styles.row, i > 0 && styles.divided, line]}>
            {child}
          </View>
        ))}
      </View>
      {footer && (
        <AppText variant="footnote" color="secondaryLabel">
          {footer}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 20 },
  title: { letterSpacing: 0.6, fontWeight: "600" },
  // Bleeds through the screen's side padding so the hairlines run edge to edge.
  list: { marginHorizontal: -space.xl, paddingHorizontal: space.xl, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { paddingVertical: space.md },
  divided: { borderTopWidth: StyleSheet.hairlineWidth },
});
