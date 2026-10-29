import { Linking, Platform } from "react-native";

import { whatsAppAppUrl } from "@/domain/access";

import { isStandalone } from "./use-install-prompt";

/**
 * Opens a wa.me link. The installed web app (iOS) would navigate its only window
 * to wa.me and come back to a blank page, so there it hands off to the WhatsApp app instead.
 */
export function openWhatsApp(waMe: string): void {
  if (Platform.OS === "web" && isStandalone()) window.location.href = whatsAppAppUrl(waMe);
  else void Linking.openURL(waMe);
}
