import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { RewardToast } from "@/components/reward-toast";
import { AppStateProvider, useAppState } from "@/state/app-state";
import { useNotificationRouting } from "@/state/use-notification-routing";
import { useTheme } from "@/theme";

void SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { ready, data, reward, dismissReward } = useAppState();
  const { colors, scheme } = useTheme();
  useNotificationRouting(ready && data.onboarded);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: colors.accent, background: colors.background, card: colors.surface, text: colors.label },
  };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={data.onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="trick/[id]"
            options={{
              headerShown: true,
              headerTitle: "",
              headerBackTitle: "Hoje",
              headerTransparent: true,
              headerTintColor: colors.accent,
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!data.onboarded}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: "fade" }} />
        </Stack.Protected>
      </Stack>
      {reward && <RewardToast reward={reward} onHide={dismissReward} />}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppStateProvider>
      <RootStack />
    </AppStateProvider>
  );
}

