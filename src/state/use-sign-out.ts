import { Alert, Platform } from "react-native";

import { useAuth } from "./auth";
import { useCurtain } from "./transition";

/** Destructive confirmation: a native alert, or the browser's confirm on web. */
export function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: action, style: "destructive", onPress: onConfirm },
  ]);
}

/** Signs out, asking first when unsent changes would be lost. */
export function useSignOut(): () => Promise<void> {
  const { signOut } = useAuth();
  const curtain = useCurtain();
  return async () => {
    // The curtain goes up before the sync, so the wait is covered too.
    curtain.begin("out");
    const result = await signOut().catch((error: unknown) => {
      curtain.cancel();
      throw error;
    });
    if (result === "unsynced") {
      curtain.cancel();
      confirm(
        "Sair sem enviar?",
        "Algumas mudanças ainda não foram enviadas e serão perdidas. Sair mesmo assim?",
        "Sair",
        () => {
          curtain.begin("out");
          void signOut({ force: true });
        },
      );
    }
  };
}
