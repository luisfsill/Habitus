import type { ReactNode } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { backdrops, space, useTheme } from "@/theme";

import { AppText } from "./app-text";

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Shown to the right of the title block (e.g. the account menu). */
  accessory?: ReactNode;
  /** Leave room for a transparent stack header above the large title. */
  underHeader?: boolean;
}

/** Height of a transparent native stack header (back button row). */
const HEADER = Platform.select({ ios: 44, default: 56 });

/** Width of the app column on wide (desktop/tablet) screens. */
export const MAX_WIDTH = 640;

/** Scrollable page with an iOS-style large title. */
export function Screen({ title, subtitle, children, footer, accessory, underHeader }: Props) {
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, backdrops[scheme]]}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg + (underHeader ? HEADER : 0), paddingBottom: insets.bottom + 100 }]}>
        {(title || subtitle) && (
          <View style={styles.headerRow}>
          <View style={styles.header}>
            {subtitle && (
              <AppText variant="subheadline" color="secondaryLabel">
                {subtitle}
              </AppText>
            )}
            {title && (
              <AppText variant="largeTitle" accessibilityRole="header">
                {title}
              </AppText>
            )}
          </View>
          {accessory}
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
  content: { paddingHorizontal: space.xl, gap: space.xl, maxWidth: MAX_WIDTH, width: "100%", alignSelf: "center" },
  // zIndex keeps an open accessory menu above the content below it.
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md, zIndex: 10 },
  header: { flex: 1, gap: 2 },
  // Same column as the content, so buttons do not stretch across a desktop screen.
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm, maxWidth: MAX_WIDTH, width: "100%", alignSelf: "center" },
});
