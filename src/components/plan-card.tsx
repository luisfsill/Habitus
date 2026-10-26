import { Pressable, StyleSheet, View } from "react-native";

import { formatPrice, type Plan } from "@/domain/access";
import { HIT, radius, space, useTheme } from "@/theme";

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
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onSelect} style={styles.row}>
      <View style={[styles.radio, { borderColor: selected ? colors.accent : colors.secondaryLabel }]}>
        {selected && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}
      </View>
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
      <AppText variant="title2" color={selected ? "accentText" : "label"}>
        {formatPrice(plan.priceCents)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: HIT, paddingVertical: space.sm },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  badge: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
  badgeText: { color: "#FFFFFF", fontWeight: "700" },
});
