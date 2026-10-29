import type { ReactNode } from "react";
import { Image, StyleSheet, View } from "react-native";

import { stickerLabel } from "@/domain/stickers";

import { AppText } from "./app-text";
import { ANIMATED } from "./stickers/animated";
import { FACES } from "./stickers/faces";
import { THINGS } from "./stickers/things";

/** The drawing of each retired sticker (RETIRED_STICKERS), by id: older messages still show them. */
export const STICKER_SOURCES: Record<string, (props: { size: number }) => ReactNode> = { ...FACES, ...THINGS };

/** A sticker in a square `size` box: an animated one shows its still; an unknown id (a newer app's) shows "Figurinha". */
export function StickerImage({ id, size }: { id: string; size: number }) {
  const label = stickerLabel(id);
  const still = ANIMATED[id]?.still;
  const Art = STICKER_SOURCES[id];
  return (
    <View accessible role="img" accessibilityLabel={label} style={[styles.box, { width: size, height: size }]}>
      {still !== undefined ? (
        <Image source={still} style={{ width: size, height: size }} />
      ) : Art ? (
        <Art size={size} />
      ) : (
        <AppText variant="footnote" color="secondaryLabel" align="center">{label}</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ box: { alignItems: "center", justifyContent: "center" } });
