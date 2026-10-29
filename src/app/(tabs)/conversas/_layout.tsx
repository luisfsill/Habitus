import { Stack } from "expo-router";

import { useStackHeader } from "@/components/stack-header";
import { stackBackdrop, useTheme } from "@/theme";

// "Mandar mensagem" opens /conversas/<id> straight from Perfil: the list stays underneath to go back to.
export const unstable_settings = { initialRouteName: "index" };

/** The Conversas tab: the conversation list, with each chat pushed on top (later task). */
export default function ChatsLayout() {
  const { scheme } = useTheme();
  const header = useStackHeader("Conversas");
  return (
    <Stack screenOptions={{ ...header, contentStyle: stackBackdrop(scheme) }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
