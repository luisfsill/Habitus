import { Alert, Platform } from "react-native";

import { useAuth } from "./auth";

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
  return async () => {
    if ((await signOut()) === "unsynced") {
      confirm(
        "Sair sem enviar?",
        "Algumas mudanças ainda não foram enviadas e serão perdidas. Sair mesmo assim?",
        "Sair",
        () => void signOut({ force: true }),
      );
    }
  };
}
