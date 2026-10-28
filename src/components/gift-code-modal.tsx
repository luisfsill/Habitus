import { Modal, Pressable, StyleSheet, View } from "react-native";

import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Glass } from "./glass";
import { Icon } from "./icon";
import { RedeemCode } from "./redeem-code";

interface Props {
  visible: boolean;
  onClose: () => void;
  onRedeem: (code: string) => Promise<number | null>;
}

/** "Gift Code" from the account menu: the code an admin sent, redeemed over a dimmed page. */
export function GiftCodeModal({ visible, onClose, onRedeem }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <Glass style={[styles.card, { backgroundColor: colors.background }]}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8} style={[styles.close, { backgroundColor: colors.accentSoft }]}>
            <Icon ios="xmark" android="close" size={18} color={colors.label} />
          </Pressable>
          <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
            <Icon ios="gift.fill" android="redeem" size={36} color={colors.accent} />
          </View>
          <AppText variant="title3" align="center">
            Gift Code
          </AppText>
          <AppText variant="subheadline" color="secondaryLabel" align="center">
            Digite o código que você recebeu. Os dias entram na hora no seu plano.
          </AppText>
          <RedeemCode onRedeem={onRedeem} onDone={onClose} />
        </Glass>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg, backgroundColor: "rgba(1,8,16,0.72)" },
  card: { width: "100%", maxWidth: 400, padding: space.xl, gap: space.md },
  close: { position: "absolute", top: space.md, right: space.md, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", zIndex: 1 },
  badge: { alignSelf: "center", width: 72, height: 72, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
