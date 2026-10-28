import { Children, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";

interface Props {
  title: string;
  /** Right side of the title row, e.g. month arrows. */
  accessory?: ReactNode;
  children: ReactNode;
}

/** Headline over rows, the whole block set apart from the one above by a hairline. No card. */
export function Section({ title, accessory, children }: Props) {
  const { colors } = useTheme();
  const line = { borderColor: colors.separator };
  return (
    <View style={[styles.wrap, line]}>
      <View style={styles.head}>
        <AppText variant="headline" accessibilityRole="header">
          {title}
        </AppText>
        {accessory}
      </View>
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
  wrap: { gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 20 },
  row: { paddingVertical: space.md },
  divided: { borderTopWidth: StyleSheet.hairlineWidth },
});
