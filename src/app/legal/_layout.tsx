import { Stack } from "expo-router";

import { useTheme } from "@/theme";

export default function LegalLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: "",
        headerBackTitle: "Voltar",
        headerTransparent: true,
        headerTintColor: colors.accent,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
