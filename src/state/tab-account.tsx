import { router, usePathname } from "expo-router";
import { useWindowDimensions } from "react-native";

import { AccountMenu } from "@/components/account-menu";
import { doneCount } from "@/domain/history";
import { dayKey } from "@/domain/time";
import { TRICK_COUNT } from "@/domain/tricks";

import { useAccess } from "./access";
import { useAppState } from "./app-state";
import { useAuth } from "./auth";
import { useSignOut } from "./use-sign-out";

/** The account button in the top-right corner of every tab. */
export function TabAccount() {
  const { data, updateSettings } = useAppState();
  const { profile, isAdmin } = useAccess();
  const { session } = useAuth();
  const signOut = useSignOut();
  const inAdmin = usePathname().startsWith("/admin");
  // On a phone the name and e-mail would push the title onto three lines.
  const compact = useWindowDimensions().width < 520;
  const email = session?.user.email;
  if (!email) return null;
  return (
    <AccountMenu
      name={profile?.name || email}
      photo={profile?.avatarUrl}
      email={email}
      compact={compact}
      progress={doneCount(data.completions, dayKey(new Date())) / TRICK_COUNT}
      onTheme={(theme) => void updateSettings({ theme })}
      menu={[
        { label: "Renovar plano", icon: { ios: "arrow.clockwise.circle", android: "autorenew" }, onPress: () => router.push("/renovar") },
        // Inside the admin area, the way back to the app takes the admin item's place.
        ...(inAdmin
          ? [{ label: "Voltar para o app", icon: { ios: "house", android: "home" }, onPress: () => router.navigate("/") }]
          : isAdmin
            ? [{ label: "Área admin", icon: { ios: "shield", android: "admin_panel_settings" }, onPress: () => router.navigate("/admin") }]
            : []),
        { label: "Termos e Privacidade", icon: { ios: "doc.text", android: "description" }, onPress: () => router.push("/legal/terms") },
        { label: "Sair", icon: { ios: "rectangle.portrait.and.arrow.right", android: "logout" }, destructive: true, onPress: () => void signOut() },
      ]}
    />
  );
}
