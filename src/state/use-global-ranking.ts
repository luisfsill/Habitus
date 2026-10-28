import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import type { Relation } from "@/domain/friends";
import type { GlobalRanking, GlobalRow } from "@/domain/ranking";
import { dayKey } from "@/domain/time";
import { fetchGlobalRanking, sendFriendRequest } from "@/services/social";

const withRelation = (r: GlobalRow, id: string, relation: Relation): GlobalRow => (r.id === id ? { ...r, relation } : r);

/** The week's global top (plus the viewer's own row); reloads whenever the screen gains focus. */
export function useGlobalRanking() {
  const [ranking, setRanking] = useState<GlobalRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRanking(await fetchGlobalRanking(dayKey(new Date())));
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

  const request = useCallback(async (id: string) => {
    setRequesting(id);
    try {
      const relation = (await sendFriendRequest(id)) === "accepted" ? "friends" : "outgoing";
      setRanking((r) => r && { top: r.top.map((x) => withRelation(x, id, relation)), me: r.me && withRelation(r.me, id, relation) });
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRequesting(null);
    }
  }, []);

  return { ranking, loading, error, reload, requesting, request };
}
