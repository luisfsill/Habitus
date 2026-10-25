import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { space } from "@/theme";

import { AppText } from "./app-text";
import { GlassCard } from "./glass-card";

interface Props {
  title: string;
  footer?: string;
  children: ReactNode;
}

/** Inset grouped section, as in iOS Settings. */
export function Section({ title, footer, children }: Props) {
  return (
    <View style={styles.wrap}>
      <AppText variant="footnote" color="secondaryLabel" accessibilityRole="header" style={styles.title}>
        {title.toUpperCase()}
      </AppText>
      <GlassCard>
        <View style={styles.body}>{children}</View>
      </GlassCard>
      {footer && (
        <AppText variant="footnote" color="secondaryLabel" style={styles.footer}>
          {footer}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  title: { marginLeft: space.lg, letterSpacing: 0.4 },
  body: { gap: space.md },
  footer: { marginHorizontal: space.lg },
});
