import { Stack } from "expo-router";

import { useStackHeader } from "@/components/stack-header";
import { stackBackdrop, useTheme } from "@/theme";

/** The Perfil tab: your mini profile, the friend list (search and requests) and profiles pushed on top with a back button. */
export default function FriendsLayout() {
  const { scheme } = useTheme();
  const header = useStackHeader("Perfil");
  return (
    <Stack screenOptions={{ ...header, contentStyle: stackBackdrop(scheme) }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
