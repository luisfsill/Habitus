import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Appearance, Platform, View } from "react-native";

import { AppText } from "@/components/app-text";
import { InstallGate } from "@/components/install-gate";
import { LandingPage } from "@/components/landing-page";
import { PrimaryButton } from "@/components/primary-button";
import { RewardToast } from "@/components/reward-toast";
import { AccessProvider, useAccess } from "@/state/access";
import { AppStateProvider, useAppState } from "@/state/app-state";
import { AuthProvider, useAuth } from "@/state/auth";
import { isIPhone, isMobileWeb, isStandalone, useInstallPrompt } from "@/state/use-install-prompt";
import { useNotificationRouting } from "@/state/use-notification-routing";
import { backdrops, type Palette, ThemePreferenceContext, useTheme } from "@/theme";

void SplashScreen.preventAutoHideAsync();

function navigationTheme(colors: Palette, scheme: "light" | "dark") {
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, primary: colors.accent, background: colors.background, card: colors.surface, text: colors.label },
  };
}

/** On a phone's browser the app is install-only; it runs from the home screen icon. */
function installOnly(): boolean {
  return isMobileWeb() && !isStandalone();
}

/** A computer's browser, not the installed app: visitors get the landing page at "/". */
function desktopWeb(): boolean {
  return Platform.OS === "web" && !isMobileWeb() && !isStandalone();
}

/** Full page loads: the landing page renders instead of the navigator, so there is no router to push to. */
function go(path: string) {
  window.location.assign(path);
}

/** Screens shown instead of the app: install-only on a phone's browser, the landing page for desktop visitors at "/". */
function entryScreen(signedIn: boolean, pathname: string, install: ReturnType<typeof useInstallPrompt>) {
  if (installOnly()) {
    return (
      <InstallGate
        mode={install.mode === "hidden" ? "manual" : install.mode}
        installed={install.installed}
        iPhone={isIPhone()}
        onInstall={() => void install.install()}
      />
    );
  }
  if (!signedIn && pathname === "/" && desktopWeb()) {
    return <LandingPage onStart={() => go("/auth")} onSignIn={() => go("/auth?modo=entrar")} onLegal={(page) => go(`/legal/${page}`)} />;
  }
  return null;
}

/** Which part of the app the person may see right now. */
function useGates() {
  const { session, recovering } = useAuth();
  const access = useAccess();
  // No session (or mid password reset): only the account screens.
  const signedIn = session !== null && !recovering;
  return {
    signedIn,
    // Signed in with an active plan (or admin): the app itself.
    open: signedIn && access.hasAccess,
    // Signed in but the plan is unknown (offline, never cached): ask to reconnect.
    offline: signedIn && access.ready && access.offline,
    ready: !signedIn || access.ready,
    retry: access.refresh,
  };
}

/**
 * Where a screen that just became off-limits goes. Without it, Expo Router picks the first
 * open route alphabetically, which is "legal": after confirming the code the user saw the terms.
 */
function homeRoute(signedIn: boolean, open: boolean, onboarded: boolean) {
  if (!signedIn) return "/auth";
  if (!open) return "/renovar";
  return onboarded ? "/" : "/onboarding";
}

/** First open without internet: the plan cannot be checked yet. */
function OfflineGate({ onRetry }: { onRetry: () => Promise<unknown> }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16, backgroundColor: "#000" }}>
      <AppText variant="title3" align="center" style={{ color: "#fff" }}>
        Sem conexão
      </AppText>
      <AppText variant="subheadline" align="center" style={{ color: "#A1A1AA" }}>
        Conecte-se à internet para conferir o seu plano. Depois disso o Habitus funciona offline.
      </AppText>
      <PrimaryButton label="Tentar de novo" onPress={() => void onRetry()} />
    </View>
  );
}

function RootStack() {
  const { ready: dataReady, data, reward, dismissReward } = useAppState();
  const gates = useGates();
  const { signedIn, open } = gates;
  const ready = dataReady && gates.ready;
  const { colors, scheme } = useTheme();
  useNotificationRouting(ready && open && data.onboarded);
  const install = useInstallPrompt();
  const pathname = usePathname();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    // The iOS PWA status bar takes theme-color; the body shows during overscroll.
    if (Platform.OS !== "web") return;
    document.body.style.backgroundColor = colors.background;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors.background);
  }, [colors.background]);

  if (!ready) return null;

  const theme = navigationTheme(colors, scheme);
  const home = homeRoute(signedIn, open, data.onboarded);

  if (gates.offline) return <OfflineGate onRetry={gates.retry} />;

  const entry = entryScreen(signedIn, pathname, install);
  if (entry) return entry;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: backdrops[scheme] }}>
        <Stack.Protected guard={!signedIn} redirectTo={home}>
          <Stack.Screen name="auth" options={{ animation: "fade" }} />
        </Stack.Protected>
        <Stack.Protected guard={open && data.onboarded} redirectTo={home}>
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
        <Stack.Protected guard={open && !data.onboarded} redirectTo={home}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: "fade" }} />
        </Stack.Protected>
        {/* With no plan this is the only screen; with a plan, "Ver planos" opens it on top. */}
        <Stack.Protected guard={signedIn} redirectTo={home}>
          <Stack.Screen name="renovar" options={{ animation: "fade", gestureEnabled: open }} />
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
    <AccessProvider key={userId ?? "signed-out"} userId={userId}>
      <AccountData userId={userId} />
    </AccessProvider>
  );
}

/** Reminders stop when the plan ends; with no plan, none are scheduled. */
function AccountData({ userId }: { userId: string | null }) {
  const { profile, hasAccess } = useAccess();
  const unlimited = profile?.role === "admin" || profile?.unlimited === true;
  const cutoff = !userId || !hasAccess ? 0 : unlimited || !profile?.accessUntil ? null : Date.parse(profile.accessUntil);
  return (
    <AppStateProvider key={userId ?? "signed-out"} userId={userId} accessCutoff={cutoff}>
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

