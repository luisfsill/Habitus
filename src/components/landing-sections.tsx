import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { formatPrice } from "@/domain/access";
import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { GAINS } from "./benefits";
import { Icon } from "./icon";
import { Reveal, SurfaceButton } from "./surface-parts";

// shortcut: prices mirror supabase/admin.sql; the plans table is readable only when signed in. Open it to anon if admins change prices often.
const PLANS = [
  { name: "Mensal", days: 30, cents: 990 },
  { name: "Trimestral", days: 90, cents: 2490 },
  { name: "Anual", days: 365, cents: 7990, highlight: true },
] as const;

const STEPS = [
  { title: "Crie sua conta", text: "Nome, e-mail e senha. Os 7 primeiros dias são grátis, sem cartão." },
  { title: "Escolha seu horário", text: "Diga quando seu dia começa e termina e a hora em que você dorme." },
  { title: "Receba as dicas", text: "O Habitus avisa cada dica na hora certa. Cada uma leva até 2 minutos." },
] as const;

const FEATURES = [
  { icon: { ios: "bell.badge", android: "notifications_active" }, title: "Lembretes na hora certa", text: "Distribuídos ao longo do seu dia, sem você precisar lembrar." },
  { icon: { ios: "trophy", android: "emoji_events" }, title: "XP, faixas e medalhas", text: "Cada dica feita conta. Suba de nível e mantenha a sequência." },
  { icon: { ios: "calendar", android: "calendar_month" }, title: "Histórico do mês", text: "Veja num calendário os dias completos e os parciais." },
  { icon: { ios: "icloud", android: "cloud_done" }, title: "Na sua conta", text: "Seu progresso fica salvo e aparece em qualquer aparelho." },
  { icon: { ios: "drop.fill", android: "water_drop" }, title: "Lembrete de água", text: "Defina sua meta de copos e receba avisos para beber água." },
  { icon: { ios: "iphone", android: "smartphone" }, title: "Sem loja de apps", text: "Instale pelo navegador do celular em poucos segundos." },
] as const;

const FAQ = [
  { q: "Preciso de cartão para testar?", a: "Não. Você cria a conta e usa tudo por 7 dias, sem cartão." },
  { q: "Quais são as 6 dicas?", a: "É surpresa: você descobre ao entrar no app, uma de cada vez, ao longo do dia." },
  { q: "Funciona no celular?", a: "Sim. Abra o site no celular e toque em Instalar agora. O Habitus vira um app na sua tela inicial." },
  { q: "Como funciona a renovação?", a: "Os planos são por tempo e não renovam sozinhos. Para renovar, você escolhe um plano e fala com a gente pelo WhatsApp." },
] as const;

interface BlockProps {
  id: string;
  kicker: string;
  title: string;
  children: ReactNode;
}

