import type { ReactNode } from "react";
import { Platform, ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { backdrops, pinned, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { WaterBackdrop } from "./water-backdrop";

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
  /** Tighter page (smaller title, less space) so a short screen like a tip fits without scrolling. */
  dense?: boolean;
}

/** Frosted glass behind the pinned footer on the web. */
const WEB_GLASS = { backdropFilter: "blur(16px) saturate(1.4)", WebkitBackdropFilter: "blur(16px) saturate(1.4)", borderTopWidth: StyleSheet.hairlineWidth } as ViewStyle;

/** Height of a transparent native stack header (back button row). */
const HEADER = Platform.select({ ios: 44, default: 56 });

/** Width of the app column on wide (desktop/tablet) screens. */
export const MAX_WIDTH = 640;

/** Room above the title and below the content. */
function pagePadding(insets: { top: number; bottom: number }, page: { dense?: boolean; underHeader?: boolean; footer: boolean }) {
  // The installed iPhone app blurs some 40pt below the status bar (iOS 26 Liquid Glass): the title block starts under that.
  const top = Platform.OS === "web" && !page.dense ? space.xxl + space.sm : space.lg;
  // Dense pages keep just the room the pinned footer button needs.
  const bottom = page.dense ? (page.footer ? 84 : space.xl) : 100;
  return { paddingTop: insets.top + top + (page.underHeader ? HEADER : 0), paddingBottom: insets.bottom + bottom };
}

function TitleBlock({ title, subtitle, accessory, dense }: Pick<Props, "title" | "subtitle" | "accessory" | "dense">) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.header}>
        {subtitle && (
          <AppText variant="subheadline" color="secondaryLabel">
            {subtitle}
          </AppText>
        )}
        {title && (
          <AppText variant={dense ? "title1" : "largeTitle"} accessibilityRole="header">
            {title}
          </AppText>
        )}
      </View>
      {accessory}
    </View>
  );
}

/** Scrollable page with an iOS-style large title. */
export function Screen({ title, subtitle, children, footer, accessory, underHeader, backdrop, dense }: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const content = [styles.content, dense && styles.dense, pagePadding(insets, { dense, underHeader, footer: Boolean(footer) })];
  const body = (
    <>
      {(title || subtitle) && <TitleBlock title={title} subtitle={subtitle} accessory={accessory} dense={dense} />}
      {children}
    </>
  );
  const foot = footer && <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>{footer}</View>;
  // On the web the page itself scrolls (so mobile Safari tucks its bars away); the footer pins to the viewport.
  // The page is clear there: the root layout's water canvas shows through, and the footer bar is frosted glass.
  if (Platform.OS === "web") {
    const bar = backdrop ? undefined : [WEB_GLASS, { backgroundColor: colors.surfaceGlass, borderTopColor: colors.glassEdge }];
    return (
      <View style={[styles.root, backdrop ? styles.clear : undefined]}>
        {backdrop}
        <View style={content}>{body}</View>
        {foot && <View style={[pinned, styles.footerBar, bar]}>{foot}</View>}
      </View>
    );
  }
  return (
    <View style={[styles.root, backdrop ? styles.clear : backdrops[scheme]]}>
      {backdrop ?? <WaterBackdrop scheme={scheme} />}
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
  dense: { gap: space.md },
  // zIndex keeps an open accessory menu above the content below it.
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md, zIndex: 10 },
  header: { flex: 1, gap: 2 },
  // Same column as the content, so buttons do not stretch across a desktop screen.
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm, maxWidth: MAX_WIDTH, width: "100%", alignSelf: "center" },
  footerBar: { left: 0, right: 0, bottom: 0, alignItems: "center" },
});
