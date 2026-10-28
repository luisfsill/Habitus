import { Pressable, StyleSheet, View } from "react-native";

import { formatPrice, type Plan } from "@/domain/access";
import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";

interface Props {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
  /** 0…1 saved per month against the shortest plan; shown as "economize N%" when worth saying. */
  saving?: number;
}

/** One plan to pick: a large tile with name, length and price; the chosen one gets an accent border. */
export function PlanCard({ plan, selected, onSelect, saving = 0 }: Props) {
  const { colors } = useTheme();
  const perMonth = plan.days >= 60 ? `${formatPrice(Math.round((plan.priceCents * 30) / plan.days))}/mês` : "";
  const save = saving >= 0.05 ? `economize ${Math.round(saving * 100)}%` : "";
  const detail = [`${plan.days} dias`, perMonth, save].filter(Boolean).join(" · ");
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${plan.name}, ${formatPrice(plan.priceCents)}, ${detail}${plan.highlight ? ", mais vantajoso" : ""}`}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.tile,
        selected
          ? { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentSoft }
          : { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator },
        { opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <AppText variant="headline">{plan.name}</AppText>
          {plan.highlight && (
            <View style={[styles.badge, { backgroundColor: colors.success }]}>
              <AppText variant="caption" style={styles.badgeText}>
                Mais vantajoso
              </AppText>
            </View>
          )}
        </View>
        <AppText variant="footnote" color="secondaryLabel">
          {detail}
        </AppText>
      </View>
      <AppText variant="title2" color={selected ? "accentText" : "label"} style={styles.price}>
        {formatPrice(plan.priceCents)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 64, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.lg },
  flex: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  badge: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
  badgeText: { color: "#04342C", fontWeight: "700" },
  price: { fontVariant: ["tabular-nums"] },
});
