import { Stack } from "expo-router";

import { useStackHeader } from "@/components/stack-header";
import { stackBackdrop, useTheme } from "@/theme";

// An old /conversas/<id> link lands on the redirect: the list stays underneath to go back to.
export const unstable_settings = { initialRouteName: "index" };

/** The Conversas tab: the conversation list (each chat opens /chat/<id>, outside the tabs). */
export default function ChatsLayout() {
  const { scheme } = useTheme();
  const header = useStackHeader("Conversas");
  return (
    <Stack screenOptions={{ ...header, contentStyle: stackBackdrop(scheme) }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
