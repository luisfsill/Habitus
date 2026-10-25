import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Appearance, Platform } from "react-native";

import { InstallGate } from "@/components/install-gate";
import { RewardToast } from "@/components/reward-toast";
import { AppStateProvider, useAppState } from "@/state/app-state";
import { isIPhone, isMobileWeb, isStandalone, useInstallPrompt } from "@/state/use-install-prompt";
import { useNotificationRouting } from "@/state/use-notification-routing";
import { ThemePreferenceContext, useTheme } from "@/theme";

void SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { ready, data, reward, dismissReward } = useAppState();
  const { colors, scheme } = useTheme();
  useNotificationRouting(ready && data.onboarded);
  const install = useInstallPrompt();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: colors.accent, background: colors.background, card: colors.surface, text: colors.label },
  };

  // On a phone's browser the app is install-only; it runs from the home screen icon.
  if (isMobileWeb() && !isStandalone()) {
    return (
      <InstallGate
        mode={install.mode === "hidden" ? "manual" : install.mode}
        installed={install.installed}
        iPhone={isIPhone()}
        onInstall={() => void install.install()}
      />
    );
  }

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
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

/** Applies the Aparência choice from Ajustes (automático, claro ou escuro). */
function ThemedRoot() {
  const preference = useAppState().data.settings.theme;
  useEffect(() => {
    // Native pickers and tab bars follow Appearance; the web has no override, useTheme covers it.
    if (Platform.OS !== "web") Appearance.setColorScheme(preference);
  }, [preference]);
  return (
    <ThemePreferenceContext.Provider value={preference}>
      <RootStack />
    </ThemePreferenceContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <AppStateProvider>
      <ThemedRoot />
    </AppStateProvider>
  );
}

