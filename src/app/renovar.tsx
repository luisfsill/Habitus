import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, Share, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Icon } from "@/components/icon";
import { PixQr } from "@/components/pix-qr";
import { PixReceipt } from "@/components/pix-receipt";
import { CpfStep, PixStep } from "@/components/pix-step";
import { PlanCard } from "@/components/plan-card";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { accessStatus, displayName, formatPrice, hasAccess as profileHasAccess, helpWhatsAppUrl, OWNER_PIX, type Plan, type Profile, renewWhatsAppUrl } from "@/domain/access";
import { formatPaymentTime } from "@/domain/payments";
import { pixPayload } from "@/domain/pix";
import { fetchPlans } from "@/services/profile";
import { useAccess } from "@/state/access";
import { useAuth } from "@/state/auth";
import { type PixStep as Step, usePixCheckout } from "@/state/pix-checkout";
import { space, ThemePreferenceContext, useTheme } from "@/theme";

const BENEFITS = ["As 6 dicas com lembretes no seu horário", "Água, lembretes e histórico", "Amigos e ranking da semana"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function ask(title: string, message: string, yes: string, onYes: () => void) {
  // Alert has no buttons on the web; the browser dialog stands in.
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(message)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: yes, style: "destructive", onPress: onYes },
  ]);
}

/** "Seu plano vale até 27 de novembro" and friends, for the line under the title. */
function planStatus(p: Profile | null, now: Date): string {
  if (!p) return "";
  const until = p.accessUntil ? new Date(p.accessUntil) : null;
  const day = until ? `${until.getDate()} de ${MONTHS[until.getMonth()]}` : "";
  return {
    admin: "Você é administrador: acesso sem prazo.",
    unlimited: "Seu acesso é ilimitado.",
    expired: day ? `${p.plan === "trial" ? "Seu teste grátis" : "Seu plano"} acabou em ${day}.` : "Seu acesso acabou.",
    trial: `Teste grátis até ${day}.`,
    active: `Seu plano vale até ${day}.`,
  }[accessStatus(p, now)];
}

/** Monthly saving of each plan against the shortest one. */
function savings(plans: readonly Plan[]): Record<string, number> {
  const base = [...plans].sort((a, b) => a.days - b.days)[0];
  if (!base) return {};
  const perDay = base.priceCents / base.days;
  return Object.fromEntries(plans.map((p) => [p.id, 1 - p.priceCents / p.days / perDay]));
}

/** The Pix step: QR, "copia e cola" and the order code, then the receipt goes over WhatsApp. */
function PayWithPix({ plan, order, code, notice }: { plan: Plan; order: string; code: string; notice: string | null }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
  };
  return (
    <View style={styles.pay}>
      <AppText variant="title2" align="center">
        Pague com Pix
      </AppText>
      <AppText variant="subheadline" color="secondaryLabel" align="center">
        {plan.name} · {formatPrice(plan.priceCents)}
      </AppText>
      {notice && (
        <AppText variant="footnote" color="secondaryLabel" align="center">
          {notice}
        </AppText>
      )}
      <PixQr value={code} size={232} />
      <PrimaryButton label={copied ? "Código copiado" : "Copiar Pix copia e cola"} variant="tinted" onPress={() => void copy()} />
      <View style={[styles.steps, { borderColor: colors.separator }]}>
        <AppText variant="subheadline">1. Abra o app do seu banco e pague pelo QR Code ou pelo código copiado.</AppText>
        <AppText variant="subheadline">2. Toque em &quot;Já paguei&quot; e envie o comprovante pelo WhatsApp.</AppText>
        <AppText variant="footnote" color="secondaryLabel">
          Pedido {order}. O app é liberado assim que o pagamento for confirmado.
        </AppText>
      </View>
    </View>
  );
}

/** The plan tiles and what every plan includes. */
function PlanPicker({ plans, selected, onSelect }: { plans: readonly Plan[]; selected: string | null; onSelect: (id: string) => void }) {
  const { colors } = useTheme();
  const saved = savings(plans);
  return (
    <>
      <View style={styles.list}>
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} selected={p.id === selected} saving={saved[p.id]} onSelect={() => onSelect(p.id)} />
        ))}
      </View>
      <View style={styles.list}>
        {BENEFITS.map((b) => (
          <View key={b} style={styles.benefit}>
            <Icon ios="checkmark.circle.fill" android="check_circle" size={18} color={colors.success} />
            <AppText variant="subheadline" style={styles.flex}>
              {b}
            </AppText>
          </View>
        ))}
      </View>
    </>
  );
}

/** "Já paguei", "Sair da conta" and "Excluir conta": only once access has ended, when this is the only screen. */
function Locked({ onRecheck, checking, onLeave, onRemove }: { onRecheck: () => void; checking: boolean; onLeave: () => void; onRemove: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.account, { borderColor: colors.separator }]}>
      <PrimaryButton variant="tinted" label="Já paguei, atualizar" onPress={onRecheck} loading={checking} />
      <PrimaryButton variant="plain" label="Sair da conta" onPress={onLeave} />
      <PrimaryButton variant="plain" destructive label="Excluir conta" onPress={onRemove} />
    </View>
  );
}

