import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { HIT, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { PrimaryButton } from "./primary-button";

interface Props {
  mode: "prompt" | "ios" | "inapp" | "manual";
  onInstall: () => void;
  onDismiss: () => void;
}

const STEPS: Record<"ios" | "inapp" | "manual", string[]> = {
  inapp: [
    "Este navegador (Instagram, WhatsApp…) não instala apps.",
    "Toque em ⋯ e escolha “Abrir no navegador”.",
  ],
  ios: [
    "Toque no botão Compartilhar do Safari (o quadrado com a seta para cima).",
    "Escolha “Adicionar à Tela de Início”.",
    "Toque em “Adicionar”. O Habitus aparece como um app na sua tela.",
  ],
  manual: [
    "Abra o menu do navegador (⋮ ou ⋯).",
    "Escolha “Instalar app” ou “Adicionar à tela inicial”.",
  ],
};

/** "Instale o Habitus" card shown on the web build until the app is installed. */
export function InstallCard({ mode, onInstall, onDismiss }: Props) {
  const { colors } = useTheme();
  const [showSteps, setShowSteps] = useState(false);

  const press = () => (mode === "prompt" ? onInstall() : setShowSteps(true));

  return (
    <View>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
          <Icon ios="arrow.down.app" android="install_mobile" size={24} color={colors.accent} />
        </View>
        <View style={styles.text}>
          <AppText variant="headline">Instale o Habitus</AppText>
          <AppText variant="subheadline" color="secondaryLabel">
            Tenha o app na tela inicial, em tela cheia, sem passar pela loja.
          </AppText>
        </View>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Agora não"
          style={styles.close}>
          <Icon ios="xmark" android="close" size={18} color={colors.secondaryLabel} />
        </Pressable>
      </View>

      {showSteps && mode !== "prompt" ? (
        <View style={styles.steps} accessibilityLiveRegion="polite">
          {STEPS[mode].map((step, i) => (
            <AppText key={step} variant="subheadline">
              {i + 1}. {step}
            </AppText>
          ))}
        </View>
      ) : (
        <View style={styles.button}>
          <PrimaryButton label="Instalar agora" onPress={press} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  badge: { width: 44, height: 44, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
  close: { width: HIT, height: HIT, alignItems: "center", justifyContent: "center", marginTop: -space.sm, marginRight: -space.sm },
  steps: { marginTop: space.md, gap: space.sm },
  button: { marginTop: space.md },
});
