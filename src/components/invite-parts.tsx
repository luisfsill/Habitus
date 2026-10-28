import { useState } from "react";
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type Invite, inviteStatus, type InviteStatus, licenseLabel } from "@/domain/invites";
import { radius, space, useTheme } from "@/theme";

import { formatDate } from "./admin-user-row";
import { AppText } from "./app-text";
import { Glass } from "./glass";
import { Icon } from "./icon";
import { PrimaryButton } from "./primary-button";

const STATUS: Record<InviteStatus, { label: string; color: "accentText" | "successText" | "secondaryLabel" }> = {
  pending: { label: "Aguardando", color: "accentText" },
  used: { label: "Usado", color: "successText" },
  expired: { label: "Vencido", color: "secondaryLabel" },
};

function RoundButton({ label, icon, danger, onPress }: { label: string; icon: { ios: string; android: string }; danger?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.round, { backgroundColor: danger ? "rgba(248,113,113,0.14)" : colors.accentSoft, opacity: pressed ? 0.6 : 1 }]}>
      <Icon ios={icon.ios} android={icon.android} size={20} color={danger ? colors.danger : colors.accentText} />
    </Pressable>
  );
}

/** One invite: code, license and status on the left, message and delete buttons on the right. */
export function InviteRow({ invite, now, onOpen, onDelete }: { invite: Invite; now: Date; onOpen: () => void; onDelete: () => void }) {
  const { colors } = useTheme();
  const status = inviteStatus(invite, now);
  const when = status === "used" ? `em ${formatDate(invite.usedAt)}` : status === "pending" ? `até ${formatDate(invite.expiresAt)}` : "";
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <AppText variant="headline" selectable numberOfLines={1} style={styles.code}>
          {invite.code}
        </AppText>
        <View style={styles.meta}>
          <View style={[styles.pill, { backgroundColor: colors.accentSoft }]}>
            <AppText variant="caption" color="accentText" style={styles.bold}>
              {licenseLabel(invite.days)}
            </AppText>
          </View>
          <AppText variant="footnote" color={STATUS[status].color} numberOfLines={1} style={styles.shrink}>
            {STATUS[status].label} {when}
          </AppText>
        </View>
        {invite.user && (
          <AppText variant="footnote" color="secondaryLabel" selectable numberOfLines={2}>
            {[invite.user.name, invite.user.email].filter(Boolean).join(" · ")}
          </AppText>
        )}
      </View>
      {status === "pending" && <RoundButton label={`Ver mensagem do convite ${invite.code}`} icon={{ ios: "bubble.left", android: "chat" }} onPress={onOpen} />}
      <RoundButton label={`Excluir convite ${invite.code}`} icon={{ ios: "trash", android: "delete" }} danger onPress={onDelete} />
    </View>
  );
}

/** The ready message over a dimmed page, with copy (web) and WhatsApp. */
export function InviteMessageModal({ message, onClose }: { message: string | null; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const close = () => {
    setCopied(false);
    onClose();
  };
  // shortcut: copies only on the web (no clipboard module installed); native shares via WhatsApp.
  const copy = () => void navigator.clipboard?.writeText(message ?? "").then(() => setCopied(true));
  return (
    <Modal visible={message !== null} transparent animationType="fade" onRequestClose={close}>
      {/* Near the top and clear of the floating tab bar, which stays drawn over the page on the web. */}
      <View style={[styles.backdrop, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + NAVBAR_ROOM }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Fechar" />
        <Glass style={[styles.card, { backgroundColor: colors.background }]}>
          <View style={styles.head}>
            <AppText variant="title3" style={styles.bold}>
              Mensagem do convite
            </AppText>
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8} style={[styles.close, { backgroundColor: colors.accentSoft }]}>
              <Icon ios="xmark" android="close" size={18} color={colors.label} />
            </Pressable>
          </View>
          <ScrollView style={[styles.message, { backgroundColor: colors.surface, borderColor: colors.glassEdge }]} contentContainerStyle={styles.messageInner}>
            <AppText variant="subheadline" selectable>
              {message}
            </AppText>
          </ScrollView>
          <View style={styles.buttons}>
            {Platform.OS === "web" && <PrimaryButton label={copied ? "Copiado ✓" : "Copiar mensagem"} onPress={copy} />}
            <PrimaryButton label="Enviar pelo WhatsApp" variant="tinted" onPress={() => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message ?? "")}`)} />
          </View>
        </Glass>
      </View>
    </Modal>
  );
}

/** Floating tab bar (about 64 pt) plus its 18 pt gap and a little air. */
const NAVBAR_ROOM = 100;

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 6, minWidth: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.sm },
  code: { letterSpacing: 1.5, fontVariant: ["tabular-nums"] },
  meta: { flexDirection: "row", alignItems: "center", gap: space.sm },
  pill: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
  bold: { fontWeight: "700" },
  shrink: { flexShrink: 1 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, alignItems: "center", justifyContent: "flex-start", paddingHorizontal: space.lg, backgroundColor: "rgba(1,8,16,0.72)" },
  card: { width: "100%", maxWidth: 440, flexShrink: 1, padding: space.lg, gap: space.md },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  message: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, flexGrow: 0, flexShrink: 1 },
  messageInner: { padding: space.md },
  buttons: { gap: space.sm },
});
