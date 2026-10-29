import { router, Stack, useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Avatar } from "@/components/avatar";
import { ChatBubble } from "@/components/chat-bubble";
import { ChatComposer } from "@/components/chat-composer";
import { ShakeView } from "@/components/shake-view";
import { groupByDay, type Message, nudgeWaitMs, seenMessageId } from "@/domain/chat";
import { playNudge } from "@/services/sound";
import { useAccess } from "@/state/access";
import { useConversation, useConversations } from "@/state/use-chat";
import { useFriends } from "@/state/use-friends";
import { confirm } from "@/state/use-sign-out";
import { HIT, MAX_WIDTH, pinned, space } from "@/theme";

const web = Platform.OS === "web";

type Row = { key: string; day: string } | { key: string; message: Message };

// shortcut: fixed room for the floating tab bar under the composer, measured by eye; read the real bar height if it ever changes.
const TAB_BAR = Platform.select({ web: 96, default: 64 });

/** Oldest first, as day headers and messages, reversed for the inverted list (newest at the bottom). */
function rowsOf(messages: Message[]): Row[] {
  const rows: Row[] = [];
  for (const g of groupByDay(messages, new Date())) {
    rows.push({ key: `day:${g.day}`, day: g.label });
    for (const m of g.messages) rows.push({ key: m.id, message: m });
  }
  return rows.reverse();
}

/** Photo and name in the header (opens the profile). */
function PeerTitle({ id, peer }: { id: string; peer: { name: string; avatarUrl: string | null } | undefined }) {
  return (
    <Pressable
      onPress={() => router.push(`/amigos/${id}`)}
      accessibilityRole="link"
      accessibilityLabel={`${peer?.name ?? "Perfil"}. Abrir perfil`}
      style={({ pressed }) => [styles.title, { opacity: pressed ? 0.6 : 1 }]}>
      <Avatar url={peer?.avatarUrl ?? null} size={32} />
      <View>
        <AppText variant="headline" numberOfLines={1}>
          {peer?.name ?? ""}
        </AppText>
      </View>
    </Pressable>
  );
}

/** A day header, or a message with "Visto" under the last one the friend read. */
function RowView({ row, me, peerName, seen, onReport }: { row: Row; me: string | null; peerName?: string; seen: string | null; onReport: (m: Message) => void }) {
  if ("day" in row) {
    return (
      <AppText variant="caption" color="secondaryLabel" align="center" style={styles.day} accessibilityRole="header">
        {row.day}
      </AppText>
    );
  }
  const m = row.message;
  const mine = m.sender === me;
  return (
    <View>
      <ChatBubble message={m} mine={mine} peerName={peerName} onLongPress={mine ? undefined : () => onReport(m)} />
      {m.id === seen && (
        <AppText variant="caption" color="secondaryLabel" align="right">
          Visto
        </AppText>
      )}
    </View>
  );
}

/** The error or notice line, then the composer, or a line when the friendship ended. */
function Footer({ status, failed, ended, composer }: { status: string | null; failed: boolean; ended: boolean; composer: ComponentProps<typeof ChatComposer> }) {
  return (
    <>
      {status && (
        <AppText variant="footnote" color={failed ? "danger" : "secondaryLabel"} accessibilityLiveRegion="polite">
          {status}
        </AppText>
      )}
      {ended ? (
        <AppText variant="subheadline" color="secondaryLabel" align="center" style={styles.ended}>
          Vocês não são mais amigos.
        </AppText>
      ) : (
        <ChatComposer {...composer} />
      )}
    </>
  );
}

/** Whether the on-screen keyboard is up (the tab bar hides behind it, so its room goes away). */
function useKeyboardShown() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // iOS: "Will" so the tab bar room goes away as the keyboard starts sliding, not after (Android only has "Did").
    const ios = Platform.OS === "ios";
    const up = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", () => setShown(true));
    const down = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => setShown(false));
    return () => {
      up.remove();
      down.remove();
    };
  }, []);
  return shown;
}

