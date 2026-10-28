import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { pinned, space, useColumnGutter } from "@/theme";

import { AppText } from "./app-text";
import { textShadow } from "./spoken-phrase";

/** Height of the transparent stack header above the page. */
const HEADER = Platform.select({ ios: 44, default: 56 });

interface Props {
  /** Full-screen layer behind everything (video and effects). */
  backdrop: ReactNode;
  subtitle: string;
  title: string;
  /** Where the tip stands ("Flor 3 · campina 1"), under the title. */
  line?: string;
  children?: ReactNode;
  /** Pinned at the bottom. */
  footer?: ReactNode;
}

/**
 * The page of a tip with its own scene (Sorria, Postura de poder, Metas em voz alta): the scene fills the screen,
 * the words sit at the top under the back arrow, and the button at the bottom, all in white over the scene.
 */
export function SceneShell({ backdrop, subtitle, title, line, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  const gutter = useColumnGutter();
  const side = { left: gutter + space.xl, right: gutter + space.xl };
  return (
    <View style={[StyleSheet.absoluteFill, pinned, styles.root]}>
      {backdrop}
      <View pointerEvents="box-none" style={[styles.text, side, { top: insets.top + HEADER + space.md }]}>
        <AppText variant="subheadline" style={[styles.dim, textShadow]}>
          {subtitle}
        </AppText>
        <AppText variant="title1" accessibilityRole="header" style={textShadow}>
          {title}
        </AppText>
        {line && (
          <AppText variant="footnote" style={[styles.line, textShadow]} accessibilityLiveRegion="polite">
            {line}
          </AppText>
        )}
        {children}
      </View>
      {footer && <View style={[styles.footer, side, { bottom: insets.bottom + space.lg }]}>{footer}</View>}
    </View>
  );
}

/** A short line of guidance in the scene's text column. */
export function SceneHint({ children }: { children: string }) {
  return (
    <AppText variant="footnote" style={[styles.dim, textShadow]}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#04060E" },
  text: { position: "absolute", gap: space.sm },
  dim: { color: "rgba(240,242,250,0.8)" },
  line: { color: "#F2F4FA", fontWeight: "600", letterSpacing: 0.3 },
  footer: { position: "absolute" },
});