interface FooterProps {
  plan?: Plan;
  step: Step;
  onPay: () => void;
  onReceipt: () => void;
  onHelp: () => void;
  onCpf: () => void;
  onChange: () => void;
}

/** "Assinar <plano>"; on the Pix step "Já paguei, enviar comprovante" (or "Falar com a gente" when automatic) and "Trocar plano". */
function RenewFooter({ plan, step, onPay, onReceipt, onHelp, onCpf, onChange }: FooterProps) {
  if (step === "manual" || step === "auto" || step === "cpf") {
    return (
      <View style={styles.footer}>
        {step === "manual" && <PrimaryButton label="Já paguei, enviar comprovante" icon={{ ios: "bubble.left.and.bubble.right", android: "chat" }} onPress={onReceipt} glow />}
        {step === "cpf" && <PrimaryButton label="Gerar Pix" icon={{ ios: "creditcard", android: "payments" }} onPress={onCpf} glow />}
        {step === "auto" && <PrimaryButton label="Falar com a gente" variant="tinted" icon={{ ios: "bubble.left.and.bubble.right", android: "chat" }} onPress={onHelp} />}
        <PrimaryButton label="Trocar plano" variant="plain" onPress={onChange} />
      </View>
    );
  }
  return (
    <PrimaryButton
      label={plan ? `Assinar ${plan.name} · ${formatPrice(plan.priceCents)}` : "Escolha um plano"}
      icon={{ ios: "creditcard", android: "payments" }}
      onPress={onPay}
      disabled={!plan || step === "loading"}
      loading={step === "loading"}
      glow
    />
  );
}

/** While the Pix is being made (after "Assinar" or the CPF): a spinner instead of the plans. */
function Generating() {
  const { colors } = useTheme();
  return (
    <View style={styles.generating} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.accent} />
      <AppText variant="headline" align="center">
        Gerando o Pix…
      </AppText>
      <AppText variant="footnote" color="secondaryLabel" align="center">
        Leva só alguns segundos.
      </AppText>
    </View>
  );
}

/** What sits under the status line once "Assinar" is tapped: the CPF form or the Pix (automatic or manual). */
function PayBody({ plan, flow }: { plan: Plan; flow: ReturnType<typeof usePixCheckout> }) {
  if (flow.step === "cpf") return <CpfStep cpf={flow.cpf} error={flow.error} onChange={flow.setCpf} />;
  if (flow.step === "auto" && flow.auto) {
    return <PixStep plan={plan} qrText={flow.auto.qrText} secondsLeft={flow.secondsLeft} outcome={flow.outcome} cpf={flow.savedCpf} onChangeCpf={flow.changeCpf} onRetry={() => void flow.start(plan.id)} />;
  }
  if (!flow.order) return null;
  return <PayWithPix plan={plan} order={flow.order} code={pixPayload({ ...OWNER_PIX, amountCents: plan.priceCents, txid: flow.order })} notice={flow.notice} />;
}

/** Pix confirmed by the server: refresh the profile once and swap the page for the receipt. */
function usePaidReceipt(flow: ReturnType<typeof usePixCheckout>, plan: Plan | undefined, refresh: () => Promise<unknown>, hasAccess: boolean) {
  const paid = flow.outcome === "paid";
  useEffect(() => {
    if (paid) void refresh();
  }, [paid, refresh]);
  // Paid some other way while this screen was the only route (manual Pix released by the admin): go to the app,
  // there is nothing to go back to. After an automatic Pix the receipt stays until "Voltar ao Habitus".
  useEffect(() => {
    if (hasAccess && !router.canGoBack() && !paid) router.replace("/");
  }, [hasAccess, paid]);
  return paid && plan && flow.auto ? <PaidScreen plan={plan} paymentId={flow.auto.paymentId} /> : null;
}

/** After an automatic Pix: the receipt, "Recibo" to share it and "Voltar ao Habitus". */
function PaidScreen({ plan, paymentId }: { plan: Plan; paymentId: string }) {
  const { profile } = useAccess();
  const [paidAt] = useState(() => new Date().toISOString());
  const until = profile?.accessUntil && !profile.unlimited && profile.role !== "admin" ? new Date(profile.accessUntil) : null;
  const validUntil = until ? `${until.getDate()} de ${MONTHS[until.getMonth()]}` : null;
  const orderCode = paymentId.slice(0, 8).toUpperCase();
  const receipt = [
    "Habitus · recibo",
    `Plano ${plan.name} (${plan.days} dias)${validUntil ? `, até ${validUntil}` : ""}`,
    `Pago com Pix · ${formatPrice(plan.priceCents)}`,
    `Data: ${formatPaymentTime(paidAt)}`,
    `Pedido: ${orderCode}`,
  ].join("\n");
  const share = () => void Share.share({ message: receipt }).catch(() => Clipboard.setStringAsync(receipt));
  const footer = (
    <View style={styles.receiptActions}>
      <View style={styles.flex}>
        <PrimaryButton label="Recibo" variant="tinted" icon={{ ios: "square.and.arrow.up", android: "description" }} onPress={share} />
      </View>
      <View style={styles.wide}>
        <PrimaryButton label="Voltar ao Habitus" onPress={() => router.replace("/")} glow />
      </View>
    </View>
  );
  return (
    <Screen footer={footer}>
      <PixReceipt planName={plan.name} days={plan.days} validUntil={validUntil} price={formatPrice(plan.priceCents)} paidAt={formatPaymentTime(paidAt)} orderCode={orderCode} />
    </Screen>
  );
}

