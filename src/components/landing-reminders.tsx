import { Image, StyleSheet, View } from "react-native";

import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { Block, Bullets } from "./landing-sections";
import { css, Reveal, useCountUp, useInView } from "./surface-parts";

// Made-up examples: everyday errands, nothing about health.
const SAMPLES = [
  { title: "Pagar a conta de luz", when: "dia 10 · 09:00", tags: ["Todo mês", "1 dia antes"] },
  { title: "Ligar para a mãe", when: "domingo · 18:00", tags: ["Toda semana"] },
  { title: "Aniversário da Júlia", when: "12 de março · 08:00", tags: ["Todo ano", "7 dias antes", "1 dia antes"] },
] as const;

const NUMBERS = [
  { value: 5, unit: "avisos", text: "antes de cada lembrete, de 1 minuto a 7 dias" },
  { value: 60, unit: "dias", text: "de lembretes já agendados no seu celular" },
  { value: 4, unit: "repetições", text: "a cada tantos dias, semanas, meses ou anos" },
] as const;

const POINTS = [
  { icon: "snooze", text: "Feito ou Adiar 10 min, direto na notificação." },
  { icon: "check_circle", text: "O que você concluiu fica numa aba à parte." },
  { icon: "cloud_done", text: "Salvos na sua conta, em qualquer aparelho." },
] as const;

/** A lock-screen notification, drawn flat. */
function Notification() {
  const { colors } = useTheme();
  return (
    <View style={[styles.notice, { borderColor: colors.separator }, css({ boxShadow: "0 24px 60px rgba(0,0,0,0.45)" })]}>
      <View style={styles.noticeHead}>
        <Image source={{ uri: "/icon-192.png" }} style={styles.appIcon} accessible={false} />
        <AppText variant="caption" color="secondaryLabel" style={styles.flex}>
          HABITUS · agora
        </AppText>
      </View>
      <AppText variant="headline">Dentista amanhã, 14:30</AppText>
      <AppText variant="subheadline" color="secondaryLabel">
        Levar os exames.
      </AppText>
      <View style={styles.actions}>
        {["Feito", "Adiar 10 min"].map((label) => (
          <View key={label} style={[styles.action, { backgroundColor: colors.fill }]}>
            <AppText variant="subheadline" style={styles.bold}>
              {label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

function Sample({ title, when, tags }: (typeof SAMPLES)[number]) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sample, { borderColor: colors.separator }]}>
      <Icon ios="bell" android="notifications_active" size={20} color={colors.warm} />
      <View style={styles.sampleBody}>
        <AppText variant="headline">{title}</AppText>
        <AppText variant="footnote" color="secondaryLabel">
          {when}
        </AppText>
        <View style={styles.tags}>
          {tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.accentSoft }]}>
              <AppText variant="caption" color="accentText" style={styles.bold}>
                {tag}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Figure({ value, unit, text, run }: (typeof NUMBERS)[number] & { run: boolean }) {
  const { colors } = useTheme();
  const shown = useCountUp(value, run);
  return (
    <View style={[styles.number, { borderColor: colors.separator }]}>
      <AppText style={[styles.big, { color: colors.warm }]}>{shown}</AppText>
      <AppText variant="body" color="secondaryLabel" style={styles.flex}>
        <AppText variant="body" style={styles.bold}>
          {unit}
        </AppText>{" "}
        {text}
      </AppText>
    </View>
  );
}

export function RemindersSection({ wide }: { wide: boolean }) {
  const { ref, shown } = useInView();
  return (
    <Block id="lembretes" kicker="Lembretes pessoais" title="Seus compromissos, no mesmo app">
      <View style={[styles.split, wide && styles.splitWide]}>
        <View style={[styles.visual, wide && styles.visualWide]}>
          <Notification />
          {SAMPLES.map((s) => (
            <Reveal key={s.title}>
              <Sample {...s} />
            </Reveal>
          ))}
        </View>
        <View ref={ref} style={[styles.text, wide && styles.flex]}>
          <AppText variant="title3" color="secondaryLabel" style={styles.lede}>
            Avisa antes, repete e guarda o que você já fez.
          </AppText>
          <View>
            {NUMBERS.map((n) => (
              <Figure key={n.unit} {...n} run={shown} />
            ))}
          </View>
          <Bullets items={POINTS} />
        </View>
      </View>
    </Block>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: "700" },
  flex: { flex: 1 },
  split: { gap: space.xxl },
  splitWide: { flexDirection: "row", alignItems: "center", gap: space.xxl * 2 },
  visual: { gap: space.md },
  visualWide: { width: 440 },
  text: { gap: space.xl },
  lede: { fontWeight: "400", lineHeight: 30 },
  notice: { gap: 4, padding: space.lg, borderRadius: 22, borderWidth: 1, backgroundColor: "rgba(11,34,56,0.92)", marginBottom: space.md },
  noticeHead: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.xs },
  appIcon: { width: 22, height: 22, borderRadius: 6 },
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  action: { flex: 1, minHeight: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  sample: { flexDirection: "row", gap: space.md, paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  sampleBody: { flex: 1, gap: 2 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginTop: space.xs },
  tag: { paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill },
  number: { flexDirection: "row", alignItems: "center", gap: space.lg, paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  big: { fontSize: 48, lineHeight: 52, fontWeight: "700", letterSpacing: -1.5, width: 72 },
});
