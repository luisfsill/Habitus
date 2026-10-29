import { normalizeSearch, photoLink } from "./access";
import { isRow, num, str } from "./friends";
import { MONTHS, addDays, dayKey } from "./time";

export type MessageKind = "text" | "sticker" | "nudge";
export interface Message { id: string; sender: string; recipient: string; kind: MessageKind; body: string; createdAt: string }
export interface ChatPeer { id: string; name: string; username: string; level: number; avatarUrl: string | null }
export interface Conversation { peer: ChatPeer; friends: boolean; last: Message | null; unread: number; peerReadAt: string | null }
export interface DayGroup { day: string; label: string; messages: Message[] }

export const MAX_TEXT = 2000;
export const NUDGE_COOLDOWN_MS = 30_000;
export const PAGE_SIZE = 50;

const KINDS: readonly string[] = ["text", "sticker", "nudge"];
const ms = (iso: string) => new Date(iso).getTime();

export function parseMessage(row: unknown): Message | null {
  if (!isRow(row)) return null;
  const { id, sender, recipient, kind, body, created_at } = row;
  if (!str(id) || !str(sender) || !str(recipient) || !str(created_at) || typeof body !== "string") return null;
  if (typeof kind !== "string" || !KINDS.includes(kind)) return null;
  return { id, sender, recipient, kind: kind as MessageKind, body, createdAt: created_at };
}

function parsePeer(row: unknown): ChatPeer | null {
  if (!isRow(row)) return null;
  const { id, name, username, level, avatar_url } = row;
  if (!str(id) || typeof name !== "string" || !str(username) || !num(level)) return null;
  return { id, name, username, level, avatarUrl: photoLink(avatar_url) };
}

function parseConversation(row: unknown): Conversation | null {
  if (!isRow(row)) return null;
  const peer = parsePeer(row.peer);
  const { friends, last, unread, peer_read_at } = row;
  if (!peer || typeof friends !== "boolean" || !num(unread) || (peer_read_at !== null && !str(peer_read_at))) return null;
  const lastMsg = last === null ? null : parseMessage(last);
  if (last !== null && !lastMsg) return null;
  return { peer, friends, last: lastMsg, unread, peerReadAt: peer_read_at };
}

export function parseConversations(value: unknown): Conversation[] {
  return Array.isArray(value) ? value.map(parseConversation).filter((c): c is Conversation => c !== null) : [];
}

export function previewOf(m: Message, me: string): string {
  const mine = m.sender === me;
  if (m.kind === "sticker") return "Figurinha";
  if (m.kind === "nudge") return mine ? "Você chamou a atenção" : "Chamou sua atenção!";
  const text = m.body.replace(/\s+/g, " ").trim();
  return mine ? `Você: ${text}` : text;
}

export function groupByDay(messages: readonly Message[], today: Date): DayGroup[] {
  const todayKey = dayKey(today);
  const yesterdayKey = dayKey(addDays(today, -1));
  const out: DayGroup[] = [];
  for (const m of [...messages].sort((a, b) => ms(a.createdAt) - ms(b.createdAt))) {
    const d = new Date(m.createdAt);
    const day = dayKey(d);
    const last = out[out.length - 1];
    if (last?.day === day) { last.messages.push(m); continue; }
    const base = `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
    const label = day === todayKey ? "Hoje" : day === yesterdayKey ? "Ontem" : d.getFullYear() === today.getFullYear() ? base : `${base} de ${d.getFullYear()}`;
    out.push({ day, label, messages: [m] });
  }
  return out;
}

/** Last message of mine the peer has read, to show "Visto" under it. */
export function seenMessageId(messages: readonly Message[], me: string, peerReadAt: string | null): string | null {
  if (!peerReadAt) return null;
  const read = ms(peerReadAt);
  let best: Message | null = null;
  for (const m of messages) {
    if (m.sender === me && ms(m.createdAt) <= read && (!best || ms(m.createdAt) >= ms(best.createdAt))) best = m;
  }
  return best?.id ?? null;
}

/** Milliseconds until I can nudge again (0 = now). */
export function nudgeWaitMs(messages: readonly Message[], me: string, now: Date): number {
  let last = -Infinity;
  for (const m of messages) if (m.kind === "nudge" && m.sender === me) last = Math.max(last, ms(m.createdAt));
  return Math.max(0, NUDGE_COOLDOWN_MS - (now.getTime() - last));
}

/** Union by id (Realtime echo + send result + page reload), oldest first. */
export function mergeMessages(current: readonly Message[], incoming: readonly Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const m of [...current, ...incoming]) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
}

export function textProblem(text: string): string | null {
  if (text.trim() === "") return "Escreva uma mensagem.";
  if ([...text].length > MAX_TEXT) return `Mensagem muito longa (máx. ${MAX_TEXT}).`;
  return null;
}

export const unreadTotal = (conversations: readonly Conversation[]): number => conversations.reduce((s, c) => s + c.unread, 0);

/** The friends a typed name or @ points at (accents and case ignored); an empty search lists them all. */
export function filterFriends<T extends { name: string; username: string }>(friends: readonly T[], query: string): T[] {
  const q = normalizeSearch(query).replace(/^@/, "");
  return friends.filter((f) => !q || normalizeSearch(f.name).includes(q) || f.username.toLowerCase().includes(q));
}

/** What a friend sees: green, yellow or red. */
export type Presence = "online" | "away" | "offline";

/** A friend's presence from what they track on their channel; nothing tracked (app closed, or invisible) is offline. */
export function presenceOf(tracked: readonly { status?: unknown }[] | undefined): Presence {
  if (!tracked || tracked.length === 0) return "offline";
  // Several devices: any one available wins over away.
  return tracked.some((t) => t.status === "online") ? "online" : tracked.some((t) => t.status === "away") ? "away" : "offline";
}
