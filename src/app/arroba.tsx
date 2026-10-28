import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";

import { AppText } from "@/components/app-text";
import { AuthShell } from "@/components/auth-shell";
import { PrimaryButton } from "@/components/primary-button";
import { UsernameField } from "@/components/username-field";
import { usernameCandidates } from "@/domain/username";
import { usernameAvailable } from "@/services/social";
import { useAccess } from "@/state/access";
import { useUsernameCheck } from "@/state/use-username-check";
import { ThemePreferenceContext } from "@/theme";

/** Required once per account: the @ friends search for. No way back or around it. */
function ArrobaScreen() {
  const { profile, isAdmin, setUsername } = useAccess();
  const { value, status, change } = useUsernameCheck(isAdmin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typed = useRef(false);
  const name = profile?.name ?? "";

  // Fill the field with the first free @ made from the name, unless the person already started typing.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const candidates = usernameCandidates(name);
      for (const candidate of candidates) {
        try {
          if (!(await usernameAvailable(candidate))) continue;
        } catch {
          // Let the field's own check show the failure once, instead of retrying here.
          if (!cancelled && !typed.current) change(candidate, 0);
          return;
        }
        if (!cancelled && !typed.current) change(candidate, 0);
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs once per name; change is stable for the account's role.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const save = () => {
    setSaving(true);
    setError(null);
    setUsername(value)
      .catch((e: Error) => setError(e.message))
      .finally(() => setSaving(false));
  };

  return (
    <AuthShell
      title={
        <AppText variant="largeTitle" style={styles.title}>
          Escolha seu @
        </AppText>
      }
      subtitle={
        <AppText variant="callout" color="secondaryLabel">
          É assim que seus amigos vão achar você.
        </AppText>
      }>
      <UsernameField
        value={value}
        onChange={(text) => {
          typed.current = true;
          change(text);
        }}
        status={status}
      />
      <PrimaryButton label="Continuar" onPress={save} disabled={status !== "available"} loading={saving} glow />
      {error && (
        <AppText variant="footnote" align="center" accessibilityLiveRegion="polite" color="danger">
          {error}
        </AppText>
      )}
    </AuthShell>
  );
}

export default function ArrobaRoute() {
  return (
    <ThemePreferenceContext.Provider value="dark">
      <ArrobaScreen />
    </ThemePreferenceContext.Provider>
  );
}

const styles = StyleSheet.create({
  title: { color: "#FFFFFF", fontWeight: "800" },
});
