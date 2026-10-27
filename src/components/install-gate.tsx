import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { backdrops, MAX_WIDTH, pinned, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { InstallStepsSheet, type StepsKind } from "./install-steps-sheet";
import { PrimaryButton } from "./primary-button";
import { Section } from "./section";

// What the app does, first thing on the screen. The tips stay a surprise inside the app.
const FEATURES = [
  {
    icon: { ios: "sparkles", android: "auto_awesome" },
    title: "6 dicas de crescimento pessoal e mental",
    text:
      "Cada dica é uma pequena aventura de até 2 minutos: cenas vivas, sons da natureza e desafios que reagem a você, como apagar uma fogueira com um sopro. Ganhe XP, suba de faixa e colecione medalhas. Quais são as dicas? Surpresa: você descobre no app.",
  },
  {
    icon: { ios: "drop.fill", android: "water_drop" },
    title: "Lembrete de água",
    text: "Defina sua meta de copos e receba avisos para beber água.",
  },
  {
    icon: { ios: "bell.badge", android: "notifications_active" },
    title: "Lembretes personalizados",
    text: "Crie os seus, com aviso antes da hora e repetição.",
  },
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
            Lembretes que cuidam de você{"\n"}ao longo do dia.
          </AppText>
        </Animated.View>

        <Section title="O que o Habitus faz">
          {FEATURES.map((feature) => (
            <View key={feature.title} style={styles.line}>
              <Icon ios={feature.icon.ios} android={feature.icon.android} size={24} color={colors.accent} />
              <View style={styles.flex}>
                <AppText variant="headline">{feature.title}</AppText>
                <AppText variant="subheadline" color="secondaryLabel">
                  {feature.text}
                </AppText>
              </View>
            </View>
          ))}
        </Section>
      </View>

      {/* Pinned to the viewport: "Instalar agora" is reachable without scrolling. */}
      <View
        style={[
          styles.footer,
          pinned,
          { paddingBottom: insets.bottom + space.lg, borderTopColor: colors.separator, backgroundColor: colors.background },
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
  // Bottom padding leaves room for the pinned footer.
  content: { paddingHorizontal: space.xl, paddingBottom: 200, gap: space.xl, maxWidth: MAX_WIDTH, width: "100%", alignSelf: "center" },
  hero: { alignItems: "center", gap: space.sm },
  logo: { width: 96, height: 96, borderRadius: 22, marginBottom: space.sm },
  line: { flexDirection: "row", alignItems: "center", gap: space.md },
  flex: { flex: 1, gap: 2 },
  bold: { fontWeight: "600" },
  footer: {
    left: 0,
    right: 0,
    bottom: 0,
    marginHorizontal: "auto",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxWidth: MAX_WIDTH,
    width: "100%",
  },
  done: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 52 },
  doneText: { flex: 1 },
});
