import { Redirect, Stack } from "expo-router";

import { useStackHeader } from "@/components/stack-header";
import { useAccess } from "@/state/access";
import { stackBackdrop, useTheme } from "@/theme";

/** Only administrators get past this layout; anyone else goes back to Hoje. */
export default function AdminLayout() {
  const { isAdmin, ready } = useAccess();
  const { scheme } = useTheme();
  const header = useStackHeader("Usuários");
  if (ready && !isAdmin) return <Redirect href="/" />;
  return (
    <Stack screenOptions={{ ...header, contentStyle: stackBackdrop(scheme) }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
