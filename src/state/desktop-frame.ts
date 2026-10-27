import { Platform } from "react-native";

import { hasStoredSession, markLoginCurtain } from "@/services/storage";

import { isStandalone } from "./use-install-prompt";

/** Narrower windows just show the app full width. */
const MIN_WINDOW_WIDTH = 700;

/**
 * This page is the app running inside the desktop frame (or the landing's sign-in dialog).
 * Only our own frames count: a phone simulator extension also loads the page in a frame, and there it is a plain page.
 */
export function inDesktopFrame(): boolean {
  if (Platform.OS !== "web" || window.self === window.top) return false;
  // null when the parent is another origin (the extension's page).
  const frame = window.frameElement;
  return frame?.hasAttribute("data-frame") === true || frame?.hasAttribute("data-login") === true;
}

/**
 * A computer's browser shows the app in a phone-width frame in the middle of the window, laid out as on a phone.
 * Not the landing page (a signed-out visitor at "/"), which is made for the wide window, nor the legal pages it
 * links to, which read as full-window documents. Opened from inside the app, they stay in the frame.
 * shortcut: decided once per page load; a small window resized wide is framed only after a reload.
 */
export function framedOnDesktop(): boolean {
  if (Platform.OS !== "web" || inDesktopFrame()) return false;
  const desktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches && window.innerWidth >= MIN_WINDOW_WIDTH;
  const { pathname } = window.location;
  if (pathname.startsWith("/legal/")) return false;
  return desktop && (pathname !== "/" || hasStoredSession());
}

/** This page is the sign-in screen in the landing page's dialog (`LoginFrame`). */
export function inLoginModal(): boolean {
  return inDesktopFrame() && window.frameElement?.hasAttribute("data-login") === true;
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
  (inDesktopFrame() ? window.parent : window).location.assign("/");
}

/**
 * Signed in from the landing page's dialog: the landing reloads and, with the session saved, opens the app in the frame.
 * The reload drops the dialog's sign-in curtain, so the reloaded app plays it instead (`TransitionProvider`).
 */
export function leaveLoginModal() {
  if (!inLoginModal()) return;
  markLoginCurtain();
  window.parent.location.reload();
}

/** Inside the frame: the window's address bar and tab title follow the app, so a reload or a copied link opens the same screen. */
export function mirrorToWindow() {
  // The dialog's address is not the window's: the landing stays at "/".
  if (!inDesktopFrame() || inLoginModal()) return;
  // After the router has written the new address and title.
  setTimeout(() => {
    window.parent.history.replaceState(null, "", window.location.pathname + window.location.search);
    window.parent.document.title = document.title;
  }, 0);
}
