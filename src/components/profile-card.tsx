import { Pressable, StyleSheet, View } from "react-native";

import type { Progress } from "@/domain/achievements";
import { space } from "@/theme";

import { AppText } from "./app-text";
import { Avatar } from "./avatar";
import { BeltChip } from "./person-row";
import { StatColumns } from "./stat-columns";

interface Props {
  name: string;
  username: string | null;
  photo: string | null;
  progress: Progress;
  /** Opens the account page, where the photo, name and @ change. */
  onEdit: () => void;
}

/** The viewer's mini profile: big photo, name, @, belt and a few numbers. */
export function ProfileCard({ name, username, photo, progress, onEdit }: Props) {
  const { level, stats, badges } = progress;
  const medals = badges.filter((b) => b.unlocked).length;
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onEdit}
        accessibilityRole="link"
        accessibilityLabel={`${name}${username ? `, @${username}` : ""}. Editar perfil`}
        style={({ pressed }) => [styles.who, { opacity: pressed ? 0.7 : 1 }]}>
        <Avatar url={photo} size={112} />
        <AppText variant="title2" align="center" numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="subheadline" color="secondaryLabel" align="center" numberOfLines={1}>
          {username ? `@${username}` : "Sem @"}
        </AppText>
      </Pressable>
      <View style={styles.belt}>
        <BeltChip level={level.level} />
        <AppText variant="subheadline" color="secondaryLabel">
          Nível {level.level}
        </AppText>
      </View>
      <StatColumns
        stats={[
          { value: String(stats.currentStreak), label: stats.currentStreak === 1 ? "dia seguido" : "dias seguidos", color: "warm" },
          { value: String(stats.xp), label: "XP no total", color: "accentText" },
          { value: String(medals), label: medals === 1 ? "medalha" : "medalhas", color: "successText" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  who: { alignItems: "center", gap: space.xs },
  belt: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm },
});
