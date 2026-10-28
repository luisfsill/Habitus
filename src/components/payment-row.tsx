import { Pressable, StyleSheet, View } from "react-native";

import { formatPrice } from "@/domain/access";
import { type AdminPayment, formatPaymentTime, STATUS_LABEL } from "@/domain/payments";
import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Avatar } from "./avatar";

interface Props {
  payment: AdminPayment;
  onPress: () => void;
  /** The detail below the row is open. */
  expanded?: boolean;
}

/** A coloured tag; with no fill it is drawn as an outline. */
function Pill({ label, fg, bg }: { label: string; fg: string; bg?: string }) {
  return (
    <View style={[styles.pill, bg ? { backgroundColor: bg } : { borderWidth: 1, borderColor: fg }]}>
      <AppText variant="caption" style={{ color: fg, fontWeight: "700" }}>
        {label}
      </AppText>
    </View>
  );
}

/** One payment in the admin history: who, plan, amount, when (Brasília), method and status tags. */
export function PaymentRow({ payment: p, onPress, expanded = false }: Props) {
  const { colors } = useTheme();
  const tone =
    p.status === "paid" ? [colors.successText, colors.successSoft] : p.status === "pending" ? [colors.warm, "rgba(251,191,36,0.16)"] : [colors.secondaryLabel, colors.fill];
  const method = p.method === "manual" ? "Manual" : "Automático";
  const name = p.name || p.email;
  const when = formatPaymentTime(p.createdAt);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${name}, ${p.planName}, ${formatPrice(p.amountCents)}, ${when}, ${method}, ${STATUS_LABEL[p.status]}${p.env === "sandbox" ? ", teste" : ""}`}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <Avatar url={p.avatarUrl} size={40} />
      <View style={styles.body}>
        <View style={styles.line}>
          <AppText variant="headline" numberOfLines={1} style={styles.flex}>
            {name}
          </AppText>
          <AppText variant="headline" style={styles.digits}>
            {formatPrice(p.amountCents)}
          </AppText>
        </View>
        <AppText variant="footnote" color="secondaryLabel" numberOfLines={1}>
          {p.planName} · {when}
        </AppText>
        <View style={styles.tags}>
          <Pill label={STATUS_LABEL[p.status]} fg={tone[0]} bg={tone[1]} />
          <Pill label={method} fg={colors.accentText} bg={colors.accentSoft} />
          {p.env === "sandbox" && <Pill label="Teste" fg={colors.warm} />}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  body: { flex: 1, gap: 2 },
  line: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
  flex: { flex: 1 },
  digits: { fontVariant: ["tabular-nums"] },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginTop: 4 },
  pill: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
});
