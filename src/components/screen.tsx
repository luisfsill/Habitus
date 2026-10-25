import type { ReactNode } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Leave room for a transparent stack header above the large title. */
  underHeader?: boolean;
}

/** Height of a transparent native stack header (back button row). */
const HEADER = Platform.select({ ios: 44, default: 56 });

/** Width of the app column on wide (desktop/tablet) screens. */
export const MAX_WIDTH = 640;

/** Scrollable page with an iOS-style large title. */
export function Screen({ title, subtitle, children, footer, underHeader }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg + (underHeader ? HEADER : 0), paddingBottom: insets.bottom + 100 }]}>
        {(title || subtitle) && (
          <View style={styles.header}>
            {subtitle && (
              <AppText variant="footnote" color="secondaryLabel" style={styles.overline}>
                {subtitle}
              </AppText>
            )}
            {title && (
              <AppText variant="largeTitle" accessibilityRole="header">
                {title}
              </AppText>
            )}
          </View>
        )}
        {children}
      </ScrollView>
      {footer && <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>{footer}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: space.lg, gap: space.lg, maxWidth: MAX_WIDTH, width: "100%", alignSelf: "center" },
  header: { gap: 2, marginBottom: space.xs },
  overline: { textTransform: "uppercase", letterSpacing: 0.6, fontWeight: "600" },
  // Same column as the content, so buttons do not stretch across a desktop screen.
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, maxWidth: MAX_WIDTH, width: "100%", alignSelf: "center" },
});
