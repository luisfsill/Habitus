import { Modal, Pressable, StyleSheet, View } from "react-native";

import { HIT, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Glass } from "./glass";
import { Icon } from "./icon";

export interface SheetOption {
  label: string;
  icon: { ios: string; android: string };
  destructive?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  title: string;
  options: readonly SheetOption[];
  onClose: () => void;
}

/** A short list of actions over a dimmed screen (like Instagram's "Seguindo" menu); picking one closes it first. */
export function OptionsSheet({ visible, title, options, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <Glass style={[styles.card, { backgroundColor: colors.background }]}>
          <AppText variant="footnote" color="secondaryLabel" align="center" accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
          {options.map((o) => {
            const tint = o.destructive ? colors.danger : colors.label;
            return (
              <Pressable
                key={o.label}
                onPress={() => {
                  onClose();
                  o.onPress();
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.option, { borderColor: colors.separator, opacity: pressed ? 0.6 : 1 }]}>
                <Icon ios={o.icon.ios} android={o.icon.android} size={20} color={tint} />
                <AppText variant="body" style={{ color: tint }}>
                  {o.label}
                </AppText>
              </Pressable>
            );
          })}
          <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.option, styles.cancel, { borderColor: colors.separator, opacity: pressed ? 0.6 : 1 }]}>
            <AppText variant="body" color="secondaryLabel">
              Cancelar
            </AppText>
          </Pressable>
        </Glass>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "flex-end", padding: space.lg, backgroundColor: "rgba(1,8,16,0.6)" },
  card: { width: "100%", maxWidth: 420, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs },
  title: { paddingBottom: space.sm },
  option: { minHeight: HIT + 4, flexDirection: "row", alignItems: "center", gap: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  cancel: { justifyContent: "center" },
});
