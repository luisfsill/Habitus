import { useEffect, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";

import type { Presence } from "@/domain/chat";
import { shareMyPresence, watchPresence } from "@/services/online";

import { useAccess } from "./access";
import { useFriendIds } from "./use-friends";

// Each friend's green / yellow / red, shared by every avatar that shows it.
let presence: Record<string, Presence> = {};
const listeners = new Set<() => void>();
function set(id: string, next: Presence) {
  if (presence[id] === next) return;
  presence = { ...presence, [id]: next };
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** A friend's presence ring colour; unknown (not loaded yet) shows as offline. */
export function usePresence(id: string | undefined): Presence {
  return useSyncExternalStore(subscribe, () => (id ? (presence[id.toLowerCase()] ?? "offline") : "offline"));
}

/** Every friend's presence at once (a list of rows). */
export function usePresenceMap(): Record<string, Presence> {
  return useSyncExternalStore(subscribe, () => presence);
}

/** Whether the app is on screen: in the background (or closed) the person shows as offline. */
function useForeground(): boolean {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setActive(state === "active"));
    return () => sub.remove();
  }, []);
  return active;
}

/** Mounted once with the tabs: shows me on my channel by my chosen status and watches every friend's channel. */
export function useOnlineSharing() {
  const { profile, hasAccess } = useAccess();
  const foreground = useForeground();
  const friends = useFriendIds();
  const me = profile?.id;
  const status = profile?.chatStatus;

  useEffect(() => {
    if (!me || !hasAccess || !foreground || !status || status === "invisible") return;
    return shareMyPresence(me, status);
  }, [me, hasAccess, foreground, status]);

  useEffect(() => {
    if (!me || !hasAccess || friends === "") return;
    // shortcut: one channel per friend; Realtime allows about 100 per connection, move to a shared topic past that.
    const stops = friends.split(",").map((id) => watchPresence(id, (p) => set(id, p)));
    return () => {
      stops.forEach((stop) => stop());
      presence = {};
      listeners.forEach((l) => l());
    };
  }, [me, hasAccess, friends]);
}
