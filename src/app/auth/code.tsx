import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { AuthShell } from "@/components/auth-shell";
import { CodeInput } from "@/components/code-input";
import { PrimaryButton } from "@/components/primary-button";
import { useAuth } from "@/state/auth";
import { useCountdown } from "@/state/use-countdown";
import { space } from "@/theme";

/** Confirms a new account with the 6-digit code sent by e-mail. */
export default function CodeScreen() {
  const auth = useAuth();
  const { email = "" } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const [left, restart] = useCountdown(60);

  const verify = async (value: string) => {
    setBusy(true);
    setError(null);
    const result = await auth.verifySignup(email, value);
    setBusy(false);
    if (result.ok) return; // The session arrives and the root layout opens the app.
    setError(result.message);
    setCode("");
    setShake((n) => n + 1);
  };

  const resend = async () => {
    const result = await auth.resendSignup(email);
    if (result.ok) {
      setNotice("Enviamos um novo código.");
      restart();
    } else setError(result.message);
  };

  return (
    <AuthShell
      title={<AppText variant="largeTitle" style={styles.title}>Confira seu e-mail</AppText>}
      subtitle={
        <AppText variant="callout" color="secondaryLabel">
          Enviamos um código de 6 dígitos para {email}. Ele pode levar um minuto para chegar; confira também o spam.
        </AppText>
      }>
      <CodeInput value={code} onChange={setCode} onComplete={(value) => void verify(value)} error={!!error} />
      {(error ?? notice) && (
        <AppText variant="footnote" align="center" style={{ color: error ? "#F87171" : "#34D399" }} accessibilityLiveRegion="polite">
          {error ?? notice}
        </AppText>
      )}
      <PrimaryButton label="Confirmar" onPress={() => void verify(code)} disabled={code.length < 6} loading={busy} shake={shake} glow />
      <View style={styles.links}>
        <PrimaryButton
          variant="plain"
          label={left > 0 ? `Reenviar código em ${left}s` : "Reenviar código"}
          onPress={() => void resend()}
          disabled={left > 0}
        />
        <PrimaryButton variant="plain" label="Trocar e-mail" onPress={() => router.back()} />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  title: { color: "#FFFFFF", fontWeight: "800" },
  links: { gap: space.xs },
});
