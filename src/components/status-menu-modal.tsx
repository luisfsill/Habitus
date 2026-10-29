import { Modal, Pressable, StyleSheet, View } from "react-native";

import type { ChatStatus } from "@/domain/access";
import { HIT, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { PRESENCE_COLORS } from "./avatar";
import { Glass } from "./glass";
import { Icon } from "./icon";

const OPTIONS: readonly { value: ChatStatus; label: string; detail: string; color: string }[] = [
  { value: "online", label: "Disponível", detail: "Seus amigos veem você online.", color: PRESENCE_COLORS.online },
  { value: "away", label: "Ausente", detail: "Online, mas sem responder agora.", color: PRESENCE_COLORS.away },
  { value: "invisible", label: "Invisível", detail: "Você aparece offline para todos.", color: PRESENCE_COLORS.invisible },
];

interface Props {
  visible: boolean;
  current: ChatStatus;
  busy: boolean;
  onPick: (status: ChatStatus) => void;
  onClose: () => void;
}

/** "Meu status" (MSN-like): Disponível, Ausente or Invisível, the current one checked. */
export function StatusMenuModal({ visible, current, busy, onPick, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <Glass style={[styles.card, { backgroundColor: colors.background }]}>
          <AppText variant="title3" accessibilityRole="header">
            Meu status
          </AppText>
          {OPTIONS.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => onPick(o.value)}
              disabled={busy}
              accessibilityRole="radio"
              accessibilityState={{ checked: o.value === current, disabled: busy }}
              accessibilityLabel={`${o.label}. ${o.detail}`}
              style={({ pressed }) => [styles.option, { opacity: pressed || busy ? 0.6 : 1 }]}>
              <View style={[styles.dot, { backgroundColor: o.color }]} />
              <View style={styles.grow}>
                <AppText variant="body">{o.label}</AppText>
                <AppText variant="footnote" color="secondaryLabel">
                  {o.detail}
                </AppText>
              </View>
              {o.value === current && <Icon ios="checkmark" android="check" size={20} color={colors.accent} />}
            </Pressable>
          ))}
        </Glass>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg, backgroundColor: "rgba(1,8,16,0.72)" },
  card: { width: "100%", maxWidth: 380, padding: space.lg, gap: space.sm },
  option: { minHeight: HIT, flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.xs },
  dot: { width: 14, height: 14, borderRadius: radius.pill },
  grow: { flex: 1 },
});
