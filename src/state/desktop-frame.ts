import { Platform } from "react-native";

import { hasStoredSession } from "@/services/storage";

/** Narrower windows just show the app full width. */
const MIN_WINDOW_WIDTH = 700;

/** This page is the app running inside the desktop frame. */
export function inDesktopFrame(): boolean {
  return Platform.OS === "web" && window.self !== window.top;
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

/** Signed in from the landing page's dialog: the landing reloads and, with the session saved, opens the app in the frame. */
export function leaveLoginModal() {
  if (inLoginModal()) window.parent.location.reload();
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
