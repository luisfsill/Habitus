import { Stack } from "expo-router";

import { stackBackdrop, useTheme } from "@/theme";

export default function LegalLayout() {
  const { colors, scheme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: "",
        headerBackTitle: "Voltar",
        headerTransparent: true,
        headerTintColor: colors.accent,
        contentStyle: stackBackdrop(scheme),
      }}
    />
  );
}
