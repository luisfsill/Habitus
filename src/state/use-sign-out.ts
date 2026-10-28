import { useEffect, useState } from "react";
import { Alert, Platform } from "react-native";

import { useAuth } from "./auth";
import { useCurtain } from "./transition";

export interface ConfirmAsk {
  title: string;
  message: string;
  action: string;
  onConfirm: () => void;
}

// Set while the web dialog host is mounted (root layout).
let showDialog: ((ask: ConfirmAsk) => void) | null = null;

/** Destructive confirmation: a native alert, or the app's own dialog on web (the browser's confirm before the host mounts). */
export function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (showDialog) showDialog({ title, message, action, onConfirm });
    else if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: action, style: "destructive", onPress: onConfirm },
  ]);
}

/** The web dialog's state: the open question, or null, and a way to close it. */
export function useConfirmHost(): [ConfirmAsk | null, () => void] {
  const [ask, setAsk] = useState<ConfirmAsk | null>(null);
  useEffect(() => {
    showDialog = setAsk;
    return () => {
      showDialog = null;
    };
  }, []);
  return [ask, () => setAsk(null)];
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
