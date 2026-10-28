import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import type { GlobalRanking, GlobalRow } from "@/domain/ranking";
import { HIT, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { BeltChip } from "./person-row";

interface Props {
  ranking: GlobalRanking;
  onOpen: (id: string) => void;
  onAdd: (id: string) => void;
  /** Id of the person a friend request is being sent to. */
  requesting: string | null;
  /** The viewer is an admin: admins never enter the ranking. */
  excluded?: boolean;
}

function Row({ row, mine, first, pinned, onOpen, onAdd, requesting }: Omit<Props, "ranking" | "excluded"> & { row: GlobalRow; mine: boolean; first?: boolean; pinned?: boolean }) {
  const { colors } = useTheme();
  const name = pinned ? `${row.position} · Você` : mine ? "Você" : row.name;
  const podium = row.position <= 3;
  const body = (
    <>
      {pinned ? null : (
        <AppText variant="headline" color={podium ? "warm" : "secondaryLabel"} style={styles.position}>
          {row.position}
        </AppText>
      )}
      <View style={styles.who}>
        <AppText variant="headline" color={mine ? "accentText" : "label"} numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="footnote" color="secondaryLabel" numberOfLines={1}>
          @{row.username}
        </AppText>
      </View>
      <BeltChip level={row.level} />
      <AppText variant="subheadline" style={styles.xp}>
        {row.weekXp} XP
      </AppText>
    </>
  );
  return (
    <View style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.separator }]}>
      {mine ? (
        <View
          style={styles.main}
          accessible
          accessibilityLabel={`${row.position}º lugar: Você, @${row.username}, ${row.weekXp} XP na semana`}>
          {body}
        </View>
      ) : (
        <Pressable
          onPress={() => onOpen(row.id)}
          accessibilityRole="link"
          accessibilityLabel={`${row.position}º lugar: ${row.name}, @${row.username}, ${row.weekXp} XP na semana. Abre o perfil`}
          style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}>
          {body}
        </Pressable>
      )}
      {mine ? null : row.relation === "none" ? (
        <Pressable
          onPress={() => onAdd(row.id)}
          disabled={requesting === row.id}
          accessibilityRole="button"
          accessibilityLabel={`Pedir amizade a ${row.name}`}
          style={styles.add}>
          {requesting === row.id ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Icon ios="plus" android="add" size={20} color={colors.accentText} />
          )}
        </Pressable>
      ) : row.relation === "outgoing" ? (
        <AppText variant="caption" color="secondaryLabel">
          Enviado
        </AppText>
      ) : row.relation === "incoming" ? (
        <AppText variant="caption" color="secondaryLabel">
          Te pediu
        </AppText>
      ) : null}
    </View>
  );
}

/** The week's global top: tap a row to open the profile, "+" to ask for friendship. The viewer's row is pinned below when outside the top. */
export function GlobalRankList({ ranking, onOpen, onAdd, requesting, excluded }: Props) {
  const { colors } = useTheme();
  const { top, me } = ranking;
  const meOutside = me && !top.some((r) => r.id === me.id);
  const shared = { onOpen, onAdd, requesting };
  return (
    <View>
      {top.length === 0 ? (
        <AppText variant="subheadline" color="secondaryLabel">
          Ninguém pontuou nesta semana ainda
        </AppText>
      ) : (
        top.map((r, i) => <Row key={r.id} row={r} mine={r.id === me?.id} first={i === 0} {...shared} />)
      )}
      {meOutside ? (
        <Row row={me} mine pinned {...shared} />
      ) : null}
      {me === null ? (
        <AppText variant="footnote" color="secondaryLabel" style={[styles.pinned, { borderColor: colors.separator }]}>
          {excluded ? "Administradores não entram no ranking" : "Você ainda não pontuou nesta semana"}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.md },
  main: { flex: 1, minHeight: HIT, flexDirection: "row", alignItems: "center", gap: space.md },
  position: { minWidth: 24, textAlign: "center" },
  who: { flex: 1, gap: 2 },
  xp: { fontWeight: "700", fontVariant: ["tabular-nums"] },
  add: { width: HIT, height: HIT, alignItems: "center", justifyContent: "center" },
  pinned: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: space.sm, paddingTop: space.sm },
});