/** The conversation and who it is with; a friend with no messages yet is only in the friend list. */
function usePeer(id: string) {
  const { conversations } = useConversations();
  const { overview } = useFriends();
  const conversation = conversations?.find((c) => c.peer.id === id);
  return { conversation, peer: conversation?.peer ?? overview?.friends.find((f) => f.id.toLowerCase() === id) };
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id.toLowerCase();
  const me = useAccess().profile?.id ?? null;
  const { conversation, peer } = usePeer(id);
  const chat = useConversation(id);
  const { messages, peerReadAt, typing, nudges, error, send, loadOlder, setTyping, report } = chat;
  const [notice, setNotice] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardShown();
  // The transparent header's real height, status bar included (64 + inset on web and Android, 44 + inset on iPhone).
  const header = useHeaderHeight();

  // `nudges` only counts live nudges from the friend, so history never sounds.
  useEffect(() => {
    if (nudges > 0) playNudge();
  }, [nudges]);

  const rows = useMemo(() => rowsOf(messages), [messages]);
  const seen = me ? seenMessageId(messages, me, peerReadAt) : null;
  const wait = useMemo(() => (me ? nudgeWaitMs(messages, me, new Date()) : 0), [messages, me]);

  const reportMessage = (m: Message) =>
    confirm("Denunciar mensagem?", "A mensagem vai para a equipe do Habitus.", "Denunciar", () => {
      report(m.id).then(
        () => setNotice("Mensagem denunciada."),
        () => setNotice(null),
      );
    });

  const composer = {
    onSendText: (text: string) => send("text", text),
    onSendSticker: (sticker: string) => send("sticker", sticker),
    onNudge: () => send("nudge", ""),
    nudgeWaitMs: wait,
    disabled: !me,
    onTyping: setTyping,
  };
  // The keyboard padding (KeyboardAvoidingView) replaces the tab bar room: the bar hides behind the keyboard.
  const room = keyboard ? space.sm : insets.bottom + TAB_BAR;
  // Stable header options: changing them on each "digitando…" remounted the screen and reset the state.
  const options = useMemo(() => ({ headerTitle: () => <PeerTitle id={id} peer={peer} /> }), [id, peer]);
  return (
    <View style={[styles.root, web && [styles.web, { top: header }]]}>
      <Stack.Screen options={options} />
      <ShakeView trigger={nudges}>
        {/* Android is edge to edge (the window does not resize), so it pads for the keyboard too. */}
        <KeyboardAvoidingView style={[styles.column, { paddingTop: web ? 0 : header }]} behavior="padding">
          <FlatList
            inverted
            data={rows}
            keyExtractor={(r) => r.key}
            onEndReached={() => void loadOlder()}
            onEndReachedThreshold={0.3}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <RowView row={item} me={me} peerName={peer?.name.split(" ")[0]} seen={seen} onReport={reportMessage} />}
          />
          <View style={[styles.bottom, { paddingBottom: room }]}>
            {typing && (
              <AppText variant="caption" color="secondaryLabel" accessibilityLiveRegion="polite">
                {`${peer?.name.split(" ")[0] ?? "Seu amigo"} está digitando…`}
              </AppText>
            )}
            <Footer status={error ?? notice} failed={error !== null} ended={conversation?.friends === false} composer={composer} />
          </View>
        </KeyboardAvoidingView>
      </ShakeView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // The web page scrolls the document; the chat instead fills the window below the header and scrolls its own list.
  web: { ...pinned, left: 0, right: 0, bottom: 0 },
  column: { flex: 1, width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center" },
  list: { paddingHorizontal: space.lg, paddingVertical: space.sm, gap: space.xs },
  day: { paddingVertical: space.sm },
  title: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: HIT },
  bottom: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.xs },
  ended: { paddingVertical: space.md },
});
