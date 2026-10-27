import { type ReactNode, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";

import { pinned, radius, space } from "@/theme";

import { Icon } from "./icon";
import { LandingPage } from "./landing-page";
import { css } from "./surface-parts";

interface Props {
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/** Landing page dialog: the page dims behind dark glass and the content floats in the middle. Esc, the X or a click outside closes it. Web only. */
export function LandingModal({ label, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // The page behind stays put while the dialog is open.
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [onClose]);

  return (
    <View style={[StyleSheet.absoluteFill, pinned, styles.root]} accessibilityViewIsModal aria-modal role="dialog" aria-label={label}>
      <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} style={[StyleSheet.absoluteFill, DIM]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
      </Animated.View>
      <Animated.View entering={ZoomIn.duration(260)} style={styles.content}>
        {children}
      </Animated.View>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" style={styles.close}>
        <Icon ios="xmark" android="close" size={22} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

/** The app's own sign-in screen, in a phone-sized window. Signing in there reloads this page into the desktop frame (`inLoginModal`). */
export function LoginFrame({ signup }: { signup: boolean }) {
  return (
    <iframe
      src={signup ? "/auth?modo=criar" : "/auth"}
      title="Entrar no Habitus"
      data-login=""
      style={{ width: "min(430px, calc(100vw - 32px))", height: "min(780px, calc(100vh - 48px))", border: "none", borderRadius: 28, display: "block", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
    />
  );
}

interface DesktopProps {
  onLegal: (page: "terms" | "privacy") => void;
  playDrop: () => void;
}

/** Computer visitors: "Entrar" and "Começar grátis" open the sign-in screen over the page instead of leaving it. */
export function DesktopLanding({ onLegal, playDrop }: DesktopProps) {
  const [login, setLogin] = useState<"signin" | "signup" | null>(null);
  return (
    <LandingPage onStart={() => setLogin("signup")} onSignIn={() => setLogin("signin")} onLegal={onLegal} playDrop={playDrop}>
      {login && (
        <LandingModal label="Entrar no Habitus" onClose={() => setLogin(null)}>
          <LoginFrame signup={login === "signup"} />
        </LandingModal>
      )}
    </LandingPage>
  );
}

const DIM = css({ backgroundColor: "rgba(1,8,16,0.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" });

const styles = StyleSheet.create({
  root: { zIndex: 50, alignItems: "center", justifyContent: "center", padding: space.lg },
  content: { maxWidth: "100%" },
  close: {
    position: "absolute",
    top: space.lg,
    right: space.lg,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
});
