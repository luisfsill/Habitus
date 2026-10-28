import { Children, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Glass } from "./glass";

interface Props {
  title: string;
  footer?: string;
  /** Right side of the title row, e.g. month arrows. */
  accessory?: ReactNode;
  /** Rows split by hairlines with no glass card behind them (Ajustes). */
  plain?: boolean;
  children: ReactNode;
}

/** Small caps label over a frosted glass card whose rows are split by hairlines. */
export function Section({ title, footer, accessory, plain, children }: Props) {
  const { colors } = useTheme();
  const line = { borderColor: colors.separator };
  const rows = Children.toArray(children).map((child, i) => (
    <View key={i} style={[styles.row, i > 0 && styles.divided, line]}>
      {child}
    </View>
  ));
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <AppText variant="footnote" color="secondaryLabel" accessibilityRole="header" style={styles.title}>
          {title.toUpperCase()}
        </AppText>
        {accessory}
      </View>
      {plain ? <View>{rows}</View> : <Glass style={styles.list}>{rows}</Glass>}
      {footer && (
        // Without a card, a hairline keeps the note apart from the controls above it.
        <AppText variant="footnote" color="secondaryLabel" style={plain && [styles.note, line]}>
          {footer}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 20 },
  title: { letterSpacing: 0.6, fontWeight: "600", paddingHorizontal: space.xs },
  // A little wider than the column, so row text lines up with the page title.
  list: { marginHorizontal: -space.sm, paddingHorizontal: space.lg },
  row: { paddingVertical: space.md },
  divided: { borderTopWidth: StyleSheet.hairlineWidth },
  note: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, marginTop: -space.sm },
});
