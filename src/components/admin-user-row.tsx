import { Pressable, StyleSheet, View } from "react-native";

import { accessStatus, displayName, type Profile, statusLabel } from "@/domain/access";
import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";

export type Grant = 30 | 90 | 365 | "unlimited";
const GRANTS: readonly { value: Grant; label: string }[] = [
  { value: 30, label: "+30" },
  { value: 90, label: "+90" },
  { value: 365, label: "+365" },
  { value: "unlimited", label: "∞" },
];

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

interface Props {
  profile: Profile;
  now: Date;
  onGrant: (grant: Grant) => void;
  onOpen: () => void;
  busy?: boolean;
}

/** One account in the admin list: who, status, validity and one-tap grants. */
export function AdminUserRow({ profile, now, onGrant, onOpen, busy }: Props) {
  const { colors } = useTheme();
  const status = accessStatus(profile, now);
  const tone = {
    admin: [colors.label, colors.fill],
    unlimited: [colors.accentText, colors.accentSoft],
    expired: [colors.danger, "rgba(248,113,113,0.16)"],
    trial: [colors.warm, "rgba(251,191,36,0.16)"],
    active: [colors.successText, colors.successSoft],
  }[status];
  const until = status === "expired" ? `venceu ${formatDate(profile.accessUntil)}` : status === "unlimited" || status === "admin" ? "" : `até ${formatDate(profile.accessUntil)}`;

  return (
    <View style={[styles.row, { opacity: busy ? 0.6 : 1 }]}>
      <Pressable style={styles.who} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Abrir ${displayName(profile)}`}>
        <AppText variant="headline" numberOfLines={1}>
          {displayName(profile)}
        </AppText>
        <AppText variant="footnote" color="secondaryLabel" numberOfLines={1}>
          {profile.email}
        </AppText>
        <View style={styles.statusLine}>
          <View style={[styles.pill, { backgroundColor: tone[1] }]}>
            <AppText variant="caption" style={{ color: tone[0], fontWeight: "700" }}>
              {statusLabel(profile, now)}
            </AppText>
          </View>
          {until ? <AppText variant="caption" color="secondaryLabel">{until}</AppText> : null}
        </View>
      </Pressable>
      <View style={styles.actions}>
        {GRANTS.map((g) => (
          <Pressable
            key={g.label}
            disabled={busy}
            onPress={() => onGrant(g.value)}
            accessibilityRole="button"
            accessibilityLabel={g.value === "unlimited" ? "Liberar acesso ilimitado" : `Liberar mais ${g.value} dias`}
            style={[styles.btn, { backgroundColor: colors.accentSoft }]}>
            <AppText variant="footnote" style={{ color: colors.accentText, fontWeight: "700" }}>
              {g.label}
            </AppText>
          </Pressable>
        ))}
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Configurar ${displayName(profile)}`} style={[styles.btn, { backgroundColor: colors.fill }]}>
          <Icon ios="gearshape" android="settings" size={18} color={colors.label} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  who: { flexGrow: 1, flexBasis: 220, gap: 2 },
  statusLine: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: 4 },
  pill: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
  actions: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  btn: { minWidth: 44, minHeight: 36, paddingHorizontal: space.sm, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
});
