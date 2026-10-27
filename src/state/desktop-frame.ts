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
 * Not the landing page (a signed-out visitor at "/"), which is made for the wide window.
 * shortcut: decided once per page load; a small window resized wide is framed only after a reload.
 */
export function framedOnDesktop(): boolean {
  if (Platform.OS !== "web" || inDesktopFrame()) return false;
  const desktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches && window.innerWidth >= MIN_WINDOW_WIDTH;
  return desktop && (window.location.pathname !== "/" || hasStoredSession());
}

/** Inside the frame: the window's address bar and tab title follow the app, so a reload or a copied link opens the same screen. */
export function mirrorToWindow() {
  if (!inDesktopFrame()) return;
  // Still scrolls with the wheel; a desktop scrollbar would take 15 px off a phone-width page.
  document.documentElement.style.scrollbarWidth = "none";
  // After the router has written the new address and title.
  setTimeout(() => {
    window.parent.history.replaceState(null, "", window.location.pathname + window.location.search);
    window.parent.document.title = document.title;
  }, 0);
}