/** A landing section: small label, big title, content. `id` is the anchor the nav scrolls to. */
export function Block({ id, kicker, title, children }: BlockProps) {
  return (
    <View nativeID={id} style={styles.block}>
      <AppText variant="footnote" color="accentText" style={styles.kicker}>
        {kicker.toUpperCase()}
      </AppText>
      <AppText variant="title1" accessibilityRole="header" style={styles.blockTitle}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

/** Cells laid out in `columns`, split by hairlines like the app's stat columns. */
function Grid({ columns, children }: { columns: number; children: ReactNode[] }) {
  const { colors } = useTheme();
  const rows = Math.ceil(children.length / columns);
  return (
    <View style={[styles.grid, { borderColor: colors.separator }]}>
      {children.map((child, i) => (
        <View
          key={i}
          style={[
            styles.cell,
            { width: `${100 / columns}%`, borderColor: colors.separator },
            (i + 1) % columns !== 0 && styles.right,
            Math.floor(i / columns) < rows - 1 && styles.bottom,
          ]}>
          {child}
        </View>
      ))}
    </View>
  );
}

function Feature({ icon, title, text }: { icon: { ios: string; android: string }; title: string; text: string }) {
  const { colors } = useTheme();
  return (
    <>
      <Icon ios={icon.ios} android={icon.android} size={26} color={colors.accent} />
      <AppText variant="headline">{title}</AppText>
      <AppText variant="subheadline" color="secondaryLabel">
        {text}
      </AppText>
    </>
  );
}

/** Benefits as a magazine list: thin number, strong title, one line of text, hairlines between. */
export function Benefits({ wide }: { wide: boolean }) {
  const { colors } = useTheme();
  return (
    <Block id="beneficios" kicker="Benefícios" title="O que muda no seu dia">
      <View style={[styles.list, { borderColor: colors.separator }]}>
        {GAINS.map((gain, i) => (
          <Reveal key={gain.title} style={{ ...styles.gain, ...(wide ? styles.gainWide : null), borderColor: colors.separator }}>
            <AppText color="accentText" style={styles.gainNumber}>
              {String(i + 1).padStart(2, "0")}
            </AppText>
            <AppText style={[styles.gainTitle, wide && styles.gainTitleWide]}>{gain.title}</AppText>
            <AppText variant="body" color="secondaryLabel" style={[styles.gainText, wide && styles.gainTextWide]}>
              {gain.text}
            </AppText>
          </Reveal>
        ))}
      </View>
      <AppText variant="subheadline" color="secondaryLabel" align="center">
        Quais são as 6 dicas? Você descobre ao entrar no app.
      </AppText>
    </Block>
  );
}

export function Steps({ columns }: { columns: number }) {
  const { colors } = useTheme();
  return (
    <Block id="como-funciona" kicker="Como funciona" title="Três passos e pronto">
      <Grid columns={columns}>
        {STEPS.map((step, i) => (
          <View key={step.title} style={styles.step}>
            <View style={[styles.number, { backgroundColor: colors.accentSoft }]}>
              <AppText variant="headline" color="accentText">
                {i + 1}
              </AppText>
            </View>
            <AppText variant="headline">{step.title}</AppText>
            <AppText variant="subheadline" color="secondaryLabel">
              {step.text}
            </AppText>
          </View>
        ))}
      </Grid>
    </Block>
  );
}

export function Features({ columns }: { columns: number }) {
  return (
    <Block id="recursos" kicker="Recursos" title="Tudo para criar o hábito">
      <Grid columns={columns}>{FEATURES.map((f) => <Feature key={f.title} {...f} />)}</Grid>
    </Block>
  );
}

/** Plans side by side, split by hairlines; the yearly one is marked by a single word. */
export function Plans({ wide, onStart }: { wide: boolean; onStart: () => void }) {
  const { colors } = useTheme();
  return (
    <Block id="planos" kicker="Planos" title="Comece grátis. Continue se gostar.">
      <AppText variant="body" color="secondaryLabel">
        Todo cadastro ganha 7 dias grátis. Depois, escolha por quanto tempo quer continuar.
      </AppText>
      <View style={[styles.plans, wide && styles.plansWide, { borderColor: colors.separator }]}>
        {PLANS.map((plan, i) => (
          <View key={plan.name} style={[styles.plan, wide && i > 0 && styles.planDivider, { borderColor: colors.separator }]}>
            <AppText variant="footnote" style={[styles.kicker, { color: "highlight" in plan ? colors.accentText : "transparent" }]}>
              MAIS VANTAJOSO
            </AppText>
            <AppText variant="title3">{plan.name}</AppText>
            <AppText style={styles.price}>{formatPrice(plan.cents)}</AppText>
            <AppText variant="subheadline" color="secondaryLabel">
              {plan.days} dias · {plan.days >= 60 ? `${formatPrice(Math.round((plan.cents * 30) / plan.days))} por mês` : "mês a mês"}
            </AppText>
          </View>
        ))}
      </View>
      <View style={styles.cta}>
        <SurfaceButton label="Começar meus 7 dias grátis" onPress={onStart} />
      </View>
    </Block>
  );
}

export function Faq() {
  return (
    <Block id="duvidas" kicker="Dúvidas" title="Perguntas frequentes">
      <Grid columns={1}>
        {FAQ.map((item) => (
          <View key={item.q} style={styles.faq}>
            <AppText variant="headline">{item.q}</AppText>
            <AppText variant="body" color="secondaryLabel">
              {item.a}
            </AppText>
          </View>
        ))}
      </Grid>
    </Block>
  );
}

/** Footer text link: lights up under the mouse. */
function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link">
      {({ hovered }) => (
        <AppText variant="footnote" color={hovered ? "label" : "secondaryLabel"} style={hovered && styles.underline}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

export function Footer({ onLegal }: { onLegal: (page: "terms" | "privacy") => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.footer, { borderColor: colors.separator }]}>
      <AppText variant="footnote" color="secondaryLabel">
        © {new Date().getFullYear()} Habitus
      </AppText>
      <View style={styles.links}>
        <FooterLink label="Termos de uso" onPress={() => onLegal("terms")} />
        <FooterLink label="Política de privacidade" onPress={() => onLegal("privacy")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.lg, paddingVertical: space.xxl * 2 },
  kicker: { fontWeight: "700", letterSpacing: 1 },
  blockTitle: { fontSize: 36, lineHeight: 42, letterSpacing: -0.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { padding: space.xl, gap: space.sm },
  right: { borderRightWidth: StyleSheet.hairlineWidth },
  bottom: { borderBottomWidth: StyleSheet.hairlineWidth },
  step: { gap: space.sm },
  number: { width: 36, height: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginBottom: space.xs },
  list: { borderTopWidth: 1 },
  gain: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: space.lg, paddingVertical: space.xl, borderBottomWidth: 1 },
  gainWide: { flexWrap: "nowrap", gap: space.xxl },
  gainNumber: { width: 64, flexShrink: 0, fontSize: 40, lineHeight: 44, fontWeight: "200" },
  gainTitle: { fontSize: 24, lineHeight: 30, fontWeight: "700" },
  gainTitleWide: { width: 320, flexShrink: 0 },
  gainText: { flexBasis: "100%" },
  gainTextWide: { flex: 1, flexBasis: 0, minWidth: 0 },
  plans: { borderTopWidth: 1, borderBottomWidth: 1 },
  plansWide: { flexDirection: "row" },
  plan: { flex: 1, gap: space.xs, paddingVertical: space.xxl, paddingHorizontal: space.xl },
  planDivider: { borderLeftWidth: 1 },
  price: { fontSize: 56, lineHeight: 64, fontWeight: "700", letterSpacing: -2, marginTop: space.md },
  cta: { alignItems: "center", marginTop: space.xl },
  faq: { gap: space.xs },
  underline: { textDecorationLine: "underline" },
  footer: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: space.md, paddingVertical: space.xl, borderTopWidth: StyleSheet.hairlineWidth },
  links: { flexDirection: "row", gap: space.lg },
});
