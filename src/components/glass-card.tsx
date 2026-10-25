import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";

import { radius, space, useTheme } from "@/theme";

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

/** Rounded card with a translucent material on iOS and a solid surface elsewhere. */
export function GlassCard({ children, style, padded = true }: Props) {
  const { colors, scheme } = useTheme();
  const glass = Platform.OS === "ios";
  return (
    <View style={[styles.shadow, { shadowColor: colors.shadow }, style]}>
      <View style={[styles.clip, { backgroundColor: glass ? colors.surfaceGlass : colors.surface }]}>
        {glass && (
          <BlurView
            intensity={60}
            tint={scheme === "dark" ? "systemMaterialDark" : "systemMaterialLight"}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={padded ? styles.padding : undefined}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.lg,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  clip: { borderRadius: radius.lg, overflow: "hidden" },
  padding: { padding: space.lg },
});
