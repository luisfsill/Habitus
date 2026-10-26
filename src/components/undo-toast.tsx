import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { pinned, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";

const VISIBLE_MS = 7000;

/** Bottom confirmation of an admin action, with "Desfazer". Hides itself after a few seconds. */
export function UndoToast({ message, onUndo, onHide }: { message: string; onUndo?: () => void; onHide: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const timer = setTimeout(onHide, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, onHide]);
  return (
    <Animated.View
      entering={FadeInDown.springify()}
      exiting={FadeOutDown}
      accessibilityLiveRegion="polite"
      style={[styles.toast, pinned, { bottom: insets.bottom + 90, backgroundColor: colors.surface, borderColor: colors.successText }]}>
      <AppText variant="subheadline" style={styles.text}>
        ✓ {message}
      </AppText>
      {onUndo && (
        <Pressable onPress={onUndo} accessibilityRole="button" hitSlop={10}>
          <AppText variant="subheadline" color="accentText" style={styles.undo}>
            Desfazer
          </AppText>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    maxWidth: 600,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  text: { flex: 1 },
  undo: { fontWeight: "700" },
});
