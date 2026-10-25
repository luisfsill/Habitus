import { Stack } from "expo-router";

import { ThemePreferenceContext } from "@/theme";

/** The account screens are always dark, whatever the Aparência setting. */
export default function AuthLayout() {
  return (
    <ThemePreferenceContext.Provider value="dark">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000000" }, animation: "fade" }} />
    </ThemePreferenceContext.Provider>
  );
}
