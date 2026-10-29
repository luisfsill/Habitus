import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import type { BadgeState } from "@/domain/achievements";
import { beltFor } from "@/domain/gamification";
import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import type { Stat } from "./stat-columns";

interface Props {
  name: string;
  username: string | null;
  photo: string | null;
  level: number;
  /** XP inside the current level; shows a progress bar (only the viewer's own card has it). */
  xp?: { into: number; needed: number };
  /** Numbers under the card; left out when there are none to show. */
  stats?: readonly Stat[];
  /** Medals for the shelf at the bottom of the card; locked ones show dimmed. Left out hides the shelf. */
  badges?: readonly BadgeState[];
  /** A staff title (e.g. "Founder"), shown in gold over the name, with a rainbow rim on the card. */
  staff?: string;
  /** Makes the photo and name a link, e.g. to the account page where they change. */
  onEdit?: () => void;
}

// RN's `backgroundImage` takes CSS gradient strings.
const RAINBOW: ViewStyle = { backgroundImage: "linear-gradient(120deg, #F59E0B, #EC4899, #38BDF8, #F59E0B)" };
const GOLD = "#F59E0B";

/** One figure of the row: the number over a small label, like a follower count. */
function Figure({ stat }: { stat: Stat }) {
  const label = stat.accessibilityLabel ?? `${stat.label}: ${stat.value}`;
  const body = (
    <>
      <AppText variant="headline" color={stat.color ?? "label"} style={styles.digits} maxFontSizeMultiplier={1.3}>
        {stat.value}
      </AppText>
      <AppText variant="caption" color="secondaryLabel" align="center" numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {stat.label}
      </AppText>
    </>
  );
  return stat.onPress ? (
    <Pressable onPress={stat.onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.figure, { opacity: pressed ? 0.6 : 1 }]}>
      {body}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={label} style={styles.figure}>
      {body}
    </View>
  );
}

/** Level, XP numbers and a bar filled to the share of the level already earned. */
function XpBar({ level, into, needed }: { level: number; into: number; needed: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.xp} accessible accessibilityRole="progressbar" accessibilityLabel={`Nível ${level}`} accessibilityValue={{ min: 0, max: needed, now: into, text: `${into} de ${needed} XP` }}>
      <View style={styles.xpText}>
        <AppText variant="caption" color="secondaryLabel">{`Nível ${level}`}</AppText>
        <AppText variant="caption" color="secondaryLabel" style={styles.digits}>{`${into} / ${needed} XP`}</AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.ringTrack }]}>
        <View style={[styles.fill, { width: `${Math.min(100, (100 * into) / needed)}%`, backgroundColor: colors.accentText }]} />
      </View>
    </View>
  );
}

/** A row of medal tiles; tapping one names it and says how to earn it, tapping again hides that. */
function Shelf({ badges }: { badges: readonly BadgeState[] }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  const sorted = [...badges.filter((b) => b.unlocked), ...badges.filter((b) => !b.unlocked)];
  const shown = sorted.find((b) => b.def.id === open);
  if (sorted.length === 0) return null;
  return (
    <View style={styles.shelfWrap}>
      <View style={styles.shelf}>
        {sorted.map(({ def, unlocked }) => (
          <Pressable
            key={def.id}
            onPress={() => {
              void Haptics.selectionAsync();
              setOpen(open === def.id ? null : def.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: open === def.id }}
            accessibilityLabel={`${def.title}${unlocked ? "" : ", ainda não conquistada"}`}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: colors.fill, borderColor: open === def.id ? colors.accentText : colors.glassEdge, opacity: unlocked ? 1 : 0.35 },
              pressed && styles.pressed,
            ]}>
            <Icon ios={def.symbol.ios} android={def.symbol.android} size={22} color={unlocked ? colors.accentText : colors.secondaryLabel} />
          </Pressable>
        ))}
      </View>
      {shown && (
        <AppText variant="footnote" color="secondaryLabel" accessibilityLiveRegion="polite">
          <AppText variant="footnote" style={styles.bold}>{shown.def.title}</AppText>
          {` · ${shown.def.description}${shown.unlocked ? "" : ` (${shown.progress}/${shown.def.target})`}`}
        </AppText>
      )}
    </View>
  );
}

/** A mini profile as a card: photo on the left, name, @, belt and level beside it, a medal shelf; numbers below. */
export function ProfileCard({ name, username, photo, level, xp, stats, badges, staff, onEdit }: Props) {
  const { colors } = useTheme();
  const belt = beltFor(level);
  const spoken = `${name}${staff ? `, ${staff}` : ""}${username ? `, @${username}` : ""}, ${belt.name}, nível ${level}`;
  const who = (
    <>
      <Avatar url={photo} size={84} />
      <View style={styles.text}>
        {staff && (
          <View style={styles.seal}>
            <Icon ios="crown.fill" android="workspace_premium" size={13} color={GOLD} />
            <AppText variant="caption" style={[styles.sealText, { color: colors.warm }]}>
              {staff.toUpperCase()}
            </AppText>
          </View>
        )}
        <AppText variant="title3" numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="subheadline" color="secondaryLabel" numberOfLines={1}>
          {username ? `@${username}` : "Sem @"}
        </AppText>
        <View style={styles.beltRow}>
          <View style={[styles.dot, { backgroundColor: belt.color, borderColor: colors.separator }]} />
          <AppText variant="footnote" color="secondaryLabel" numberOfLines={1}>
            {xp ? belt.name : `${belt.name} · Nível ${level}`}
          </AppText>
        </View>
      </View>
    </>
  );
  return (
    <View style={styles.wrap}>
      <View style={[styles.rim, staff ? RAINBOW : { backgroundColor: colors.glassEdge }]}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {onEdit ? (
            <Pressable onPress={onEdit} accessibilityRole="link" accessibilityLabel={`${spoken}. Editar perfil`} style={({ pressed }) => [styles.who, { opacity: pressed ? 0.7 : 1 }]}>
              {who}
            </Pressable>
          ) : (
            <View style={styles.who} accessible accessibilityRole="header" accessibilityLabel={spoken}>
              {who}
            </View>
          )}
          {xp && <XpBar level={level} into={xp.into} needed={xp.needed} />}
          {badges && <Shelf badges={badges} />}
        </View>
      </View>
      {stats && stats.length > 0 && (
        <View style={styles.figures}>
          {stats.map((stat) => (
            <Figure key={stat.label} stat={stat} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  rim: { borderRadius: radius.lg, padding: 1.5 },
  card: { borderRadius: radius.lg - 1.5, padding: space.lg, gap: space.md },
  who: { flexDirection: "row", alignItems: "center", gap: space.lg },
  text: { flex: 1, gap: 2 },
  seal: { flexDirection: "row", alignItems: "center", gap: 4 },
  sealText: { fontWeight: "800", letterSpacing: 1.5 },
  beltRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: StyleSheet.hairlineWidth },
  xp: { gap: 6 },
  xpText: { flexDirection: "row", justifyContent: "space-between" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  shelfWrap: { gap: space.sm },
  shelf: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  tile: { width: 44, height: 44, borderRadius: radius.sm, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pressed: { transform: [{ scale: 0.92 }] },
  bold: { fontWeight: "700" },
  figures: { flexDirection: "row" },
  figure: { flex: 1, alignItems: "center", gap: 2 },
  digits: { fontVariant: ["tabular-nums"] },
});
