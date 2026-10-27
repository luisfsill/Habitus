import { router } from "expo-router";
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
  const { profile } = useAccess();
  const { session } = useAuth();
  const signOut = useSignOut();
  // On a phone the name and e-mail would push the title onto three lines.
  const compact = useWindowDimensions().width < 520;
  const email = session?.user.email;
  if (!email) return null;
  return (
    <AccountMenu
      name={profile?.name || email}
      email={email}
      compact={compact}
      progress={doneCount(data.completions, dayKey(new Date())) / TRICK_COUNT}
      onTheme={(theme) => void updateSettings({ theme })}
      menu={[
        { label: "Renovar plano", icon: { ios: "arrow.clockwise.circle", android: "autorenew" }, onPress: () => router.push("/renovar") },
        { label: "Sair", icon: { ios: "rectangle.portrait.and.arrow.right", android: "logout" }, destructive: true, onPress: () => void signOut() },
      ]}
    />
  );
}
