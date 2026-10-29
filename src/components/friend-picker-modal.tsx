import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { filterFriends, type Presence } from "@/domain/chat";
import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { ConversationRow } from "./conversation-row";
import { Glass } from "./glass";
import { Icon } from "./icon";
import { TextField } from "./text-field";

interface Friend {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  presence?: Presence;
}

interface Props {
  visible: boolean;
  friends: readonly Friend[];
  onPick: (id: string) => void;
  onClose: () => void;
}

/** "Nova conversa": every friend, filtered by name or @ as you type; tapping one opens the chat with them. */
export function FriendPickerModal({ visible, friends, onPick, onClose }: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const shown = filterFriends(friends, query);
  const close = () => {
    setQuery("");
    onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Fechar" />
        <Glass style={[styles.card, { backgroundColor: colors.background }]}>
          <View style={styles.head}>
            <AppText variant="title3" style={styles.grow} accessibilityRole="header">
              Nova conversa
            </AppText>
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8} style={[styles.close, { backgroundColor: colors.accentSoft }]}>
              <Icon ios="xmark" android="close" size={18} color={colors.label} />
            </Pressable>
          </View>
          <TextField label="Buscar por nome ou @" value={query} onChangeText={setQuery} placeholder="Nome ou @" autoCapitalize="none" maxLength={40} style={styles.search} />
          <ScrollView style={styles.list} contentContainerStyle={styles.rows} keyboardShouldPersistTaps="handled">
            {shown.map((f) => (
              <ConversationRow
                key={f.id}
                name={f.name}
                avatarUrl={f.avatarUrl}
                preview={`@${f.username}`}
                unread={0}
                presence={f.presence}
                onPress={() => {
                  close();
                  onPick(f.id);
                }}
              />
            ))}
            {shown.length === 0 && (
              <AppText variant="body" color="secondaryLabel" accessibilityLiveRegion="polite">
                {friends.length === 0 ? "Adicione amigos para conversar com eles." : "Ninguém com esse nome."}
              </AppText>
            )}
          </ScrollView>
        </Glass>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg, backgroundColor: "rgba(1,8,16,0.72)" },
  card: { width: "100%", maxWidth: 420, maxHeight: "80%", padding: space.lg, gap: space.md },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  grow: { flex: 1 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  // TextField grows to 160 wide in form rows; in this column that basis became 160 tall.
  search: { flexGrow: 0, flexBasis: "auto" },
  list: { flexGrow: 0 },
  rows: { gap: space.md, paddingBottom: space.xs },
});
