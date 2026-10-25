import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import type { ResponseIntent } from "@/domain/notification-actions";
import { applyResponse } from "@/services/notification-responses";

import { useAppState } from "./app-state";

/**
 * Taps open the trick screen; "Feito"/"Adiar" apply their side effect and
 * refresh state. Also handles the response that cold-started the app.
 */
export function useNotificationRouting(enabled: boolean) {
  const { refresh } = useAppState();

  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;
    const route = async (response: Notifications.NotificationResponse) => {
      const intent: ResponseIntent = await applyResponse(response);
      if (intent.type === "open-trick") router.push({ pathname: "/trick/[id]", params: { id: String(intent.trickIndex) } });
      if (intent.type === "open-today") router.navigate("/");
      if (intent.type === "done" || intent.type === "snooze") await refresh();
      await Notifications.clearLastNotificationResponseAsync();
    };

    void Notifications.getLastNotificationResponseAsync().then((last) => last && route(last));
    const sub = Notifications.addNotificationResponseReceivedListener((r) => void route(r));
    return () => sub.remove();
  }, [enabled, refresh]);
}
