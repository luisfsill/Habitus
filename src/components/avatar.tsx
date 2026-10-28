import { Image, StyleSheet, View } from "react-native";

import { useTheme } from "@/theme";

import { Icon } from "./icon";

/** A round profile photo, or a person icon on a soft fill when there is none. Decorative: the name sits beside it. */
export function Avatar({ url, size }: { url: string | null; size: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.fill }]}>
      {url ? (
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <Icon ios="person.fill" android="person" size={Math.round(size * 0.5)} color={colors.secondaryLabel} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