/** Plans and renewal by Pix. With access it sits on top of the app; once access ends it is the only screen. */
function RenewScreen() {
  const { colors } = useTheme();
  const { profile, hasAccess, refresh } = useAccess();
  const { signOut, deleteAccount } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const pixFlow = usePixCheckout();
  const { step, auto } = pixFlow;
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchPlans()
      .then((list) => {
        const active = list.filter((p) => p.active);
        setPlans(active);
        setSelected((active.find((p) => p.highlight) ?? active[0])?.id ?? null);
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);


  const plan = plans.find((p) => p.id === selected);
  const title = hasAccess ? "Planos" : profile?.plan === "trial" ? "Seu teste grátis acabou" : "Seu plano acabou";

  const sendReceipt = () => {
    if (!profile || !plan || !pixFlow.order) return;
    void Linking.openURL(renewWhatsAppUrl(displayName(profile), profile.email, plan, pixFlow.order));
  };

  const receipt = usePaidReceipt(pixFlow, plan, refresh, hasAccess);

  const recheck = async () => {
    setChecking(true);
    const fresh = await refresh();
    setChecking(false);
    if (fresh === null) setMessage("Sem conexão. Tente de novo em instantes.");
    else if (!profileHasAccess(fresh, new Date())) setMessage("Ainda não encontramos o pagamento. Assim que ele for confirmado, toque aqui de novo.");
  };

  // Without access the server refuses the upload anyway; unsent changes are lost either way.
  const leave = () => void signOut({ force: true });

  const remove = () =>
    ask("Excluir conta", "Excluir sua conta e todo o seu progresso? Não dá para desfazer.", "Excluir", () =>
      ask("Excluir conta", "Tem certeza? A conta será excluída agora.", "Excluir", () => {
        void deleteAccount().then((r) => setMessage(r.ok ? null : r.message));
      }),
    );

  if (receipt) return receipt;
  const footer = (
    <RenewFooter
      plan={plan}
      step={step}
      onPay={() => plan && void pixFlow.start(plan.id)}
      onReceipt={sendReceipt}
      onHelp={() => profile && auto && void Linking.openURL(helpWhatsAppUrl(displayName(profile), profile.email, auto.paymentId.slice(0, 8).toUpperCase()))}
      onCpf={() => plan && void pixFlow.submitCpf(plan.id)}
      onChange={pixFlow.reset}
    />
  );

  return (
    <Screen title={title} back={hasAccess ? { label: "Voltar", onPress: () => (router.canGoBack() ? router.back() : router.replace("/")) } : undefined} footer={footer}>
      <View style={[styles.status, { borderColor: colors.separator }]}>
        <Icon ios="calendar" android="calendar_month" size={20} color={colors.accent} />
        <AppText variant="subheadline" style={styles.flex}>
          {planStatus(profile, new Date())}
        </AppText>
      </View>
      {plan && step === "loading" ? (
        <Generating />
      ) : plan && step !== "idle" ? (
        <PayBody plan={plan} flow={pixFlow} />
      ) : (
        <PlanPicker plans={plans} selected={selected} onSelect={setSelected} />
      )}
      {message && (
        <AppText variant="footnote" color="secondaryLabel" align="center" accessibilityLiveRegion="polite">
          {message}
        </AppText>
      )}
      {!hasAccess && <Locked onRecheck={() => void recheck()} checking={checking} onLeave={leave} onRemove={remove} />}
    </Screen>
  );
}

export default function RenewRoute() {
  return (
    <ThemePreferenceContext.Provider value="dark">
      <RenewScreen />
    </ThemePreferenceContext.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wide: { flex: 2 },
  receiptActions: { flexDirection: "row", gap: space.sm },
  generating: { alignItems: "center", gap: space.sm, paddingVertical: space.xxl },
  status: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  list: { gap: space.sm },
  benefit: { flexDirection: "row", alignItems: "center", gap: space.sm },
  pay: { alignItems: "center", gap: space.md },
  steps: { alignSelf: "stretch", gap: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  footer: { gap: space.xs },
  account: { gap: space.xs, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
});
