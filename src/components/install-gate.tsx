import { useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { InstallStepsSheet, type StepsKind } from "./install-steps-sheet";
import { PrimaryButton } from "./primary-button";

const FEATURES = [
  {
    icon: { ios: "sun.max.fill", android: "wb_sunny" },
    title: "6 truques por dia",
    text: "Sorrir, postura de poder, metas, foco, gratidão e um pedido antes de dormir.",
  },
  {
    icon: { ios: "bell.badge.fill", android: "notifications_active" },
    title: "Lembrete na hora certa",
    text: "O Habitus avisa você em cada truque, dentro do seu horário.",
  },
  {
    icon: { ios: "trophy.fill", android: "emoji_events" },
    title: "XP, faixas e medalhas",
    text: "Mantenha a sequência, suba de nível e desbloqueie conquistas.",
  },
  {
    icon: { ios: "lock.fill", android: "lock" },
    title: "Sem cadastro",
    text: "Nada de conta ou senha: tudo fica guardado no seu celular.",
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState(false);

  const press = () => (mode === "prompt" ? onInstall() : setSheet(true));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xxl }]}>
        <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.hero}>
          <Image source={{ uri: "/icon-192.png" }} style={styles.logo} accessibilityIgnoresInvertColors accessible={false} />
          <AppText variant="largeTitle" align="center" accessibilityRole="header">
            Habitus
          </AppText>
          <AppText variant="body" color="secondaryLabel" align="center">
            Pequenos truques de bem-estar ao longo do seu dia, com lembrete na hora certa.
          </AppText>
        </Animated.View>

        {FEATURES.map((f, i) => (
          <Animated.View
            key={f.title}
            entering={FadeInDown.delay(120 + i * 80).springify().damping(18)}
            style={[styles.feature, { backgroundColor: colors.surface }]}>
            <View style={[styles.featureIcon, { backgroundColor: colors.accentSoft }]}>
              <Icon ios={f.icon.ios} android={f.icon.android} size={26} color={colors.accent} />
            </View>
            <View style={styles.featureText}>
              <AppText variant="headline">{f.title}</AppText>
              <AppText variant="subheadline" color="secondaryLabel">
                {f.text}
              </AppText>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + space.lg, backgroundColor: colors.background, borderTopColor: colors.separator },
        ]}>
        {installed ? (
          <View style={styles.done} accessibilityRole="alert">
            <Icon ios="checkmark.circle.fill" android="check_circle" size={28} color={colors.success} />
            <AppText variant="headline" style={styles.doneText}>
              Instalado! Abra o Habitus pelo ícone na sua tela inicial.
            </AppText>
          </View>
        ) : (
          <>
            <AppText variant="footnote" color="secondaryLabel" align="center">
              Gratuito · sem loja de apps · leva 5 segundos
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
  content: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.md, maxWidth: 640, width: "100%", alignSelf: "center" },
  hero: { alignItems: "center", gap: space.sm, marginBottom: space.lg },
  logo: { width: 96, height: 96, borderRadius: 22, marginBottom: space.sm },
  feature: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, borderRadius: radius.lg },
  featureIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1, gap: 2 },
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
