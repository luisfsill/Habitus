import type { ReactNode } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { backdrops, pinned, space, useTheme } from "@/theme";

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
  /** Full-screen layer behind the page (e.g. a video); the page and its footer bar turn transparent over it. */
  backdrop?: ReactNode;
}

/** Height of a transparent native stack header (back button row). */
const HEADER = Platform.select({ ios: 44, default: 56 });

/** Width of the app column on wide (desktop/tablet) screens. */
export const MAX_WIDTH = 640;

/** Scrollable page with an iOS-style large title. */
export function Screen({ title, subtitle, children, footer, accessory, underHeader, backdrop }: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  // The installed iPhone app blurs some 40pt below the status bar (iOS 26 Liquid Glass): the title block starts under that.
  const top = Platform.OS === "web" ? space.xxl + space.sm : space.lg;
  const content = [styles.content, { paddingTop: insets.top + top + (underHeader ? HEADER : 0), paddingBottom: insets.bottom + 100 }];
  const body = (
    <>
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
    </>
  );
  const fill = backdrop ? styles.clear : backdrops[scheme];
  const foot = footer && <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>{footer}</View>;
  // On the web the page itself scrolls (so mobile Safari tucks its bars away); the footer pins to the viewport.
  if (Platform.OS === "web") {
    return (
      <View style={[styles.root, fill]}>
        {backdrop}
        <View style={content}>{body}</View>
        {foot && <View style={[pinned, styles.footerBar, { backgroundColor: backdrop ? "transparent" : colors.background }]}>{foot}</View>}
      </View>
    );
  }
  return (
    <View style={[styles.root, fill]}>
      {backdrop}
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={content}>
        {body}
      </ScrollView>
      {foot}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  clear: { backgroundColor: "#04060E" },
  content: { paddingHorizontal: space.xl, gap: space.xl, maxWidth: MAX_WIDTH, width: "100%", alignSelf: "center" },
  // zIndex keeps an open accessory menu above the content below it.
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md, zIndex: 10 },
  header: { flex: 1, gap: 2 },
  // Same column as the content, so buttons do not stretch across a desktop screen.
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm, maxWidth: MAX_WIDTH, width: "100%", alignSelf: "center" },
  footerBar: { left: 0, right: 0, bottom: 0, alignItems: "center" },
});
