import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { backdrops, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { GAINS } from "./benefits";
import { Icon } from "./icon";
import { InstallStepsSheet, type StepsKind } from "./install-steps-sheet";
import { PrimaryButton } from "./primary-button";
import { Section } from "./section";

const STEPS = [
  "Instale e crie sua conta: os 7 primeiros dias são grátis.",
  "Escolha o horário do seu dia e a hora de dormir.",
  "O Habitus avisa cada dica na hora certa. Cada uma leva até 2 minutos.",
] as const;

const EXTRAS = [
  { icon: { ios: "trophy", android: "emoji_events" }, text: "XP, faixas e medalhas para manter a sequência" },
  { icon: { ios: "calendar", android: "calendar_month" }, text: "Histórico do mês, dia a dia" },
  { icon: { ios: "icloud", android: "cloud_done" }, text: "Progresso salvo na sua conta, em qualquer aparelho" },
] as const;

interface Props {
  mode: "prompt" | StepsKind;
  installed: boolean;
  /** iPhone (not iPad): Safari's toolbar sits at the bottom. */
  iPhone: boolean;
  onInstall: () => void;
}

/**
 * Mobile browsers only see this screen: what the app does and one button,
 * "Instalar agora". The app itself opens from the home screen icon.
 */
export function InstallGate({ mode, installed, iPhone, onInstall }: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState(false);

  const press = () => (mode === "prompt" ? onInstall() : setSheet(true));

  return (
    <View style={[styles.root, backdrops[scheme]]}>
      <View style={[styles.content, { paddingTop: insets.top + space.xxl }]}>
        <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.hero}>
          <Image source={{ uri: "/icon-192.png" }} style={styles.logo} accessibilityIgnoresInvertColors accessible={false} />
          <AppText variant="largeTitle" align="center" accessibilityRole="header">
            Habitus
          </AppText>
          <AppText variant="body" color="secondaryLabel" align="center">
            Seis dicas rápidas ao longo do dia, com lembrete na hora certa. Um jeito simples de cuidar de você.
          </AppText>
        </Animated.View>

        <Section title="Como funciona">
          {STEPS.map((step, i) => (
            <View key={step} style={styles.line}>
              <View style={[styles.step, { backgroundColor: colors.accentSoft }]}>
                <AppText variant="subheadline" color="accentText" style={styles.bold}>
                  {i + 1}
                </AppText>
              </View>
              <AppText variant="body" style={styles.flex}>
                {step}
              </AppText>
            </View>
          ))}
        </Section>

        <Section title="O que você ganha" footer="Quais são as 6 dicas? Você descobre ao entrar no app.">
          {GAINS.map((gain) => (
            <View key={gain.title} style={styles.line}>
              <Icon ios={gain.icon.ios} android={gain.icon.android} size={24} color={colors.accent} />
              <View style={styles.flex}>
                <AppText variant="headline">{gain.title}</AppText>
                <AppText variant="subheadline" color="secondaryLabel">
                  {gain.text}
                </AppText>
              </View>
            </View>
          ))}
        </Section>

        <Section title="E mais">
          <View style={styles.extras}>
            {EXTRAS.map((extra) => (
              <View key={extra.text} style={styles.line}>
                <Icon ios={extra.icon.ios} android={extra.icon.android} size={20} color={colors.secondaryLabel} />
                <AppText variant="subheadline" style={styles.flex}>
                  {extra.text}
                </AppText>
              </View>
            ))}
          </View>
        </Section>
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + space.lg, borderTopColor: colors.separator },
        ]}>
        {installed ? (
          <View style={styles.done} accessibilityRole="alert">
            <Icon ios="checkmark.circle.fill" android="check_circle" size={28} color={colors.success} />
            <AppText variant="headline" style={styles.doneText}>
              Instalado! Abra o Habitus pelo ícone na sua tela inicial e crie sua conta lá.
            </AppText>
          </View>
        ) : (
          <>
            <AppText variant="subheadline" align="center" style={styles.bold}>
              7 dias grátis · sem cartão · sem loja de apps
            </AppText>
            <AppText variant="footnote" color="secondaryLabel" align="center">
              Depois de instalar, abra o Habitus e crie sua conta para começar o teste.
            </AppText>
            <PrimaryButton label="Instalar agora" onPress={press} accessibilityHint="Adiciona o Habitus à tela inicial" />
          </>
        )}
      </View>

      {sheet && mode !== "prompt" && (
        <InstallStepsSheet kind={mode} onClose={() => setSheet(false)} showToolbarHint={iPhone && mode === "ios"} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.xl, maxWidth: 640, width: "100%", alignSelf: "center" },
  hero: { alignItems: "center", gap: space.sm },
  logo: { width: 96, height: 96, borderRadius: 22, marginBottom: space.sm },
  line: { flexDirection: "row", alignItems: "center", gap: space.md },
  step: { width: 28, height: 28, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  extras: { gap: space.md },
  flex: { flex: 1, gap: 2 },
  bold: { fontWeight: "600" },
  footer: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  done: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 52 },
  doneText: { flex: 1 },
});
