import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { PresenceAvatar } from "@/components/avatar";
import { ChatBubble } from "@/components/chat-bubble";
import { ChatComposer } from "@/components/chat-composer";
import { ShakeView } from "@/components/shake-view";
import { DANCE_MS, StickerDance } from "@/components/sticker-dance";
import { groupByDay, type Message, nudgeWaitMs, seenMessageId } from "@/domain/chat";
import { playNudge } from "@/services/sound";
import { useAccess } from "@/state/access";
import { useConversation, useConversations } from "@/state/use-chat";
import { useFriends } from "@/state/use-friends";
import { usePresence } from "@/state/use-online";
import { useStickerDance } from "@/state/use-sticker-dance";
import { confirm } from "@/state/use-sign-out";
import { Icon } from "@/components/icon";
import { HIT, MAX_WIDTH, pinned, space, useTheme } from "@/theme";

const web = Platform.OS === "web";
/** The header row: the 48pt photo plus its vertical padding, and the hairline under it. */
const HEADER_ROW = 48 + space.xs * 2 + 1;
/** Web: room above the header, so the photo starts below the iPhone's blur (about 70pt from the top on iOS 26). */
const WEB_TOP = space.md;

type Row = { key: string; day: string } | { key: string; message: Message };


/** Oldest first, as day headers and messages, reversed for the inverted list (newest at the bottom). */
function rowsOf(messages: Message[]): Row[] {
  const rows: Row[] = [];
  for (const g of groupByDay(messages, new Date())) {
    rows.push({ key: `day:${g.day}`, day: g.label });
    for (const m of g.messages) rows.push({ key: m.id, message: m });
  }
  return rows.reverse();
}

const goBack = () => (router.canGoBack() ? router.back() : router.replace("/conversas"));

/** The chat's own top bar, like a direct message: back to the list, then the friend (opens the profile). */
function ChatHeader({ id, peer }: { id: string; peer: { name: string; avatarUrl: string | null } | undefined }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { borderColor: colors.separator }]}>
      <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Voltar para Conversas" hitSlop={8} style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}>
        <Icon ios="chevron.left" android="chevron_left" size={26} color={colors.accent} />
      </Pressable>
      <PeerTitle id={id} peer={peer} />
    </View>
  );
}

/** Photo and name (opens the profile). */
function PeerTitle({ id, peer }: { id: string; peer: { name: string; avatarUrl: string | null } | undefined }) {
  const presence = usePresence(id);
  return (
    <Pressable
      onPress={() => router.push(`/perfil/${id}`)}
      accessibilityRole="link"
      accessibilityLabel={`${peer?.name ?? "Perfil"}. Abrir perfil`}
      style={({ pressed }) => [styles.title, { opacity: pressed ? 0.6 : 1 }]}>
      <PresenceAvatar url={peer?.avatarUrl ?? null} size={48} presence={presence} />
      <AppText variant="headline" numberOfLines={1} style={styles.grow}>
        {peer?.name ?? ""}
      </AppText>
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

/** Whether the on-screen keyboard is up (it covers the home indicator, so that room goes away). */
function useKeyboardShown() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // iOS: "Will" so the bottom room goes away as the keyboard starts sliding, not after (Android only has "Did").
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

/** Web: the document must not scroll under the chat, or a wheel outside the list moves the page instead. */
function useLockedPage() {
  // Only while the chat is the screen in front: a profile opened on top must scroll again.
  useFocusEffect(
    useCallback(() => {
      if (!web) return;
      const root = document.documentElement;
      const before = root.style.overflow;
      root.style.overflow = "hidden";
      return () => {
        root.style.overflow = before;
      };
    }, []),
  );
}

/** The conversation and who it is with; a friend with no messages yet is only in the friend list. */
function usePeer(id: string) {
  const { conversations } = useConversations();
  const { overview } = useFriends();
  const conversation = conversations?.find((c) => c.peer.id === id);
  return { conversation, peer: conversation?.peer ?? overview?.friends.find((f) => f.id.toLowerCase() === id) };
}

/** Web: the header sits in the page and the fixed box starts below it, as when it was the stack header. */
function WebHeader({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  if (!web) return null;
  return <View style={[styles.bar, { paddingTop: insets.top + WEB_TOP }]}>{children}</View>;
}

/** Web: the chat box below the header (the status bar plus one header row); native: the whole screen. */
const boxStyle = (inset: number) => (web ? [styles.web, { top: inset + WEB_TOP + HEADER_ROW }] : null);
const columnTop = (inset: number) => (web ? 0 : inset);

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id.toLowerCase();
  const me = useAccess().profile?.id ?? null;
  const { conversation, peer } = usePeer(id);
  const chat = useConversation(id);
  const { messages, peerReadAt, typing, nudges, error, send, loadOlder, setTyping, report } = chat;
  const { dance, done } = useStickerDance(id, messages, DANCE_MS);
  const [notice, setNotice] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardShown();
  useLockedPage();

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
  // The keyboard padding (KeyboardAvoidingView) replaces the home indicator room.
  const room = keyboard ? space.sm : insets.bottom + space.sm;
  const header = <ChatHeader id={id} peer={peer} />;
  return (
    <View style={styles.root}>
      <WebHeader>{header}</WebHeader>
      <View style={[styles.root, boxStyle(insets.top)]}>
        <ShakeView trigger={nudges}>
          {/* Android is edge to edge (the window does not resize), so it pads for the keyboard too. */}
          <KeyboardAvoidingView style={[styles.column, { paddingTop: columnTop(insets.top) }]} behavior="padding">
            {!web && header}
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
        {dance && <StickerDance key={dance.key} id={dance.id} onDone={done} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // The web page scrolls the document; the chat instead fills the window below the header and scrolls only its own list.
  web: { ...pinned, left: 0, right: 0, bottom: 0 },
  bar: { width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center" },
  column: { flex: 1, width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center" },
  list: { paddingHorizontal: space.lg, paddingVertical: space.sm, gap: space.xs },
  day: { paddingVertical: space.sm },
  header: { flexDirection: "row", alignItems: "center", gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { minWidth: HIT, minHeight: HIT, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: HIT },
  grow: { flex: 1 },
  bottom: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.xs },
  ended: { paddingVertical: space.md },
});
