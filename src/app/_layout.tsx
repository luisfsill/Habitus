import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Fragment, useEffect } from "react";
import { Appearance, Platform, View } from "react-native";

import { AppText } from "@/components/app-text";
import { InstallGate } from "@/components/install-gate";
import { DesktopLanding } from "@/components/landing-modal";
import { PrimaryButton } from "@/components/primary-button";
import { Celebration } from "@/components/celebration";
import { DesktopFrame } from "@/components/desktop-frame";
import { RewardToast } from "@/components/reward-toast";
import { useStackHeader } from "@/components/stack-header";
import { WaterBackdrop } from "@/components/water-backdrop";
import { AccessProvider, useAccess } from "@/state/access";
import { AppStateProvider, useAppState } from "@/state/app-state";
import { AuthProvider, useAuth } from "@/state/auth";
import { framedOnDesktop, inDesktopFrame, leaveLoginModal, mirrorToWindow } from "@/state/desktop-frame";
import { TransitionProvider, useCurtainHold } from "@/state/transition";
import { isIPhone, isMobileWeb, isStandalone, useInstallPrompt } from "@/state/use-install-prompt";
import { useNotificationRouting } from "@/state/use-notification-routing";
import { WebSafeAreaInsets } from "@/state/web-safe-area";
import { type Palette, palettes, stackBackdrop, ThemePreferenceContext, useTheme } from "@/theme";

void SplashScreen.preventAutoHideAsync();

function navigationTheme(colors: Palette, scheme: "light" | "dark") {
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    // Web: clear, so the water canvas behind the app shows through every screen.
    colors: { ...base.colors, primary: colors.accent, background: Platform.OS === "web" ? "transparent" : colors.background, card: colors.surface, text: colors.label },
  };
}

/**
 * On a phone's browser the app is install-only; it runs from the home screen icon.
 * In development (npm run dev, on localhost or the LAN address) only a signed-out "/" shows the install screen,
 * with sign-in working, so both the install steps and the app can be tested in the phone's browser.
 */
function installOnly(signedIn: boolean, pathname: string): boolean {
  if (!isMobileWeb() || isStandalone() || pathname.startsWith("/legal")) return false;
  return !__DEV__ || (!signedIn && pathname === "/");
}

/** A computer's browser, not the installed app: visitors get the landing page at "/" (inside the desktop frame they sign in instead). */
function desktopWeb(): boolean {
  return Platform.OS === "web" && !isMobileWeb() && !isStandalone() && !inDesktopFrame();
}

/** Full page loads: the landing page renders instead of the navigator, so there is no router to push to. */
function go(path: string) {
  window.location.assign(path);
}

