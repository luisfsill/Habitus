import { Platform } from "react-native";

import { markLoginCurtain } from "@/services/storage";

import { isStandalone } from "./use-install-prompt";

/**
 * This page is the sign-in screen in the landing page's dialog (`LoginFrame`).
 * Only our own frame counts: a phone simulator extension also loads the page in a frame, and there it is a plain page.
 */
export function inLoginModal(): boolean {
  if (Platform.OS !== "web" || window.self === window.top) return false;
  // null when the parent is another origin (the extension's page).
  return window.frameElement?.hasAttribute("data-login") === true;
}

/**
 * The dialog's sign-in screen loads once, before the first click, and is reused: each opening says which tab to show
 * (`data-mode` on the frame, read at load, then a message from the landing). Returns the unsubscribe.
 */
export function onLoginModalMode(show: (mode: "signup" | "signin") => void): () => void {
  if (!inLoginModal()) return () => {};
  const read = () => {
    const mode = window.frameElement?.getAttribute("data-mode");
    if (mode === "signup" || mode === "signin") show(mode);
  };
  read();
  const onMessage = (e: MessageEvent) => e.origin === window.location.origin && e.data === "habitus:login-mode" && read();
  // Backticks: the icon font test reads every double-quoted lowercase word in src as an icon name, and this one is.
  window.addEventListener(`message`, onMessage);
  return () => window.removeEventListener(`message`, onMessage);
}

/**
 * Signed out in a browser: the whole window (not just the frame) goes back to "/", where a visitor sees the landing
 * page. The installed app has no landing page and stays on the sign-in screen.
 */
export function leaveToLanding() {
  if (Platform.OS !== "web" || isStandalone()) return;
  // The parent, not window.top: a phone simulator extension may hold the page in a frame of its own.
  (inLoginModal() ? window.parent : window).location.assign("/");
}

/**
 * Signed in from the landing page's dialog: the landing reloads and, with the session saved, opens the app.
 * The reload drops the dialog's sign-in curtain, so the reloaded app plays it instead (`TransitionProvider`).
 */
export function leaveLoginModal() {
  if (!inLoginModal()) return;
  markLoginCurtain();
  window.parent.location.reload();
}
