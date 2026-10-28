import { StyleSheet, View } from "react-native";

import { useTheme } from "@/theme";

/** A hairline between rows of a list. */
export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.line, { backgroundColor: colors.separator }]} />;
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth },
});
