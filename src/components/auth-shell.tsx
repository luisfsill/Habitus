import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, type StyleProp, StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, space } from "@/theme";

import { HorizonBackground } from "./horizon-background";

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

/** Night-sky page with the title on top and a frosted card holding the form. */
export function AuthShell({ title, subtitle, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  // Phones keep the card low (thumb reach); wide screens center it.
  const wide = useWindowDimensions().width >= 768;
  return (
    <View style={styles.root}>
      <HorizonBackground />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Body style={[styles.content, wide && styles.centered, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}>
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
  root: { flex: 1, backgroundColor: "#000000" },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "flex-end", gap: space.xl, paddingHorizontal: space.lg, width: "100%", maxWidth: 460, alignSelf: "center" },
  centered: { justifyContent: "center" },
  header: { gap: space.sm, paddingHorizontal: space.xs },
  cardShadow: { borderRadius: radius.lg + 4, shadowColor: "#3D7BFF", shadowOpacity: 0.25, shadowRadius: 40, shadowOffset: { width: 0, height: 0 } },
  card: {
    borderRadius: radius.lg + 4,
    overflow: "hidden",
    backgroundColor: "rgba(18,20,28,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  cardBody: { padding: space.lg + 2, gap: space.md },
});
