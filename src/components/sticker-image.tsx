import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { stickerLabel } from "@/domain/stickers";

import { AppText } from "./app-text";
import { FACES } from "./stickers/faces";
import { THINGS } from "./stickers/things";

/** The drawing of each sticker in STICKERS, by id. */
export const STICKER_SOURCES: Record<string, (props: { size: number }) => ReactNode> = { ...FACES, ...THINGS };

/** A sticker in a square `size` box; an unknown id (an older or newer app's sticker) shows "Figurinha". */
export function StickerImage({ id, size }: { id: string; size: number }) {
  const label = stickerLabel(id);
  const Art = STICKER_SOURCES[id];
  return (
    <View accessible role="img" accessibilityLabel={label} style={[styles.box, { width: size, height: size }]}>
      {Art ? <Art size={size} /> : <AppText variant="footnote" color="secondaryLabel" align="center">{label}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({ box: { alignItems: "center", justifyContent: "center" } });
