import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";

import { formatPrice, type Plan } from "@/domain/access";
import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";

interface Props {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
}

/** One plan to pick on the renewal screen; the highlighted one says "Mais vantajoso". */
export function PlanCard({ plan, selected, onSelect }: Props) {
  const { colors } = useTheme();
  const perMonth = plan.days >= 60 ? ` · ${formatPrice(Math.round((plan.priceCents * 30) / plan.days))}/mês` : "";
  const scale = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(selected ? 1.02 : 1, { damping: 16 }) }] }));
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onSelect}>
      <Animated.View
        style={[
          styles.card,
          scale,
          {
            borderColor: selected ? colors.accent : "rgba(255,255,255,0.1)",
            shadowColor: colors.accent,
            shadowOpacity: selected ? 0.6 : 0,
          },
        ]}>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <AppText variant="headline">{plan.name}</AppText>
            {plan.highlight && (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <AppText variant="caption" style={styles.badgeText}>
                  Mais vantajoso
                </AppText>
              </View>
            )}
          </View>
          <AppText variant="footnote" color="secondaryLabel">
            {plan.days} dias{perMonth}
          </AppText>
        </View>
        <AppText variant="title3">{formatPrice(plan.priceCents)}</AppText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.06)",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
  },
  flex: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  badge: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
  badgeText: { color: "#FFFFFF", fontWeight: "700" },
});
