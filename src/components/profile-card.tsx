import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { space } from "@/theme";

import { AppText } from "./app-text";
import { Avatar } from "./avatar";
import { BeltChip } from "./person-row";
import { type Stat, StatColumns } from "./stat-columns";

interface Props {
  name: string;
  username: string | null;
  photo: string | null;
  level: number;
  /** Numbers under the belt; left out when there are none to show. */
  stats?: readonly Stat[];
  /** Small pills beside the belt, e.g. "Fundador" or "Amigos". */
  tags?: ReactNode;
  /** Makes the photo and name a link, e.g. to the account page where they change. */
  onEdit?: () => void;
}

/** A mini profile: big photo, name, @, belt and level, a few numbers. Used for the viewer and for other people. */
export function ProfileCard({ name, username, photo, level, stats, tags, onEdit }: Props) {
  const who = (
    <>
      <Avatar url={photo} size={112} />
      <AppText variant="title2" align="center" numberOfLines={1}>
        {name}
      </AppText>
      <AppText variant="subheadline" color="secondaryLabel" align="center" numberOfLines={1}>
        {username ? `@${username}` : "Sem @"}
      </AppText>
    </>
  );
  return (
    <View style={styles.wrap}>
      {onEdit ? (
        <Pressable
          onPress={onEdit}
          accessibilityRole="link"
          accessibilityLabel={`${name}${username ? `, @${username}` : ""}. Editar perfil`}
          style={({ pressed }) => [styles.who, { opacity: pressed ? 0.7 : 1 }]}>
          {who}
        </Pressable>
      ) : (
        <View style={styles.who} accessible accessibilityRole="header" accessibilityLabel={`${name}${username ? `, @${username}` : ""}`}>
          {who}
        </View>
      )}
      <View style={styles.belt}>
        <BeltChip level={level} />
        <AppText variant="subheadline" color="secondaryLabel">
          Nível {level}
        </AppText>
        {tags}
      </View>
      {stats && stats.length > 0 && <StatColumns stats={stats} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  who: { alignItems: "center", gap: space.xs },
  belt: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: space.sm },
});
