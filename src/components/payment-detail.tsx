import { StyleSheet, View } from "react-native";

import { type AdminPayment, formatPaymentTime } from "@/domain/payments";
import { space } from "@/theme";

import { formatDate } from "./admin-user-row";
import { AppText } from "./app-text";
import { PrimaryButton } from "./primary-button";

interface Props {
  payment: AdminPayment;
  /** The screen asks before confirming; this runs the action. */
  onConfirm: () => void;
  onCancel: () => void;
  onRecheck: () => void;
  busy?: boolean;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="footnote" color="secondaryLabel">
        {label}
      </AppText>
      <AppText variant="footnote" selectable style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

/** What opens under a history row: contact, order code, dates and the actions a pending payment allows. */
export function PaymentDetail({ payment: p, onConfirm, onCancel, onRecheck, busy = false }: Props) {
  const pending = p.status === "pending";
  return (
    <View style={styles.wrap}>
      <Field label="E-mail" value={p.email || "—"} />
      <Field label="Usuário" value={p.username ? `@${p.username}` : "—"} />
      <Field label="Pedido" value={p.orderCode ?? p.pagbankOrderId ?? "—"} />
      <Field label="Criado em" value={formatPaymentTime(p.createdAt)} />
      <Field label="Pago em" value={p.paidAt ? formatPaymentTime(p.paidAt) : "—"} />
      <Field label="Liberado até" value={formatDate(p.grantedUntil)} />
      {pending && p.method === "manual" && (
        <View style={styles.actions}>
          <PrimaryButton label="Confirmar pagamento" onPress={onConfirm} loading={busy} />
          <PrimaryButton label="Cancelar" variant="plain" destructive onPress={onCancel} disabled={busy} />
        </View>
      )}
      {pending && p.method === "automatic" && (
        <View style={styles.actions}>
          <PrimaryButton label="Consultar no PagBank" variant="tinted" onPress={onRecheck} loading={busy} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, paddingLeft: 40 + space.md },
  field: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  value: { flexShrink: 1, textAlign: "right", fontVariant: ["tabular-nums"] },
  actions: { gap: space.sm, marginTop: space.sm },
});
