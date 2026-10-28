import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { type FriendsOverview, publicStats, type PublicUser, rankWeek, type RankRow } from "@/domain/friends";
import { normalizeQuery } from "@/domain/username";
import { log } from "@/services/log";
import { myFriends, searchUsers } from "@/services/social";

import { useAccess } from "./access";
import { useAppState } from "./app-state";

// The last overview read, shared so the tab bar badge follows what the Amigos tab shows.
let shared: FriendsOverview | null = null;
const listeners = new Set<() => void>();
function publish(next: FriendsOverview | null) {
  shared = next;
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
const snapshot = () => shared;

/** Pending friend requests, for the tab bar badge. Reads once when the tabs open; the Amigos tab keeps it fresh. */
export function useIncomingCount(): number {
  const overview = useSyncExternalStore(subscribe, snapshot);
  useEffect(() => {
    // The tabs mount again after a sign-in: never show the previous account's friends.
    publish(null);
    myFriends()
      .then(publish)
      .catch((e: unknown) => log.warn("could not read friends", e));
  }, []);
  return overview?.incoming.length ?? 0;
}

/** Friends, requests and the week's ranking (with the viewer's own row); reloads whenever the tab gains focus. */
export function useFriends() {
  const { profile } = useAccess();
  const { data } = useAppState();
  const overview = useSyncExternalStore(subscribe, snapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      publish(await myFriends());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const ranking = useMemo<RankRow[]>(() => {
    if (!overview || !profile) return [];
    const now = new Date();
    const stats = publicStats(data, now);
    const me = { id: profile.id, name: profile.name, username: profile.username ?? "", level: stats.level, weekXp: stats.weekXp };
    return rankWeek(me, overview.friends, now);
  }, [overview, profile, data]);

  return { overview, ranking, loading, error, reload };
}

/** People matching the typed name or @, 300 ms after typing stops; only the latest answer is shown. */
export function useUserSearch(enabled: boolean) {
  const [text, setText] = useState("");
  const [attempt, setAttempt] = useState(0);
  // Each answer carries the search it answers, so a slow, older reply never fills the list.
  const [answer, setAnswer] = useState<{ key: string; results?: PublicUser[]; error?: string } | null>(null);
  const q = normalizeQuery(text);
  const key = `${attempt}:${q}`;

  useEffect(() => {
    if (!enabled || q === "") return;
    let current = true;
    const timer = setTimeout(() => {
      searchUsers(q)
        .then((results) => current && setAnswer({ key, results }))
        .catch((e: Error) => current && setAnswer({ key, error: e.message }));
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [q, key, enabled]);

  const mine = answer?.key === key ? answer : null;
  return { text, setText, query: q, results: mine?.results ?? null, error: mine?.error ?? null, retry: () => setAttempt((n) => n + 1) };
}
