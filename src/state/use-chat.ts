import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppState, Platform } from "react-native";

import { type Conversation, type Message, type MessageKind, mergeMessages, nudgeWaitMs, PAGE_SIZE, previewOf, textProblem, unreadTotal } from "@/domain/chat";
import { joinTyping, listConversations, loadMessages, markRead, reportMessage, sendMessage, subscribeInbox } from "@/services/chat";
import { log } from "@/services/log";
import { showMessageNotice } from "@/services/notifications";
import { useAccess } from "@/state/access";

type InboxEvent = { type: "new"; message: Message } | { type: "reconnect" };

// The conversation list, shared so the tab bar badge follows what the Conversas tab shows.
let shared: Conversation[] | null = null;
const listeners = new Set<() => void>();
const events = new Set<(e: InboxEvent) => void>();
function publish(next: Conversation[] | null) {
  shared = next;
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
const snapshot = () => shared;
const emit = (e: InboxEvent) => events.forEach((l) => l(e));

let inbox: { me: string; users: number; stop: () => void } | null = null;
// The conversation on screen: its incoming messages are read right away, so they never count as unread.
let openPeer: string | null = null;
let reloads = 0;

async function reload(): Promise<void> {
  const ticket = ++reloads;
  const me = inbox?.me;
  const list = await listConversations();
  // Only the latest answer for the current account lands (a slow older reply never overwrites it).
  if (ticket !== reloads || inbox?.me !== me) return;
  // The open conversation is being read: a list computed before its mark_read committed must not bring the badge back.
  const reading = AppState.currentState === "active" ? openPeer : null;
  publish(list.map((c) => (c.peer.id === reading ? { ...c, unread: 0 } : c)));
}
const reloadQuietly = () => reload().catch((e: unknown) => log.warn("could not read conversations", e));

const byLast = (a: Conversation, b: Conversation) => (b.last?.createdAt ?? "").localeCompare(a.last?.createdAt ?? "");

function applyMessage(me: string, m: Message) {
  const peer = m.sender === me ? m.recipient : m.sender;
  const current = shared?.find((c) => c.peer.id === peer);
  // RF-1: someone not in the list (new friend, ex-friend): read the list again instead of dropping it.
  if (!shared || !current) {
    void reloadQuietly();
    return;
  }
  const newer = !current.last || current.last.createdAt <= m.createdAt;
  const fresh = m.sender === peer && peer !== openPeer && current.last?.id !== m.id;
  const updated = { ...current, last: newer ? m : current.last, unread: current.unread + (fresh ? 1 : 0) };
  publish(shared.map((c) => (c === current ? updated : c)).sort(byLast));
}

/** A friend's message while the app is open on another screen: a notification like the closed-app push (same id, so one). */
function notifyIfAway(me: string, m: Message) {
  if (m.sender === me || m.sender === openPeer || AppState.currentState !== "active") return;
  const name = shared?.find((c) => c.peer.id === m.sender)?.peer.name.split(" ")[0] || "Nova mensagem";
  showMessageNotice(`social:msg:${m.sender}`, name, previewOf(m, me), `/conversas/${m.sender}`).catch((e: unknown) => log.warn("could not show message notice", e));
}

function setRead(peer: string, change: Partial<Conversation>) {
  if (shared?.some((c) => c.peer.id === peer)) publish(shared.map((c) => (c.peer.id === peer ? { ...c, ...change } : c)));
}

/** One inbox subscription for the whole app, kept while any screen that needs it is mounted. */
function retainInbox(me: string): () => void {
  if (inbox?.me !== me) {
    inbox?.stop();
    publish(null);
    const unsubscribe = subscribeInbox(me, {
      message: (m) => {
        applyMessage(me, m);
        // Live nudge from the friend: buzz on any screen (the open chat adds the shake and sound).
        if (m.kind === "nudge" && m.sender !== me && Platform.OS !== "web" && AppState.currentState === "active") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        }
        notifyIfAway(me, m);
        emit({ type: "new", message: m });
      },
      read: (peer, readAt) => setRead(peer, { peerReadAt: readAt }),
      reconnect: () => {
        void reloadQuietly();
        emit({ type: "reconnect" });
      },
    });
    // RF-3: back from the background, Realtime may have missed events.
    const app = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void reloadQuietly();
      emit({ type: "reconnect" });
    });
    inbox = { me, users: 0, stop: () => { unsubscribe(); app.remove(); } };
    void reloadQuietly();
  }
  const held = inbox;
  held.users += 1;
  return () => {
    held.users -= 1;
    if (held.users > 0 || inbox !== held) return;
    held.stop();
    inbox = null;
    publish(null);
  };
}

function useInbox(): string | null {
  const { profile, hasAccess } = useAccess();
  const me = profile && hasAccess ? profile.id : null;
  useEffect(() => (me ? retainInbox(me) : undefined), [me]);
  return me;
}

