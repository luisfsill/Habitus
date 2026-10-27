import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, space } from "@/theme";

import { WaterBackdrop } from "./water-backdrop";

interface Props {
  /** Big heading above the card. */
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Links under the card. */
  footer?: ReactNode;
}

/** On the web the document scrolls; on native the form scrolls above the keyboard. */
function Body({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  if (Platform.OS === "web") return <View style={style}>{children}</View>;
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={style}>
      {children}
    </ScrollView>
  );
}

/** Deep-water page with the title on top and a frosted glass card holding the form. */
export function AuthShell({ title, subtitle, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  // The installed iPhone app blurs some 40pt below the status bar (iOS 26 Liquid Glass): the title starts under that.
  const top = Platform.OS === "web" ? space.xxl + space.sm : space.xxl;
  return (
    // Web: the root layout's water canvas shows through (dark on these screens); native paints its own.
    <View style={[styles.root, Platform.OS !== "web" && styles.native]}>
      {Platform.OS !== "web" && <WaterBackdrop scheme="dark" />}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Body style={[styles.content, { paddingTop: insets.top + top, paddingBottom: insets.bottom + space.xl }]}>
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.header}>
            {title}
            {subtitle}
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(150).duration(700).springify()} style={styles.cardShadow}>
            <View style={styles.card}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.cardBody}>{children}</View>
            </View>
          </Animated.View>
          {footer && <Animated.View entering={FadeInDown.delay(300).springify()}>{footer}</Animated.View>}
        </Body>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  native: { backgroundColor: "#041526" },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", gap: space.xl, paddingHorizontal: space.lg, width: "100%", maxWidth: 460, alignSelf: "center" },
  header: { gap: space.sm, paddingHorizontal: space.xs },
  cardShadow: { borderRadius: radius.lg + 4, shadowColor: "#0A7CC0", shadowOpacity: 0.3, shadowRadius: 40, shadowOffset: { width: 0, height: 0 } },
  card: {
    borderRadius: radius.lg + 4,
    overflow: "hidden",
    backgroundColor: "rgba(4,21,38,0.5)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.16)",
    borderTopColor: "rgba(255,255,255,0.28)",
  },
  cardBody: { padding: space.lg + 2, gap: space.md },
});
