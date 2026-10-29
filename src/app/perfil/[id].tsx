import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Icon } from "@/components/icon";
import { HIT, pinned, space, useTheme } from "@/theme";

import PersonScreen from "../(tabs)/profile/[id]";

/** A friend's profile opened from a chat: above the chat (outside the tabs), with its own way back to it. */
export default function ChatProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const back = () => (router.canGoBack() ? router.back() : router.replace("/conversas"));
  return (
    <View style={styles.root}>
      <PersonScreen />
      <Pressable
        onPress={back}
        accessibilityRole="button"
        accessibilityLabel="Voltar para a conversa"
        hitSlop={8}
        style={({ pressed }) => [styles.back, { top: insets.top + space.xs, opacity: pressed ? 0.6 : 1 }]}>
        <Icon ios="chevron.left" android="chevron_left" size={24} color={colors.accent} />
        <AppText variant="body" color="accentText">
          Conversa
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  back: { ...pinned, left: space.md, minHeight: HIT, flexDirection: "row", alignItems: "center", gap: 2, paddingRight: space.sm },
});
