import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { Platform, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { radius as radii, useTheme } from "@/theme";

interface Props {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}

/** Web: the browser blurs what is behind the box (the live water); expo-blur's web view would add its own grey tint. */
const WEB_BLUR = {
  backdropFilter: "blur(14px) saturate(1.5)",
  WebkitBackdropFilter: "blur(14px) saturate(1.5)",
} as ViewStyle;

/**
 * Frosted glass over the water, the material of the "water glass" theme: blur, a clear tint, a thin outline and a
 * bright rim along the top edge where the light catches it, like the liquid glass tab bar.
 */
export function Glass({ children, style, radius = radii.lg }: Props) {
  const { colors, scheme } = useTheme();
  const shadow = scheme === "dark" ? "rgba(0,0,0,0.45)" : "rgba(10,58,95,0.22)";
  const box: ViewStyle = {
    borderRadius: radius,
    borderColor: colors.glassEdge,
    boxShadow: `inset 0 1px 0 ${colors.glassRim}, 0 12px 28px -16px ${shadow}`,
  };
  return (
    <View style={[styles.box, box, Platform.OS === "web" && [WEB_BLUR, { backgroundColor: colors.glass }], style]}>
      {Platform.OS !== "web" && (
        <>
          <BlurView intensity={30} tint={scheme} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass, borderRadius: radius }]} />
        </>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
});
