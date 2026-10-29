import { RETIRED_STICKERS, STICKERS } from "@/domain/stickers";

import { STICKER_SOURCES } from "../sticker-image";
import { ANIMATED } from "../stickers/animated";

test("every sticker in the picker is animated and every animation belongs to one", () => {
  expect(Object.keys(ANIMATED).sort()).toEqual(STICKERS.map((s) => s.id).sort());
});

test("every retired sticker keeps its drawing and every drawing belongs to one", () => {
  expect(Object.keys(STICKER_SOURCES).sort()).toEqual(RETIRED_STICKERS.map((s) => s.id).sort());
});
