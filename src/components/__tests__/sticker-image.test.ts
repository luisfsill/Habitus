import { STICKERS } from "@/domain/stickers";

import { STICKER_SOURCES } from "../sticker-image";

test("every sticker id has art and every drawing belongs to a sticker", () => {
  expect(Object.keys(STICKER_SOURCES).sort()).toEqual(STICKERS.map((s) => s.id).sort());
});
