import { StyleSheet, View } from "react-native";

import type { RankRow } from "@/domain/friends";
import { HIT, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { BeltChip } from "./person-row";

/** The week's ranking: position, name, @, belt and XP; the viewer's own row reads "Você" and is highlighted. */
export function RankList({ rows }: { rows: readonly RankRow[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.list}>
      {rows.map((r) => {
        const name = r.me ? "Você" : r.name;
        return (
          <View
            key={r.id}
            accessible
            accessibilityLabel={`${r.position}º lugar: ${name}, @${r.username}, ${r.weekXp} XP na semana`}
            style={[styles.row, r.me && { backgroundColor: colors.accentSoft }]}>
            <AppText variant="headline" color={r.me ? "accentText" : "secondaryLabel"} style={styles.position}>
              {r.position}
            </AppText>
            <View style={styles.who}>
              <AppText variant="headline" color={r.me ? "accentText" : "label"} numberOfLines={1}>
                {name}
              </AppText>
              <AppText variant="footnote" color="secondaryLabel" numberOfLines={1}>
                @{r.username}
              </AppText>
            </View>
            <BeltChip level={r.level} />
            <AppText variant="subheadline" style={styles.xp}>
              {r.weekXp} XP
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 2, marginHorizontal: -space.sm },
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.sm },
  position: { minWidth: 24, textAlign: "center" },
  who: { flex: 1, gap: 2 },
  xp: { fontWeight: "700", fontVariant: ["tabular-nums"] },
});
