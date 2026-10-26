import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Reward } from "@/domain/achievements";
import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

interface Props {
  reward: Reward;
  onHide: () => void;
}

const VISIBLE_MS = 3500;

function headline(reward: Reward): string {
  if (reward.belt) return `Nova patente: ${reward.belt.name}!`;
  if (reward.levelUp) return `Você subiu para o nível ${reward.levelUp}!`;
  if (reward.badges.length > 0) return `Nova medalha: ${reward.badges[0].title}`;
  return "Dica concluída!";
}

/** Floating "+10 XP" celebration, Duolingo-style. */
export function RewardToast({ reward, onHide }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const big = Boolean(reward.levelUp || reward.belt || reward.badges.length);

  useEffect(() => {
    if (big) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const id = setTimeout(onHide, VISIBLE_MS);
    return () => clearTimeout(id);
  }, [reward, big, onHide]);

  const extra = reward.badges.slice(big && !reward.levelUp && !reward.belt ? 1 : 0).map((b) => b.title);

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(16)}
      exiting={FadeOutUp.duration(200)}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.wrap, { top: insets.top + space.sm }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
        <View style={[styles.xp, { backgroundColor: colors.accent }]}>
          <AppText variant="headline" style={{ color: colors.onAccent }} maxFontSizeMultiplier={1.3}>
            +{reward.xp} XP
          </AppText>
        </View>
        <View style={styles.text}>
          <AppText variant="headline">{headline(reward)}</AppText>
          {extra.length > 0 && (
            <AppText variant="footnote" color="secondaryLabel">
              Medalha: {extra.join(", ")}
            </AppText>
          )}
        </View>
        {big && <Icon ios="sparkles" android="auto_awesome" size={22} color={colors.warm} />}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: space.lg, right: space.lg, alignItems: "center", zIndex: 10 },
  card: {
    width: "100%",
    maxWidth: 480,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  xp: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill },
  text: { flex: 1, gap: 2 },
});
