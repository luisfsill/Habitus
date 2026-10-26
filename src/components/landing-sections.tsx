import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { formatPrice } from "@/domain/access";
import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { GAINS } from "./benefits";
import { Icon } from "./icon";
import { PrimaryButton } from "./primary-button";

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
  { icon: { ios: "moon", android: "dark_mode" }, title: "Claro ou escuro", text: "Escolha a aparência ou deixe seguir o seu aparelho." },
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

export function Benefits({ columns }: { columns: number }) {
  return (
    <Block id="beneficios" kicker="Benefícios" title="O que muda no seu dia">
      <Grid columns={columns}>{GAINS.map((g) => <Feature key={g.title} {...g} />)}</Grid>
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

export function Plans({ columns, onStart }: { columns: number; onStart: () => void }) {
  const { colors } = useTheme();
  return (
    <Block id="planos" kicker="Planos" title="Comece grátis. Continue se gostar.">
      <AppText variant="body" color="secondaryLabel">
        Todo cadastro ganha 7 dias grátis. Depois, escolha por quanto tempo quer continuar.
      </AppText>
      <Grid columns={columns}>
        {PLANS.map((plan) => {
          const perMonth = plan.days >= 60 ? `${formatPrice(Math.round((plan.cents * 30) / plan.days))} por mês` : "Pague mês a mês";
          const top = "highlight" in plan;
          return (
            <View key={plan.name} style={styles.plan}>
              <View style={styles.planHead}>
                <AppText variant="title3">{plan.name}</AppText>
                {top && (
                  <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                    <AppText variant="caption" style={styles.badgeText}>
                      Mais vantajoso
                    </AppText>
                  </View>
                )}
              </View>
              <AppText style={[styles.price, { color: top ? colors.accentText : colors.label }]}>{formatPrice(plan.cents)}</AppText>
              <AppText variant="subheadline" color="secondaryLabel">
                {plan.days} dias · {perMonth}
              </AppText>
            </View>
          );
        })}
      </Grid>
      <View style={styles.cta}>
        <PrimaryButton label="Começar meus 7 dias grátis" onPress={onStart} glow />
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

export function Footer({ onLegal }: { onLegal: (page: "terms" | "privacy") => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.footer, { borderColor: colors.separator }]}>
      <AppText variant="footnote" color="secondaryLabel">
        © {new Date().getFullYear()} Habitus
      </AppText>
      <View style={styles.links}>
        <Pressable onPress={() => onLegal("terms")} accessibilityRole="button">
          <AppText variant="footnote" color="secondaryLabel">Termos de uso</AppText>
        </Pressable>
        <Pressable onPress={() => onLegal("privacy")} accessibilityRole="button">
          <AppText variant="footnote" color="secondaryLabel">Política de privacidade</AppText>
        </Pressable>
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
  plan: { gap: space.xs },
  planHead: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  badge: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
  badgeText: { color: "#FFFFFF", fontWeight: "700" },
  price: { fontSize: 40, lineHeight: 48, fontWeight: "800", letterSpacing: -1, marginTop: space.sm },
  cta: { alignSelf: "center", minWidth: 320 },
  faq: { gap: space.xs },
  footer: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: space.md, paddingVertical: space.xl, borderTopWidth: StyleSheet.hairlineWidth },
  links: { flexDirection: "row", gap: space.lg },
});
