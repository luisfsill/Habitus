import { Stack } from "expo-router";

import { useStackHeader } from "@/components/stack-header";
import { stackBackdrop, useTheme } from "@/theme";

/** The Amigos tab: the list (search is inline), then profiles pushed on top with a back button. */
export default function FriendsLayout() {
  const { scheme } = useTheme();
  const header = useStackHeader("Amigos");
  return (
    <Stack screenOptions={{ ...header, contentStyle: stackBackdrop(scheme) }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
