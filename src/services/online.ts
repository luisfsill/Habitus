import { REALTIME_PRESENCE_LISTEN_EVENTS } from "@supabase/supabase-js";

import type { ChatStatus } from "@/domain/access";
import { type Presence, presenceOf } from "@/domain/chat";

import { openChannel } from "./chat";
import { log } from "./log";
import { serviceError } from "./profile";
import { requireSupabase } from "./supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Saves the status the person picked (all their devices read it from the profile). */
export async function setMyChatStatus(status: ChatStatus): Promise<void> {
  const { error } = await requireSupabase().rpc("set_my_chat_status", { new_status: status });
  if (error) throw serviceError(error);
}

/** Shows me on my own channel `online:<me>` as available or away; invisible (or no status) tracks nothing. */
export function shareMyPresence(me: string, status: "online" | "away"): () => void {
  if (!UUID.test(me)) return () => undefined;
  const id = me.toLowerCase();
  const topic = `online:${id}`;
  return openChannel(topic, () => {
    const channel = requireSupabase().channel(topic, { config: { private: true, presence: { key: id } } });
    return channel.subscribe((state, err) => {
      if (state === "SUBSCRIBED") void channel.track({ status });
      else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") log.warn(`presence channel ${state}`, err);
    });
  });
}

/** Listens to one friend's `online:<id>` channel; `onChange` gets green, yellow or red as it changes. */
export function watchPresence(friend: string, onChange: (presence: Presence) => void): () => void {
  if (!UUID.test(friend)) return () => undefined;
  const id = friend.toLowerCase();
  const topic = `online:${id}`;
  return openChannel(topic, () => {
    const channel = requireSupabase().channel(topic, { config: { private: true, presence: { key: id } } });
    return channel
      .on("presence", { event: REALTIME_PRESENCE_LISTEN_EVENTS.SYNC }, () => {
        onChange(presenceOf(channel.presenceState()[id] as { status?: unknown }[] | undefined));
      })
      .subscribe((state, err) => {
        if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") log.warn(`presence watch ${state}`, err);
      });
  });
}
