import { Pressable, StyleSheet, View } from "react-native";

import { STICKERS } from "@/domain/stickers";
import { HIT, space } from "@/theme";

import { StickerImage } from "./sticker-image";

/** The sticker pack as a grid; tapping one sends it. */
export function StickerPicker({ onPick, disabled }: { onPick: (id: string) => void; disabled?: boolean }) {
  return (
    <View style={styles.grid} accessibilityLabel="Figurinhas">
      {STICKERS.map((s) => (
        <Pressable
          key={s.id}
          onPress={() => onPick(s.id)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Mandar figurinha: ${s.label}`}
          accessibilityState={{ disabled: !!disabled }}
          style={({ pressed }) => [styles.cell, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}>
          <StickerImage id={s.id} size={52} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.xs, paddingVertical: space.sm },
  cell: { width: 60, height: 60, minWidth: HIT, minHeight: HIT, alignItems: "center", justifyContent: "center" },
});