/** Screens shown instead of the app: the landing page that asks to install on a phone's browser, the landing page for desktop visitors at "/". */
function entryScreen(signedIn: boolean, pathname: string, install: ReturnType<typeof useInstallPrompt>) {
  const onLegal = (page: "terms" | "privacy") => go(`/legal/${page}`);
  // The landing's legal links open as pages of their own.
  if (installOnly(signedIn, pathname)) {
    return (
      <InstallGate
        mode={install.mode === "hidden" ? "manual" : install.mode}
        installed={install.installed}
        iPhone={isIPhone()}
        onInstall={() => void install.install()}
        onLegal={onLegal}
        canSignIn={__DEV__}
      />
    );
  }
  if (!signedIn && pathname === "/" && desktopWeb()) {
    return <DesktopLanding onLegal={onLegal} />;
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
    // Every account picks a @ before the app opens.
    named: access.profile?.username != null,
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
function homeRoute(signedIn: boolean, open: boolean, onboarded: boolean, named: boolean) {
  if (!signedIn) return "/auth";
  if (!open) return "/renovar";
  if (!onboarded) return "/onboarding";
  return named ? "/" : "/arroba";
}

/** The AuthShell screens (account and plan renewal) are the black night sky; install screen and legal pages are themed. */
function nightSky(signedIn: boolean, entry: boolean, pathname: string): boolean {
  if (entry) return false;
  return pathname.startsWith("/renovar") || pathname.startsWith("/arroba") || (!signedIn && pathname.startsWith("/auth"));
}

/** Web: one water shader behind the whole app. The tips bring their own scenes instead (one shader per screen). */
function AppWater({ pathname, scheme, night }: { pathname: string; scheme: "light" | "dark"; night: boolean }) {
  if (Platform.OS !== "web" || pathname.startsWith("/trick")) return null;
  return <WaterBackdrop scheme={night ? "dark" : scheme} />;
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
  const { ready: dataReady, data, reward, dismissReward, celebration, dismissCelebration } = useAppState();
  const gates = useGates();
  const { signedIn, open, named } = gates;
  const ready = dataReady && gates.ready;
  const { colors, scheme } = useTheme();
  useNotificationRouting(ready && open && data.onboarded);
  const install = useInstallPrompt();
  const pathname = usePathname();
  const backToToday = useStackHeader("Hoje");

  useCurtainHold(!ready);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    // The web document scrolls: a new screen starts at the top, like a new page.
    if (Platform.OS === "web") window.scrollTo(0, 0);
    mirrorToWindow();
    if (signedIn) leaveLoginModal();
  }, [pathname, signedIn]);

  const entry = entryScreen(signedIn, pathname, install);
  const night = nightSky(signedIn, entry !== null, pathname);

  useEffect(() => {
    // theme-color is for Android/older iOS. iOS 26+ fills the status bar with the colour of the #status-bar strip
    // (public/index.html). The installed iPhone app clips the page one top inset above the screen bottom and fills
    // the rest with the body colour alone, and the document scrolls past the screens' own boxes: body, strip and
    // page share the flat backdrop colour.
    if (Platform.OS !== "web") return;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors.background);
    const flat = night ? palettes.dark.background : colors.background;
    document.body.style.backgroundColor = flat;
    const bar = document.getElementById("status-bar");
    if (bar) bar.style.backgroundColor = flat;
  }, [colors.background, night]);

  if (!ready) return null;

  const home = homeRoute(signedIn, open, data.onboarded, named);

  if (gates.offline) return <OfflineGate onRetry={gates.retry} />;

  if (entry) return entry;

  return (
    <ThemeProvider value={navigationTheme(colors, scheme)}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <AppWater pathname={pathname} scheme={scheme} night={night} />
      <Stack screenOptions={{ headerShown: false, contentStyle: stackBackdrop(scheme) }}>
        <Stack.Protected guard={!signedIn} redirectTo={home}>
          <Stack.Screen name="auth" options={{ animation: "fade" }} />
        </Stack.Protected>
        <Stack.Protected guard={home === "/"} redirectTo={home}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="trick/[id]" options={backToToday} />
          <Stack.Screen name="lembretes/index" options={backToToday} />
          <Stack.Screen name="lembretes/[id]" options={{ ...backToToday, headerBackTitle: "Lembretes" }} />
        </Stack.Protected>
        <Stack.Protected guard={home === "/arroba"} redirectTo={home}>
          <Stack.Screen name="arroba" options={{ gestureEnabled: false, animation: "fade" }} />
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
      {celebration !== null && <Celebration key={celebration} trick={celebration} onDone={dismissCelebration} />}
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

// The installed iPhone app needs real insets to keep the title below the clock and pinned footers above the home indicator.
const SafeArea = Platform.OS === "web" ? WebSafeAreaInsets : Fragment;

const framed = framedOnDesktop();

/** On a computer this window only holds the frame; the app runs inside it. */
function FramedApp() {
  useEffect(() => void SplashScreen.hideAsync(), []);
  return <DesktopFrame src={window.location.pathname + window.location.search} />;
}

export default function RootLayout() {
  if (framed) return <FramedApp />;
  return (
    <SafeArea>
      <AuthProvider>
        <TransitionProvider>
          <AccountRoot />
        </TransitionProvider>
      </AuthProvider>
    </SafeArea>
  );
}
