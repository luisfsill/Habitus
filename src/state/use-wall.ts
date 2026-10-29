import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { hasUnseenPosts, type PickedImage, type WallPost } from "@/domain/wall";
import { useAccess } from "@/state/access";
import { loadFeedSeen, saveFeedSeen } from "@/services/storage";
import { deleteWallPost, editWallPost, postOnWall, wallFeed, wallOf } from "@/services/wall";

/**
 * A mural (`owner` = account id) or, with "feed", the friends' murals and one's own. Reloads on focus and,
 * with `pollMs`, again every `pollMs` while the screen stays focused.
 */
export function useWall(owner: string | "feed", pollMs?: number) {
  const me = useAccess().profile?.id ?? "";
  const [posts, setPosts] = useState<WallPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    () =>
      (owner === "feed" ? wallFeed() : wallOf(owner))
        .then((next) => {
          setPosts(next);
          setError(null);
        })
        .catch((e: Error) => setError(e.message)),
    [owner],
  );
  useFocusEffect(
    useCallback(() => {
      void reload();
      if (!pollMs) return;
      const timer = setInterval(() => void reload(), pollMs);
      return () => clearInterval(timer);
    }, [reload, pollMs]),
  );

  /** Throws the server's message (shown by the composer). */
  const publish = async (target: string, body: string, image?: PickedImage | null) => {
    const post = await postOnWall(me, target, body, image);
    setPosts((current) => [post, ...(current ?? [])]);
  };
  /** Throws the server's message (shown by the card being edited). */
  const edit = async (post: WallPost, body: string) => {
    const next = await editWallPost(post.id, body);
    setPosts((current) => current?.map((p) => (p.id === next.id ? next : p)) ?? null);
  };
  const remove = (post: WallPost) =>
    deleteWallPost(post)
      .then(() => setPosts((current) => current?.filter((p) => p.id !== post.id) ?? null))
      .catch((e: Error) => setError(e.message));

  return { posts, error, publish, edit, remove };
}

/**
 * The Feed tab's red dot: on while someone else posted since `me` last had the tab `open`. Opening it marks the
 * newest post as seen; the first load ever only sets that baseline, so old posts never light it.
 */
export function useFeedDot(me: string, posts: readonly WallPost[] | null, open: boolean): boolean {
  // undefined while the stored time loads.
  const [seen, setSeen] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void loadFeedSeen(me).then((at) => live && setSeen(at));
    return () => {
      live = false;
    };
  }, [me]);
  const newest = posts?.[0]?.createdAt ?? null;
  useEffect(() => {
    if (!posts || seen === undefined || !(open || seen === null)) return;
    const at = newest ?? new Date().toISOString();
    if (at === seen) return;
    void saveFeedSeen(me, at).then(() => setSeen(at));
  }, [me, posts, newest, seen, open]);
  return !open && !!posts && seen != null && hasUnseenPosts(posts, seen, me);
}
