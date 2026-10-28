import { useCallback, useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { AppText } from "@/components/app-text";
import { PaymentDetail } from "@/components/payment-detail";
import { PaymentMethodPicker } from "@/components/payment-method";
import { PaymentRow } from "@/components/payment-row";
import { PrimaryButton } from "@/components/primary-button";
import { RevenueChart } from "@/components/revenue-chart";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { SegmentedTabs } from "@/components/segmented-tabs";
import { StatColumns } from "@/components/stat-columns";
import { formatPrice } from "@/domain/access";
import { type AdminPayment, type PaymentConfig, paymentSummary, revenueBars, type RevenuePoint } from "@/domain/payments";
import { adminPayments, adminRevenue, cancelPayment, confirmPayment, getPaymentConfig, recheckPayment, setPaymentConfig } from "@/services/payments";
import { confirm } from "@/state/use-sign-out";
import { space } from "@/theme";

type Period = "days" | "months";
type Filter = "all" | "paid" | "pending" | "closed";
const PERIODS: readonly { value: Period; label: string }[] = [
  { value: "days", label: "30 dias" },
  { value: "months", label: "12 meses" },
];
const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "paid", label: "Confirmados" },
  { value: "pending", label: "Pendentes" },
  { value: "closed", label: "Encerrados" },
];
const PAGE = 50;
// Pending orders are few (automatic ones expire in 30 min); counting up to the RPC's limit is enough.
const PENDING_MAX = 100;

function ErrorLine({ text }: { text: string | null }) {
  return text ? (
    <AppText variant="footnote" color="danger" accessibilityLiveRegion="polite">
      {text}
    </AppText>
  ) : null;
}

/** Manual or automatic Pix and the PagBank environment; each tap saves at once. */
function MethodSection({ version }: { version: number }) {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);
  useEffect(() => {
    getPaymentConfig()
      .then(setConfig)
      .catch((e: Error) => setNote({ text: e.message, error: true }));
  }, [version]);

  const save = async (key: "payment_mode" | "pagbank_env", next: PaymentConfig) => {
    const previous = config;
    setConfig(next);
    setNote({ text: "Salvando…", error: false });
    try {
      await setPaymentConfig(key, key === "payment_mode" ? next.mode : next.env);
      setNote({ text: "Salvo.", error: false });
    } catch (e) {
      setConfig(previous);
      setNote({ text: (e as Error).message, error: true });
    }
  };

  return (
    <Section title="Método de pagamento">
      <View style={styles.block}>
        {config && (
          <PaymentMethodPicker
            config={config}
            onMode={(mode) => void save("payment_mode", { ...config, mode })}
            onEnv={(env) => void save("pagbank_env", { ...config, env })}
          />
        )}
        {note && (
          <AppText variant="footnote" color={note.error ? "danger" : "secondaryLabel"} accessibilityLiveRegion="polite">
            {note.text}
          </AppText>
        )}
      </View>
    </Section>
  );
}

/** Period summary and revenue chart; both come from the server (confirmed production payments only). */
function RevenueSection({ version }: { version: number }) {
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<Period>("days");
  const [points, setPoints] = useState<RevenuePoint[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminRevenue(period)
      .then((pts) => {
        setPoints(pts);
        setSelected(period === "days" ? 29 : 11);
      })
      .catch((e: Error) => setError(e.message));
    adminPayments("pending", null, PENDING_MAX)
      .then((rows) => setPending(rows.length))
      .catch((e: Error) => setError(e.message));
  }, [period, version]);

  const summary = paymentSummary(points);
  const pendingText = pending === null ? "—" : pending >= PENDING_MAX ? `${PENDING_MAX}+` : String(pending);
  return (
    <Section title="Faturamento">
      <View style={styles.block}>
        <SegmentedTabs options={PERIODS} value={period} onChange={setPeriod} />
        <StatColumns
          columns={width >= 768 ? 4 : 2}
          stats={[
            { value: formatPrice(summary.cents), label: "Faturamento", color: "successText" },
            { value: String(summary.count), label: "Confirmados" },
            { value: pendingText, label: "Pendentes", color: "warm" },
            { value: formatPrice(summary.averageCents), label: "Ticket médio" },
          ]}
        />
        <RevenueChart bars={revenueBars(points, period, new Date())} selected={selected} onSelect={setSelected} />
        <AppText variant="footnote" color="secondaryLabel">
          Só pagamentos confirmados em Produção; os de Teste não contam.
        </AppText>
        <ErrorLine text={error} />
      </View>
    </Section>
  );
}

/** A history row that opens its detail in place and runs the pending actions. */
function PaymentItem({ payment: p, onChanged }: { payment: AdminPayment; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const act = async (run: (id: string) => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await run(p.id);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const who = p.name || p.email;
  return (
    <View style={styles.block}>
      <PaymentRow payment={p} expanded={open} onPress={() => setOpen((o) => !o)} />
      {open && (
        <PaymentDetail
          payment={p}
          busy={busy}
          onConfirm={() =>
            confirm("Confirmar pagamento?", `Soma ${p.days} dias à conta de ${who} (${p.planName}, ${formatPrice(p.amountCents)}).`, "Confirmar", () => void act(confirmPayment))
          }
          onCancel={() => confirm("Cancelar pedido?", `O pedido de ${who} sai dos pendentes e nenhum dia é somado.`, "Cancelar pedido", () => void act(cancelPayment))}
          onRecheck={() => void act(recheckPayment)}
        />
      )}
      <ErrorLine text={error} />
    </View>
  );
}

/** Every payment, newest first, 50 at a time. */
function HistorySection({ version, onChanged }: { version: number; onChanged: () => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [list, setList] = useState<AdminPayment[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminPayments(filter, null, PAGE)
      .then((rows) => {
        setList(rows);
        setMore(rows.length === PAGE);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [filter, version]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const rows = await adminPayments(filter, list.at(-1)?.createdAt ?? null, PAGE);
      setList((l) => [...l, ...rows]);
      setMore(rows.length === PAGE);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <Section title="Histórico">
        <SegmentedTabs options={FILTERS} value={filter} onChange={setFilter} />
        {list.map((p) => (
          // Keyed by status too, so a row that changed comes back closed with its new tags.
          <PaymentItem key={`${p.id}:${p.status}`} payment={p} onChanged={onChanged} />
        ))}
        {list.length === 0 && (
          <AppText variant="subheadline" color="secondaryLabel" align="center">
            {error ? "Não deu para carregar." : "Nenhum pagamento aqui."}
          </AppText>
        )}
      </Section>
      <ErrorLine text={error} />
      {more && <PrimaryButton label="Carregar mais" variant="tinted" onPress={() => void loadMore()} loading={loadingMore} />}
    </>
  );
}

export default function AdminPaymentsScreen() {
  // Bumped after an action: every section reloads.
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return (
    <Screen title="Pagamentos" subtitle="Como os membros pagam e o que já entrou" underHeader>
      <MethodSection version={version} />
      <RevenueSection version={version} />
      <HistorySection version={version} onChanged={reload} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md },
});
