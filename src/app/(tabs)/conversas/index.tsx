import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ActionRow } from "@/components/action-row";
import { AppText } from "@/components/app-text";
import { ConversationRow } from "@/components/conversation-row";
import { PresenceAvatar } from "@/components/avatar";
import { FriendPickerModal } from "@/components/friend-picker-modal";
import { StatusMenuModal } from "@/components/status-menu-modal";
import { Icon } from "@/components/icon";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { type Conversation, type Message, type Presence, previewOf } from "@/domain/chat";
import { addDays, dayKey, formatTime, minutesOfDay } from "@/domain/time";
import type { ChatStatus } from "@/domain/access";
import { setMyChatStatus } from "@/services/online";
import { useAccess } from "@/state/access";
import { useConversations } from "@/state/use-chat";
import { useFriends } from "@/state/use-friends";
import { usePresenceMap } from "@/state/use-online";
import { HIT, space, useTheme } from "@/theme";

const open = (id: string) => router.push(`/chat/${id}`);

/** "14:05" today, "Ontem", else "12/10". */
function whenOf(m: Message, now: Date): string {
  const d = new Date(m.createdAt);
  const day = dayKey(d);
  if (day === dayKey(now)) return formatTime(minutesOfDay(d));
  if (day === dayKey(addDays(now, -1))) return "Ontem";
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Loading({ error, loading, retry }: { error: string | null; loading: boolean; retry: () => void }) {
  return (
    <Screen title="Conversas">
      <AppText variant="body" color={error ? "danger" : "secondaryLabel"} accessibilityLiveRegion="polite">
        {error ?? "Carregando…"}
      </AppText>
      {error && <PrimaryButton label="Tentar de novo" variant="tinted" onPress={retry} loading={loading} />}
    </Screen>
  );
}

/** No conversation yet: point at the "+", or, with no friends, at the search for them. */
function EmptyHint({ friends }: { friends: number }) {
  if (friends > 0) {
    return (
      <AppText variant="body" color="secondaryLabel">
        Toque no + para começar uma conversa.
      </AppText>
    );
  }
  return (
    <>
      <AppText variant="body" color="secondaryLabel">
        Adicione amigos para conversar com eles.
      </AppText>
      <ActionRow label="Encontrar amigos" icon={{ ios: "person.badge.plus", android: "person_add" }} navigates onPress={() => router.push("/profile/lista")} />
    </>
  );
}

/** The "+" beside the title: starts a conversation with any friend. */
function NewChatButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Nova conversa" hitSlop={8} style={({ pressed }) => [styles.add, { opacity: pressed ? 0.6 : 1 }]}>
      <Icon ios="plus" android="add" size={28} color={colors.accent} />
    </Pressable>
  );
}

/** My photo with my status ring; tapping it opens "Meu status" to switch Disponível / Ausente / Invisível. */
function MyStatus() {
  const { profile, refresh } = useAccess();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!profile) return null;
  const pick = (status: ChatStatus) => {
    setBusy(true);
    setMyChatStatus(status)
      .then(() => refresh())
      .catch(() => undefined)
      .finally(() => {
        setBusy(false);
        setOpen(false);
      });
  };
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Meu status" hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        <PresenceAvatar url={profile.avatarUrl} size={40} presence={profile.chatStatus} />
      </Pressable>
      <StatusMenuModal visible={open} current={profile.chatStatus} busy={busy} onPick={pick} onClose={() => setOpen(false)} />
    </>
  );
}

function Talk({ c, me, now, presence }: { c: Conversation; me: string; now: Date; presence: Presence }) {
  const last = c.last;
  return (
    <ConversationRow
      name={c.peer.name}
      avatarUrl={c.peer.avatarUrl}
      preview={last ? previewOf(last, me) : ""}
      time={last ? whenOf(last, now) : undefined}
      unread={c.unread}
      presence={presence}
      onPress={() => open(c.peer.id)}
    />
  );
}

export default function ChatsScreen() {
  const me = useAccess().profile?.id ?? "";
  const { conversations, loading, error, reload } = useConversations();
  const { overview } = useFriends();
  const [picking, setPicking] = useState(false);
  const online = usePresenceMap();

  if (!conversations) return <Loading error={error} loading={loading} retry={() => void reload()} />;

  const now = new Date();
  const started = conversations.filter((c) => c.last);
  return (
    <Screen title="Conversas" accessory={
        <View style={styles.tools}>
          <MyStatus />
          <NewChatButton onPress={() => setPicking(true)} />
        </View>
      }>
      <FriendPickerModal visible={picking} friends={(overview?.friends ?? []).map((f) => ({ ...f, presence: online[f.id.toLowerCase()] ?? "offline" }))} onPick={open} onClose={() => setPicking(false)} />
      {error && (
        <AppText variant="subheadline" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
      {started.length > 0 && (
        <Section>
          {started.map((c) => (
            <Talk key={c.peer.id} c={c} me={me} now={now} presence={online[c.peer.id.toLowerCase()] ?? "offline"} />
          ))}
        </Section>
      )}
      {started.length === 0 && overview && <EmptyHint friends={overview.friends.length} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tools: { flexDirection: "row", alignItems: "center", gap: space.xs },
  add: { minWidth: HIT, minHeight: HIT, alignItems: "center", justifyContent: "center" },
});
