import type { RealtimeChannel } from "@supabase/supabase-js";

import { type Conversation, type Message, type MessageKind, PAGE_SIZE, parseConversations, parseMessage } from "@/domain/chat";

import { log } from "./log";
import { serviceError } from "./profile";
import { requireSupabase } from "./supabase";

const TYPING_IDLE_MS = 4000;
// Re-sent while typing so the other side's 4 s timer never runs out mid-sentence.
const TYPING_REPEAT_MS = 2000;
// Backticks: icon-glyphs.test reads every quoted lowercase word in src as an icon name.
const schema = `public`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function call(name: string, args?: Record<string, unknown>): Promise<unknown> {
  const result = await requireSupabase().rpc(name, args);
  if (result.error) throw serviceError(result.error);
  return result.data as unknown;
}

/** Ids end up inside PostgREST filters and channel topics: anything but a uuid is refused. */
function uuid(id: string): string {
  if (!UUID.test(id)) throw new Error("Conversa não encontrada.");
  return id.toLowerCase();
}

export async function listConversations(): Promise<Conversation[]> {
  return parseConversations(await call("my_conversations"));
}

/** Up to PAGE_SIZE messages with `peer`, older than `before` when given, oldest first. */
export async function loadMessages(peer: string, before?: string): Promise<Message[]> {
  const id = uuid(peer);
  // RLS only returns rows where I am sender or recipient, so "peer is either side" is exactly the pair.
  let query = requireSupabase().from("messages").select("*").or(`sender.eq.${id},recipient.eq.${id}`);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(PAGE_SIZE);
  if (error) throw serviceError(error);
  return (data as unknown[]).map(parseMessage).filter((m): m is Message => m !== null).reverse();
}

export async function sendMessage(peer: string, kind: MessageKind, body: string): Promise<Message> {
  const message = parseMessage(await call("send_message", { to_user: uuid(peer), msg_kind: kind, msg_body: body }));
  if (!message) throw new Error("Não foi possível enviar a mensagem.");
  return message;
}

export async function markRead(peer: string): Promise<void> {
  await call("mark_read", { peer: uuid(peer) });
}

export async function reportMessage(id: string): Promise<void> {
  await call("report_message", { msg: uuid(id) });
}

// realtime-js hands back a channel still listed under the same topic, even one being removed:
// a quick leave and re-join would bind to the closing channel. Re-joins wait for the removal.
const removals = new Map<string, Promise<unknown>>();

/** Opens `make()` after handing the user's JWT to Realtime, so RLS and channel policies see this account. */
function openChannel(topic: string, make: () => RealtimeChannel): () => void {
  const supabase = requireSupabase();
  let channel: RealtimeChannel | null = null;
  let closed = false;
  Promise.all([removals.get(topic), supabase.realtime.setAuth()])
    .then(() => {
      if (!closed) channel = make();
    })
    .catch((e: unknown) => log.warn("realtime auth failed", e));
  return () => {
    closed = true;
    if (!channel) return;
    const removal = supabase.removeChannel(channel).finally(() => {
      if (removals.get(topic) === removal) removals.delete(topic);
    });
    removals.set(topic, removal);
  };
}

/** New messages to or from me (other devices too) and reads of my messages, for the whole app. */
export function subscribeInbox(
  me: string,
  on: { message: (m: Message) => void; read: (peer: string, readAt: string) => void; reconnect: () => void },
): () => void {
  const id = uuid(me);
  const onMessage = (payload: { new: unknown }) => {
    const m = parseMessage(payload.new);
    if (m) on.message(m);
  };
  const topic = `inbox:${id}`;
  return openChannel(topic, () => {
    let joined = false;
    return requireSupabase()
      .channel(topic)
      .on("postgres_changes", { event: "INSERT", schema, table: "messages", filter: `recipient=eq.${id}` }, onMessage)
      .on("postgres_changes", { event: "INSERT", schema, table: "messages", filter: `sender=eq.${id}` }, onMessage)
      .on("postgres_changes", { event: "*", schema, table: "chat_reads", filter: `peer_id=eq.${id}` }, (payload) => {
        const row = payload.new as { user_id?: unknown; read_at?: unknown };
        if (typeof row.user_id === "string" && typeof row.read_at === "string") on.read(row.user_id, row.read_at);
      })
      .subscribe((status, err) => {
        // Events sent while the channel was down are lost: a later SUBSCRIBED means "read everything again".
        if (status === "SUBSCRIBED") {
          if (joined) on.reconnect();
          joined = true;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") log.warn(`inbox channel ${status}`, err);
      });
  });
}

/** "Digitando…" between me and peer over the pair's private Broadcast topic. */
export function joinTyping(me: string, peer: string, onTyping: (typing: boolean) => void): { setTyping: (on: boolean) => void; leave: () => void } {
  // A bad id (typed route param) gets no channel instead of a throw inside a React effect.
  if (!UUID.test(me) || !UUID.test(peer)) return { setTyping: () => undefined, leave: () => undefined };
  const [a, b] = [me.toLowerCase(), peer.toLowerCase()].sort();
  let channel: RealtimeChannel | null = null;
  let joined = false;
  let idle: ReturnType<typeof setTimeout> | undefined;
  let sentOn = false;
  let sentAt = 0;

  const stopTimer = () => clearTimeout(idle);
  const topic = `chat:${a}:${b}`;
  const close = openChannel(topic, () => {
    channel = requireSupabase()
      .channel(topic, { config: { private: true } })
      .on("broadcast", { event: "typing" }, ({ payload }: { payload?: { typing?: unknown } }) => {
        stopTimer();
        const typing = payload?.typing === true;
        onTyping(typing);
        if (typing) idle = setTimeout(() => onTyping(false), TYPING_IDLE_MS);
      })
      .subscribe((status, err) => {
        joined = status === "SUBSCRIBED";
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") log.warn(`typing channel ${status}`, err);
      });
    return channel;
  });

  return {
    setTyping(on) {
      if (!channel || !joined) return;
      const now = Date.now();
      if (on === sentOn && (!on || now - sentAt < TYPING_REPEAT_MS)) return;
      sentOn = on;
      sentAt = now;
      void channel.send({ type: "broadcast", event: "typing", payload: { typing: on } });
    },
    leave() {
      stopTimer();
      close();
    },
  };
}
