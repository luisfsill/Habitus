import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated";

import { ANIMATED } from "./stickers/animated";

/** How long a sticker dances in the middle of the screen before it leaves only its still in the chat. */
export const DANCE_MS = 3000;

/**
 * An animated sticker dancing big over the chat, like an MSN wink; it never blocks touches and calls
 * `onDone` when it is over. Give it a new `key` for each dance.
 */
export function StickerDance({ id, onDone }: { id: string; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const size = Math.min(width, height) * 0.7;
  const art = ANIMATED[id];

  useEffect(() => {
    const timer = setTimeout(onDone, art ? DANCE_MS : 0);
    return () => clearTimeout(timer);
  }, [art, onDone]);

  if (!art) return null;
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      entering={ZoomIn.springify()}
      exiting={FadeOut.duration(250)}
      style={styles.stage}>
      <Image source={art.dance} style={{ width: size, height: size, maxWidth: 360, maxHeight: 360 }} contentFit="contain" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", zIndex: 10 },
});
