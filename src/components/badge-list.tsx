import { StyleSheet, View } from "react-native";

import type { BadgeState } from "@/domain/achievements";
import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

/** One row per medal, earned ones first (original order kept inside each group). */
export function BadgeList({ badges }: { badges: readonly BadgeState[] }) {
  const { colors } = useTheme();
  const sorted = [...badges.filter((b) => b.unlocked), ...badges.filter((b) => !b.unlocked)];
  return (
    <View>
      {sorted.map(({ def, unlocked, progress }, i) => (
        <View
          key={def.id}
          style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.separator }]}
          accessible
          accessibilityLabel={`${def.title}: ${def.description} ${unlocked ? "Conquistada." : `Progresso ${progress} de ${def.target}.`}`}>
          <View style={[styles.medal, { backgroundColor: unlocked ? colors.accent : colors.fill }]}>
            <Icon ios={def.symbol.ios} android={def.symbol.android} size={20} color={unlocked ? colors.onAccent : colors.secondaryLabel} />
          </View>
          <View style={styles.text}>
            <AppText variant="headline">{def.title}</AppText>
            <AppText variant="footnote" color="secondaryLabel">
              {def.description}
            </AppText>
          </View>
          <AppText variant="caption" color="secondaryLabel">
            {unlocked ? "Conquistada" : `${progress}/${def.target}`}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  medal: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
});
