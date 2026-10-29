import type { Message } from "../chat";
import { stickerLabel, stickerToDance } from "../stickers";

const msg = (id: string, kind: Message["kind"], body: string, createdAt: string): Message => ({
  id,
  sender: "a",
  recipient: "b",
  kind,
  body,
  createdAt,
});

const history = [
  msg("1", "sticker", "festa", "2026-10-29T10:00:00Z"),
  msg("2", "text", "oi", "2026-10-29T10:01:00Z"),
  msg("3", "sticker", "coco", "2026-10-29T10:02:00Z"),
  msg("4", "sticker", "feliz", "2026-10-29T10:03:00Z"),
];

test("nothing danced yet in this chat: the history never dances", () => {
  expect(stickerToDance(history, null)).toBeNull();
});

test("dances the newest animated sticker after the last one danced", () => {
  expect(stickerToDance(history, "2026-10-29T09:00:00Z")?.id).toBe("3");
  expect(stickerToDance(history, "2026-10-29T10:01:30Z")?.id).toBe("3");
});

test("already danced, retired drawings and text never dance", () => {
  expect(stickerToDance(history, "2026-10-29T10:02:00Z")).toBeNull();
});

test("labels cover animated and retired stickers", () => {
  expect(stickerLabel("coco")).toBe("Cocô");
  expect(stickerLabel("feliz")).toBe("Feliz");
  expect(stickerLabel("nao-existe")).toBe("Figurinha");
});
