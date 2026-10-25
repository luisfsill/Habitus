import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

/** Chrome's BeforeInstallPromptEvent (not in the DOM typings). */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __habitusInstall?: InstallEvent;
  }
}

/**
 * - `prompt`: Chrome/Edge/Android can show the native install dialog.
 * - `ios`: Safari has no install API; the user adds it via Compartilhar.
 * - `manual`: other browsers; install from the browser menu.
 * - `hidden`: native app, already installed, or dismissed.
 */
export type InstallMode = "prompt" | "ios" | "manual" | "hidden";

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac with touch.
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function initialMode(): InstallMode {
  if (Platform.OS !== "web" || isStandalone()) return "hidden";
  if (window.__habitusInstall) return "prompt";
  return isIOS() ? "ios" : "manual";
}

export function useInstallPrompt() {
  const [mode, setMode] = useState<InstallMode>(initialMode);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const ready = () => setMode(isStandalone() ? "hidden" : "prompt");
    const installed = () => setMode("hidden");
    window.addEventListener("habitus:installable", ready);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("habitus:installable", ready);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  /** Shows the browser's own install dialog. Resolves true when accepted. */
  const install = useCallback(async () => {
    const event = window.__habitusInstall;
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    // The event is single-use.
    window.__habitusInstall = undefined;
    if (outcome === "accepted") setMode("hidden");
    return outcome === "accepted";
  }, []);

  const dismiss = useCallback(() => setMode("hidden"), []);

  return { mode, install, dismiss };
}
