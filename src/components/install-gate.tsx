import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { pinned, radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { InstallStepsSheet, type StepsKind } from "./install-steps-sheet";
import { LandingModal } from "./landing-modal";
import { LandingPage } from "./landing-page";
import { css, SurfaceButton } from "./surface-parts";

const BAR_HEIGHT = 96;

interface Props {
  mode: "prompt" | StepsKind;
  installed: boolean;
  /** iPhone (not iPad): Safari's toolbar sits at the bottom. */
  iPhone: boolean;
  onInstall: () => void;
  onLegal: (page: "terms" | "privacy") => void;
  playDrop: () => void;
}

function Installed() {
  const { colors } = useTheme();
  return (
    <View style={styles.done} accessibilityRole="alert">
      <Icon ios="checkmark.circle.fill" android="check_circle" size={28} color={colors.success} />
      <AppText variant="headline" style={styles.flex}>
        Instalado! Abra o Habitus pelo ícone na sua tela inicial e crie sua conta lá.
      </AppText>
    </View>
  );
}

/**
 * A phone's browser: the landing page, but the app only runs installed. "Entrar" and "Começar" explain that and
 * offer the install; a bar pinned to the bottom keeps "Instalar o app" one tap away.
 */
export function InstallGate({ mode, installed, iPhone, onInstall, onLegal, playDrop }: Props) {
  const insets = useSafeAreaInsets();
  const [ask, setAsk] = useState(false);
  const [steps, setSteps] = useState(false);

  const install = () => {
    setAsk(false);
    if (mode === "prompt") onInstall();
    else setSteps(true);
  };

  return (
    <LandingPage onStart={() => setAsk(true)} onSignIn={() => setAsk(true)} onLegal={onLegal} playDrop={playDrop}>
      {/* Room for the bar under the footer. */}
      <View style={{ height: BAR_HEIGHT + insets.bottom }} />
      <View style={[styles.bar, pinned, BAR_GLASS, { paddingBottom: insets.bottom + space.md }]}>
        {installed ? (
          <Installed />
        ) : (
          <>
            <SurfaceButton label="Instalar o app" onPress={install} />
            <AppText variant="footnote" color="secondaryLabel" align="center">
              7 dias grátis · sem cartão · sem loja de apps
            </AppText>
          </>
        )}
      </View>

      {ask && (
        <LandingModal label="Instale o Habitus" onClose={() => setAsk(false)}>
          <View style={[styles.card, CARD_GLASS]}>
            <Icon ios="arrow.down.app" android="install_mobile" size={40} color="#FFFFFF" />
            <AppText variant="title2" align="center" style={styles.bold} accessibilityRole="header">
              Para usar o Habitus, instale o app
            </AppText>
            {installed ? (
              <AppText variant="body" color="secondaryLabel" align="center">
                Abra o Habitus pelo ícone na sua tela inicial.
              </AppText>
            ) : (
              <>
                <AppText variant="body" color="secondaryLabel" align="center">
                  A conta e as dicas funcionam no app instalado. Leva menos de um minuto.
                </AppText>
                <AppText variant="subheadline" align="center" style={styles.bold}>
                  7 dias grátis · sem cartão · sem loja de apps
                </AppText>
                <SurfaceButton label="Instalar agora" onPress={install} />
              </>
            )}
          </View>
        </LandingModal>
      )}

      {steps && mode !== "prompt" && <InstallStepsSheet kind={mode} onClose={() => setSteps(false)} showToolbarHint={iPhone && mode === "ios"} />}
    </LandingPage>
  );
}

const BAR_GLASS = css({
  backgroundColor: "rgba(4,21,38,0.7)",
  backdropFilter: "blur(18px) saturate(1.6)",
  WebkitBackdropFilter: "blur(18px) saturate(1.6)",
  boxShadow: "inset 0 1px 0 rgba(125,211,252,0.14)",
});

const CARD_GLASS = css({
  backgroundColor: "rgba(4,21,38,0.85)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 24px 80px rgba(0,0,0,0.6)",
});

const styles = StyleSheet.create({
  bar: { left: 0, right: 0, bottom: 0, zIndex: 20, gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md },
  card: { width: 360, maxWidth: "100%", borderRadius: radius.lg, padding: space.xl, gap: space.md, alignItems: "center" },
  done: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 56 },
  flex: { flex: 1 },
  bold: { fontWeight: "700" },
});
