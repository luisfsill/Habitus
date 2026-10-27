import { Stack } from "expo-router";

import { useStackHeader } from "@/components/stack-header";
import { backdrops, useTheme } from "@/theme";

export default function LegalLayout() {
  const { scheme } = useTheme();
  const header = useStackHeader("Voltar");
  return <Stack screenOptions={{ ...header, contentStyle: backdrops[scheme] }} />;
}
