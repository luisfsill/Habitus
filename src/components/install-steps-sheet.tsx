import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HIT, pinned, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { PrimaryButton } from "./primary-button";

export type StepsKind = "ios" | "inapp" | "manual";

interface Step {
  icon: { ios: string; android: string };
  title: string;
  detail: string;
}

const CONTENT: Record<StepsKind, { title: string; steps: Step[] }> = {
  ios: {
    title: "Adicione à Tela de Início",
    steps: [
      {
        icon: { ios: "square.and.arrow.up", android: "ios_share" },
        title: "Toque em Compartilhar",
        detail: "O quadrado com a seta para cima, na barra do Safari. Se não aparecer, toque antes em ⋯.",
      },
      {
        icon: { ios: "plus.square", android: "add_box" },
        title: "Escolha “Adicionar à Tela de Início”",
        detail: "Se não aparecer de cara, role a lista para baixo.",
      },
      {
        icon: { ios: "checkmark.circle.fill", android: "check_circle" },
        title: "Toque em “Adicionar”",
        detail: "Pronto: o Habitus aparece na sua tela inicial, como um app.",
      },
    ],
  },
  inapp: {
    title: "Abra no navegador",
    steps: [
      {
        icon: { ios: "ellipsis.circle", android: "more_horiz" },
        title: "Toque em ⋯ no canto da tela",
        detail: "Este navegador (Instagram, WhatsApp…) não instala apps.",
      },
      {
        icon: { ios: "safari", android: "open_in_browser" },
        title: "Escolha “Abrir no navegador”",
        detail: "Ou copie o link abaixo e cole no Safari (iPhone) ou no Chrome (Android).",
      },
      {
        icon: { ios: "arrow.down.app", android: "install_mobile" },
        title: "Toque em “Instalar agora” de novo",
        detail: "No navegador, a instalação funciona.",
      },
    ],
  },
  manual: {
    title: "Instale pelo menu do navegador",
    steps: [
      {
        icon: { ios: "ellipsis", android: "more_vert" },
        title: "Toque em ⋮ (o menu do navegador)",
        detail: "Fica no canto da barra de endereço.",
      },
      {
        icon: { ios: "plus.square", android: "add_to_home_screen" },
        title: "Escolha “Instalar app” ou “Adicionar à tela inicial”",
        detail: "O nome muda um pouco de navegador para navegador.",
      },
      {
        icon: { ios: "checkmark.circle.fill", android: "check_circle" },
        title: "Confirme",
        detail: "O Habitus aparece na sua tela inicial, como um app.",
      },
    ],
  },
};

/** Bouncing arrow toward the Safari toolbar at the bottom of an iPhone. */
function ToolbarHint() {
  const { colors } = useTheme();
  const y = useSharedValue(0);
  useEffect(() => {
    y.set(withRepeat(withTiming(8, { duration: 600 }), -1, true));
  }, [y]);
  const bounce = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return (
    <View style={styles.hint} accessible accessibilityLabel="A barra do Safari fica embaixo da tela">
      <AppText variant="footnote" color="secondaryLabel">
        A barra do Safari fica aqui embaixo
      </AppText>
      <Animated.View style={bounce}>
        <Icon ios="chevron.down" android="keyboard_double_arrow_down" size={28} color={colors.accent} />
      </Animated.View>
    </View>
  );
}

interface Props {
  kind: StepsKind;
  onClose: () => void;
  /** iPhone (not iPad): Safari's toolbar is at the bottom. */
  showToolbarHint?: boolean;
}

export function InstallStepsSheet({ kind, onClose, showToolbarHint }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { title, steps } = CONTENT[kind];
  const [copied, setCopied] = useState(false);

  return (
    <View style={[StyleSheet.absoluteFill, pinned]}>
      <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar instruções" />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.springify().damping(18)}
        exiting={SlideOutDown.duration(200)}
        accessibilityViewIsModal
        style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + space.lg }]}>
        <View style={[styles.grabber, { backgroundColor: colors.separator }]} />
        <AppText variant="title2" accessibilityRole="header">
          {title}
        </AppText>
        {steps.map((step, i) => (
          <View key={step.title} style={styles.step}>
            <View style={[styles.number, { backgroundColor: colors.accent }]}>
              <AppText variant="headline" style={{ color: colors.onAccent }} maxFontSizeMultiplier={1.2}>
                {i + 1}
              </AppText>
            </View>
            <View style={styles.text}>
              <AppText variant="headline">{step.title}</AppText>
              <AppText variant="subheadline" color="secondaryLabel">
                {step.detail}
              </AppText>
            </View>
            <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
              <Icon ios={step.icon.ios} android={step.icon.android} size={26} color={colors.accent} />
            </View>
          </View>
        ))}
        {kind === "inapp" && (
          <PrimaryButton
            label={copied ? "Link copiado!" : "Copiar link"}
            variant="tinted"
            onPress={() => void navigator.clipboard?.writeText(window.location.origin).then(() => setCopied(true))}
          />
        )}
        <PrimaryButton label="Entendi" onPress={onClose} />
        {showToolbarHint && <ToolbarHint />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxWidth: 640,
    alignSelf: "center",
    width: "100%",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.lg,
  },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: space.xs },
  step: { flexDirection: "row", alignItems: "center", gap: space.md },
  number: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
  icon: { width: HIT + 8, height: HIT + 8, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  hint: { alignItems: "center", gap: 2 },
});
