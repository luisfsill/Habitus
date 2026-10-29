import { useCallback, useEffect, useState } from "react";

import type { Message } from "@/domain/chat";
import { stickerToDance } from "@/domain/stickers";
import { playSticker } from "@/services/sound";
import { loadStickerSeen, saveStickerSeen } from "@/services/storage";

// shortcut: a chat never opened since stickers dance has no record, so only the last 10 min dance; keep a server-side read time if that misses.
const FIRST_OPEN_WINDOW_MS = 10 * 60_000;

/**
 * The animated sticker dancing over the chat with `peer`: each new one (sent, received live or waiting
 * since the chat was last open) dances once, with its sound cut after `ms`. Call `done` when it ends.
 */
export function useStickerDance(peer: string, messages: readonly Message[], ms: number) {
  // When the last sticker danced in this chat; undefined while reading it.
  const [seen, setSeen] = useState<string | undefined>(undefined);

  useEffect(() => {
    let live = true;
    void loadStickerSeen(peer).then((at) => {
      if (live) setSeen(at ?? new Date(Date.now() - FIRST_OPEN_WINDOW_MS).toISOString());
    });
    return () => {
      live = false;
    };
  }, [peer]);

  const dancing = seen === undefined ? null : stickerToDance(messages, seen);
  const id = dancing?.body ?? null;
  const at = dancing?.createdAt ?? null;

  useEffect(() => {
    if (id) playSticker(id, ms);
  }, [id, at, ms]);

  const done = useCallback(() => {
    if (at === null) return;
    setSeen(at);
    void saveStickerSeen(peer, at);
  }, [peer, at]);

  return { dance: dancing ? { id: dancing.body, key: dancing.id } : null, done };
}
