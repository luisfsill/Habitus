import { Stack } from "expo-router";

import { useStackHeader } from "@/components/stack-header";
import { stackBackdrop, useTheme } from "@/theme";

// A link straight to /settings/conta or /settings/afirmacoes still has the menu underneath to go back to.
export const unstable_settings = { initialRouteName: "index" };

/** The Ajustes tab: a menu, then each group of settings pushed on top with a back button. */
export default function SettingsLayout() {
  const { scheme } = useTheme();
  const header = useStackHeader("Ajustes");
  return (
    <Stack screenOptions={{ ...header, contentStyle: stackBackdrop(scheme) }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
