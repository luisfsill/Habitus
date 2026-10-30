import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { formatPrice } from "@/domain/access";
import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { GAINS } from "./benefits";
import { Icon } from "./icon";
import { css, SurfaceButton, useCountUp, useInView } from "./surface-parts";

// shortcut: prices mirror supabase/admin.sql; the plans table is readable only when signed in. Open it to anon if admins change prices often.
const PLANS = [
  { name: "Mensal", days: 30, cents: 990 },
  { name: "Trimestral", days: 90, cents: 2490 },
  { name: "Anual", days: 365, cents: 7990, highlight: true },
] as const;

const FAQ = [
  { q: "Quanto custa?", a: "Nada. Hoje o Habitus é gratuito: crie a conta e use tudo." },
  { q: "Quais são as 6 dicas?", a: "É surpresa: você descobre ao entrar no app, uma de cada vez, ao longo do dia." },
  { q: "Como adiciono meus amigos?", a: "Cada um cria a própria conta e escolhe um @. Busque pelo nome ou pelo @ e mande o pedido de amizade." },
  { q: "Que lembretes eu posso criar?", a: "Qualquer um: contas, aniversários, ligações, compromissos. Com notas, até 5 avisos antes e repetição se precisar." },
  { q: "Funciona no celular?", a: "Sim. Abra o site no celular e toque em Instalar agora. O Habitus vira um app na sua tela inicial." },
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

/** Icon and line rows, used by the water and reminder sections. */
export function Bullets({ items }: { items: readonly { icon: string; text: string }[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bullets}>
      {items.map((item) => (
        <View key={item.text} style={styles.bullet}>
          <Icon ios="circle" android={item.icon} size={22} color={colors.accentText} />
          <AppText variant="body" style={styles.flex}>
            {item.text}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const RING = 2 * Math.PI * 84;
const SLICE = RING / 6;

/** Six arcs that fill one after another, like the day's ring in the app. */
function DayRing({ shown }: { shown: boolean }) {
  const { colors } = useTheme();
  const done = useCountUp(6, shown, 1600);
  return (
    <View style={styles.ring}>
      <svg width={220} height={220} viewBox="0 0 220 220" aria-hidden>
        <circle cx={110} cy={110} r={84} fill="none" stroke={colors.ringTrack} strokeWidth={18} />
        {Array.from({ length: 6 }, (_, i) => (
          <circle
            key={i}
            cx={110}
            cy={110}
            r={84}
            fill="none"
            stroke={colors.accentText}
            strokeWidth={18}
            strokeDasharray={`${SLICE - 6} ${RING}`}
            strokeDashoffset={shown ? 0 : SLICE - 6}
            transform={`rotate(${-90 + i * 60} 110 110)`}
            style={{ transition: `stroke-dashoffset 450ms ease-out ${i * 260}ms` }}
          />
        ))}
      </svg>
      <View style={styles.ringCenter}>
        <AppText style={styles.ringValue}>{done}/6</AppText>
        <AppText variant="footnote" color="secondaryLabel">
          {done === 6 ? "dia perfeito" : "hoje"}
        </AppText>
      </View>
    </View>
  );
}

/** The six tips in short: what they bring, not what they are (a surprise inside the app). */
export function Tips({ wide }: { wide: boolean }) {
  const { colors } = useTheme();
  const { ref, shown } = useInView();
  return (
    <Block id="dicas" kicker="As 6 dicas" title="Seis pausas. Até 2 minutos cada.">
      <View ref={ref} style={[styles.tips, wide && styles.tipsWide]}>
        <DayRing shown={shown} />
        <View style={[styles.tipsText, wide && styles.flex]}>
          <AppText variant="title3" color="secondaryLabel" style={styles.lede}>
            Pequenos gestos do começo do dia até a hora de dormir. Quais são? Você descobre ao entrar.
          </AppText>
          <View style={styles.gains}>
            {GAINS.map((gain, i) => (
              <View
                key={gain.title}
                style={[styles.gainItem, css({ opacity: shown ? 1 : 0, transform: `translateY(${shown ? 0 : 12}px)`, transition: `opacity 500ms ${i * 260}ms, transform 500ms ${i * 260}ms` })]}>
                <Icon ios={gain.icon.ios} android={gain.icon.android} size={22} color={colors.accentText} />
                <AppText variant="headline">{gain.title}</AppText>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Block>
  );
}

/** Plans side by side, split by hairlines; the yearly one is marked by a single word. Hidden from the landing while the app is free. */
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
  flex: { flex: 1 },
  bullets: { gap: space.md },
  bullet: { flexDirection: "row", alignItems: "center", gap: space.md },
  lede: { fontWeight: "400", lineHeight: 30 },
  tips: { gap: space.xxl, alignItems: "center" },
  tipsWide: { flexDirection: "row", gap: space.xxl * 2 },
  tipsText: { gap: space.xl, alignSelf: "stretch" },
  ring: { width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  ringCenter: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  ringValue: { fontSize: 44, lineHeight: 48, fontWeight: "700", letterSpacing: -1 },
  gains: { flexDirection: "row", flexWrap: "wrap", rowGap: space.lg },
  gainItem: { width: "50%", flexDirection: "row", alignItems: "center", gap: space.sm, paddingRight: space.md },
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
