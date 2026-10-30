import { type ReactNode, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { pinned, radius, space } from "@/theme";

import { Icon } from "./icon";
import { LandingPage } from "./landing-page";
import { css } from "./surface-parts";

interface Props {
  label: string;
  onClose: () => void;
  children: ReactNode;
  /** False keeps it mounted but hidden, so what it holds (the sign-in frame) is loaded before it opens. */
  open?: boolean;
}

/**
 * Landing page dialog: the page dims behind dark glass and the content floats in the middle. Esc, the X or a click outside closes it.
 * No fade or zoom: it opens and closes at once. Web only.
 */
export function LandingModal({ label, onClose, children, open = true }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // The page behind stays put while the dialog is open.
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [onClose, open]);

  return (
    <View
      style={[StyleSheet.absoluteFill, pinned, styles.root, !open && styles.closed]}
      accessibilityViewIsModal
      aria-modal
      aria-hidden={!open}
      role="dialog"
      aria-label={label}>
      <Pressable style={[StyleSheet.absoluteFill, DIM]} onPress={onClose} accessibilityLabel="Fechar" />
      <View style={styles.content}>
        {children}
        {/* In the card's top corner, over its content. */}
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" style={styles.close}>
          <Icon ios="xmark" android="close" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

/** The app's own sign-in screen, in a phone-sized window. Signing in there reloads this page into the desktop frame (`inLoginModal`). */
export function LoginFrame({ mode }: { mode: "signup" | "signin" }) {
  const frame = useRef<HTMLIFrameElement>(null);
  // Tells the loaded screen to switch tabs; one still loading reads `data-mode` itself.
  useEffect(() => frame.current?.contentWindow?.postMessage("habitus:login-mode", window.location.origin), [mode]);
  return (
    <iframe
      ref={frame}
      src="/auth"
      title="Entrar no Habitus"
      data-login=""
      data-mode={mode}
      style={{ width: "min(430px, calc(100vw - 32px))", height: "min(780px, calc(100vh - 48px))", border: "none", borderRadius: 28, display: "block", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
    />
  );
}

interface DesktopProps {
  onLegal: (page: "terms" | "privacy") => void;
  onNudge?: () => void;
}

/** Computer visitors: "Entrar" and "Começar grátis" open the sign-in screen over the page instead of leaving it. */
export function DesktopLanding({ onLegal, onNudge }: DesktopProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [open, setOpen] = useState(false);
  // The frame is a whole second copy of the app (water shader included): load it only once someone asks for it.
  const [loaded, setLoaded] = useState(false);
  const show = (next: "signin" | "signup") => {
    setMode(next);
    setLoaded(true);
    setOpen(true);
  };
  return (
    <LandingPage onStart={() => show("signup")} onSignIn={() => show("signin")} onLegal={onLegal} onNudge={onNudge}>
      {/* Kept mounted after the first open, so closing and reopening keeps what was typed. */}
      <LandingModal label="Entrar no Habitus" open={open} onClose={() => setOpen(false)}>
        {loaded && <LoginFrame mode={mode} />}
      </LandingModal>
    </LandingPage>
  );
}

const DIM = css({ backgroundColor: "rgba(1,8,16,0.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" });

const styles = StyleSheet.create({
  root: { zIndex: 50, alignItems: "center", justifyContent: "center", padding: space.lg },
  // Not display: none, which pauses the frame's animations until it opens: its screen would fade in on the first click.
  closed: { visibility: "hidden" },
  content: { maxWidth: "100%" },
  close: {
    position: "absolute",
    top: space.md,
    right: space.md,
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
});
