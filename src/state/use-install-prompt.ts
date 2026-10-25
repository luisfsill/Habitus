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
 * - `prompt`: Chrome/Edge/Samsung can show the native install dialog.
 * - `ios`: Safari has no install API; the user adds it via Compartilhar.
 * - `inapp`: Instagram/WhatsApp/Facebook browsers cannot install at all.
 * - `manual`: other browsers; install from the browser menu.
 * - `hidden`: native app, already installed, or dismissed.
 */
export type InstallMode = "prompt" | "ios" | "inapp" | "manual" | "hidden";

const isWeb = Platform.OS === "web";

export function isStandalone(): boolean {
  if (!isWeb) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac with touch.
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function isInAppBrowser(): boolean {
  return /FBAN|FBAV|Instagram|WhatsApp|Line\/|Twitter|TikTok|; wv\)/i.test(navigator.userAgent);
}

/** iPhone/iPod, where Safari's toolbar sits at the bottom of the screen. */
export function isIPhone(): boolean {
  return isWeb && /iPhone|iPod/.test(navigator.userAgent);
}

/** Phone or tablet browser (not a desktop computer). */
export function isMobileWeb(): boolean {
  if (!isWeb) return false;
  return isIOS() || /Android|Mobi/i.test(navigator.userAgent);
}

function initialMode(): InstallMode {
  if (!isWeb || isStandalone()) return "hidden";
  if (isInAppBrowser()) return "inapp";
  if (window.__habitusInstall) return "prompt";
  return isIOS() ? "ios" : "manual";
}

export function useInstallPrompt() {
  const [mode, setMode] = useState<InstallMode>(initialMode);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (!isWeb) return;
    const ready = () => setMode(isStandalone() ? "hidden" : "prompt");
    const done = () => setInstalled(true);
    window.addEventListener("habitus:installable", ready);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("habitus:installable", ready);
      window.removeEventListener("appinstalled", done);
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
    if (outcome === "accepted") setInstalled(true);
    return outcome === "accepted";
  }, []);

  const dismiss = useCallback(() => setMode("hidden"), []);

  return { mode: installed ? "hidden" : mode, installed, install, dismiss };
}
