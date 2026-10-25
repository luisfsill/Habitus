import { Redirect, Stack } from "expo-router";

import { useAccess } from "@/state/access";
import { useTheme } from "@/theme";

/** Only administrators get past this layout; anyone else goes back to Hoje. */
export default function AdminLayout() {
  const { isAdmin, ready } = useAccess();
  const { colors } = useTheme();
  if (ready && !isAdmin) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: "",
        headerBackTitle: "Usuários",
        headerTransparent: true,
        headerTintColor: colors.accent,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
