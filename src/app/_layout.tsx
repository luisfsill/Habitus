import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Appearance, Platform, View } from "react-native";

import { AppText } from "@/components/app-text";
import { InstallGate } from "@/components/install-gate";
import { RewardToast } from "@/components/reward-toast";
import { AppStateProvider, useAppState } from "@/state/app-state";
import { AuthProvider, useAuth } from "@/state/auth";
import { isIPhone, isMobileWeb, isStandalone, useInstallPrompt } from "@/state/use-install-prompt";
import { useNotificationRouting } from "@/state/use-notification-routing";
import { type Palette, ThemePreferenceContext, useTheme } from "@/theme";

void SplashScreen.preventAutoHideAsync();

function navigationTheme(colors: Palette, scheme: "light" | "dark") {
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, primary: colors.accent, background: colors.background, card: colors.surface, text: colors.label },
  };
}

function RootStack() {
  const { ready, data, reward, dismissReward } = useAppState();
  const { session, recovering } = useAuth();
  const { colors, scheme } = useTheme();
  // No session (or mid password reset): only the account screens.
  const signedIn = session !== null && !recovering;
  useNotificationRouting(ready && signedIn && data.onboarded);
  const install = useInstallPrompt();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    // The iOS PWA status bar is translucent and shows the page background behind it.
    if (Platform.OS === "web") document.body.style.backgroundColor = colors.background;
  }, [colors.background]);

  if (!ready) return null;

  const theme = navigationTheme(colors, scheme);

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
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="auth" options={{ animation: "fade" }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && data.onboarded}>
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
        <Stack.Protected guard={signedIn && !data.onboarded}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: "fade" }} />
        </Stack.Protected>
        <Stack.Screen name="legal" />
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

/** Shown when the build has no Supabase variables, instead of a broken login. */
function MissingConfig() {
  useEffect(() => void SplashScreen.hideAsync(), []);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#000" }}>
      <AppText variant="title3" align="center" style={{ color: "#fff" }}>
        Configuração do servidor ausente
      </AppText>
      <AppText variant="subheadline" align="center" style={{ color: "#A1A1AA", marginTop: 8 }}>
        Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY e gere o app de novo.
      </AppText>
    </View>
  );
}

/** One data store per account: switching accounts remounts it with that account's data. */
function AccountRoot() {
  const { configured, ready, session, recovering } = useAuth();
  if (!configured) return <MissingConfig />;
  if (!ready) return null;
  // Mid password reset the session is temporary: keep the account screens mounted.
  const userId = recovering ? null : (session?.user.id ?? null);
  return (
    <AppStateProvider key={userId ?? "signed-out"} userId={userId}>
      <ThemedRoot />
    </AppStateProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AccountRoot />
    </AuthProvider>
  );
}

