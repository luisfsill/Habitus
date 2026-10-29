import { Pressable, StyleSheet, View } from "react-native";

import { HIT, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Avatar } from "./avatar";

interface Props {
  name: string;
  avatarUrl: string | null;
  /** Last message ("Você: oi", "Figurinha") or, with no conversation yet, the @. */
  preview: string;
  /** "14:05", "Ontem", "12/10"; left out with no message. */
  time?: string;
  unread: number;
  onPress: () => void;
}

/** A conversation in the list: photo, name, last message, when, and a dot with the unread count. */
export function ConversationRow({ name, avatarUrl, preview, time, unread, onPress }: Props) {
  const { colors } = useTheme();
  const unreadLabel = unread === 0 ? "" : unread === 1 ? ". 1 não lida" : `. ${unread} não lidas`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${name}. ${preview}${time ? `. ${time}` : ""}${unreadLabel}. Abrir conversa`}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <Avatar url={avatarUrl} size={44} />
      <View style={styles.text}>
        <View style={styles.top}>
          <AppText variant="headline" numberOfLines={1} style={styles.grow}>
            {name}
          </AppText>
          {time && (
            <AppText variant="footnote" color={unread > 0 ? "accentText" : "secondaryLabel"}>
              {time}
            </AppText>
          )}
        </View>
        <View style={styles.top}>
          <AppText variant="subheadline" color={unread > 0 ? "label" : "secondaryLabel"} numberOfLines={1} style={styles.grow}>
            {preview}
          </AppText>
          {unread > 0 && (
            <View style={[styles.dot, { backgroundColor: colors.accent }]}>
              <AppText variant="caption" style={[styles.count, { color: colors.onAccent }]} maxFontSizeMultiplier={1.4}>
                {unread > 99 ? "99+" : String(unread)}
              </AppText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", gap: space.md },
  text: { flex: 1, gap: 2 },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm },
  grow: { flex: 1 },
  dot: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  count: { fontWeight: "700" },
});
