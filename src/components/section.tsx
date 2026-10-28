import { Children, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";

interface Props {
  /** Left out when the screen title already names the block (a settings page with one section). */
  title?: string;
  /** Right side of the title row, e.g. month arrows. */
  accessory?: ReactNode;
  children: ReactNode;
}

/** Headline over rows, the whole block set apart from the one above by a hairline. No card. */
export function Section({ title, accessory, children }: Props) {
  const { colors } = useTheme();
  const line = { borderColor: colors.separator };
  return (
    <View style={[styles.wrap, title !== undefined && styles.titled, line]}>
      {title !== undefined && (
        <View style={styles.head}>
          <AppText variant="headline" accessibilityRole="header">
            {title}
          </AppText>
          {accessory}
        </View>
      )}
      <View>
        {Children.toArray(children).map((child, i) => (
          <View key={i} style={[styles.row, i > 0 && styles.divided, line]}>
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  // Without a title the first row's own padding already spaces it from the hairline, like the rows below.
  titled: { paddingTop: space.md },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 20 },
  row: { paddingVertical: space.md },
  divided: { borderTopWidth: StyleSheet.hairlineWidth },
});