/** Unread messages across all conversations, for the tab bar badge. */
export function useUnreadCount(): number {
  useInbox();
  const list = useSyncExternalStore(subscribe, snapshot);
  return list ? unreadTotal(list) : 0;
}

/** Conversations, newest first; reloads whenever the tab gains focus. */
export function useConversations() {
  useInbox();
  const conversations = useSyncExternalStore(subscribe, snapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadNow = useCallback(async () => {
    setLoading(true);
    try {
      await reload();
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reloadNow();
    }, [reloadNow]),
  );

  return { conversations, loading, error, reload: reloadNow };
}

/** One conversation: its messages, live updates, "digitando…" and sending. */
export function useConversation(peer: string) {
  const me = useInbox();
  const list = useSyncExternalStore(subscribe, snapshot);
  const peerReadAt = list?.find((c) => c.peer.id === peer)?.peerReadAt ?? null;
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTypingState] = useState(false);
  const [nudges, setNudges] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const focused = useRef(false);
  const busy = useRef({ older: false, nudge: false, done: false });
  const typingChannel = useRef<ReturnType<typeof joinTyping> | null>(null);

  const read = useCallback(() => {
    setRead(peer, { unread: 0 });
    markRead(peer).catch((e: unknown) => log.warn("could not mark read", e));
  }, [peer]);

  useEffect(() => {
    if (!me) return;
    const loadLatest = () =>
      loadMessages(peer).then(
        (page) => {
          setMessages((prev) => mergeMessages(prev, page));
          if (focused.current) read();
        },
        (e: Error) => setError(e.message),
      );
    void loadLatest();
    const off = (e: InboxEvent) => {
      if (e.type === "reconnect") return void loadLatest();
      const m = e.message;
      if (m.sender !== peer && m.recipient !== peer) return;
      setMessages((prev) => mergeMessages(prev, [m]));
      if (m.sender !== peer) return;
      if (m.kind === "nudge" && focused.current && AppState.currentState === "active") setNudges((n) => n + 1);
      if (focused.current && AppState.currentState === "active") read();
    };
    events.add(off);
    typingChannel.current = joinTyping(me, peer, setTypingState);
    typingChannel.current.setViewing(focused.current && AppState.currentState === "active");
    return () => {
      events.delete(off);
      typingChannel.current?.leave();
      typingChannel.current = null;
    };
  }, [me, peer, read]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      openPeer = peer;
      read();
      // On screen and in the foreground: the friend's messages skip the phone notice (see sendMessage's `quiet`).
      const viewing = () => typingChannel.current?.setViewing(focused.current && AppState.currentState === "active");
      viewing();
      const app = AppState.addEventListener("change", viewing);
      return () => {
        focused.current = false;
        viewing();
        app.remove();
        if (openPeer === peer) openPeer = null;
      };
    }, [peer, read]),
  );

  const peerViewing = () => typingChannel.current?.peerViewing() === true;

  /** Rejects (and sets `error`) when the message was not sent, so the screen can keep the text. */
  const send = useCallback(
    async (kind: MessageKind, body: string) => {
      // Rejects (not a silent no-op) so the composer keeps the typed text.
      if (!me) {
        const waiting = "Ainda conectando. Tente de novo.";
        setError(waiting);
        throw new Error(waiting);
      }
      const problem = kind === "text" ? textProblem(body) : null;
      const wait = kind === "nudge" ? nudgeWaitMs(messages, me, new Date()) : 0;
      // RF-5: a second tap while the first nudge is in flight sends nothing.
      if (kind === "nudge" && busy.current.nudge) return;
      const refused = problem ?? (wait > 0 ? "Espere um pouco para chamar a atenção de novo." : null);
      if (refused) {
        setError(refused);
        throw new Error(refused);
      }
      if (kind === "nudge") busy.current.nudge = true;
      try {
        const m = await sendMessage(peer, kind, body, peerViewing());
        // RF-2: the Realtime echo of this message has the same id, so it merges into one.
        setMessages((prev) => mergeMessages(prev, [m]));
        applyMessage(me, m);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        if (kind === "nudge") busy.current.nudge = false;
      }
    },
    [me, peer, messages],
  );

  const loadOlder = useCallback(async () => {
    const oldest = messages[0];
    if (!oldest || busy.current.older || busy.current.done) return;
    busy.current.older = true;
    try {
      const page = await loadMessages(peer, oldest.createdAt);
      busy.current.done = page.length < PAGE_SIZE;
      setMessages((prev) => mergeMessages(prev, page));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busy.current.older = false;
    }
  }, [peer, messages]);

  const setTyping = useCallback((on: boolean) => typingChannel.current?.setTyping(on), []);

  const report = useCallback(async (id: string) => {
    try {
      await reportMessage(id);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }, []);

  return { messages, peerReadAt, typing, nudges, error, send, loadOlder, setTyping, report };
}
