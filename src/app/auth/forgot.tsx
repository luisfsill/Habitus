import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { AppText } from "@/components/app-text";
import { AuthField } from "@/components/auth-field";
import { AuthShell } from "@/components/auth-shell";
import { CodeInput } from "@/components/code-input";
import { PasswordMeter } from "@/components/password-meter";
import { PrimaryButton } from "@/components/primary-button";
import { isValidEmail, passwordChecks } from "@/domain/auth-rules";
import { useAuth } from "@/state/auth";
import { useCountdown } from "@/state/use-countdown";
import { space } from "@/theme";

type Step = "email" | "code" | "password";

const COPY: Record<Step, { title: string; subtitle: string }> = {
  email: { title: "Esqueceu a senha?", subtitle: "Digite o e-mail da sua conta. Enviamos um código para criar uma nova senha." },
  code: { title: "Digite o código", subtitle: "Enviamos um código de 6 dígitos para o seu e-mail. Confira também o spam." },
  password: { title: "Nova senha", subtitle: "Escolha uma senha nova. Depois disso você já entra no app." },
};

/** E-mail, then code, then new password, all inside the app. */
export default function ForgotScreen() {
  const auth = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const [left, restart] = useCountdown(60);

  const run = async (action: () => Promise<{ ok: true } | { ok: false; message: string }>, next?: Step) => {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      setShake((n) => n + 1);
      if (step === "code") setCode("");
      return;
    }
    if (next) setStep(next);
  };

  const sendCode = () => {
    if (!isValidEmail(email)) {
      setError("Digite um e-mail válido.");
      setShake((n) => n + 1);
      return;
    }
    restart();
    void run(() => auth.requestReset(email), "code");
  };

  const savePassword = () => {
    const checks = passwordChecks(password);
    if (!(checks.length && checks.letter && checks.number)) {
      setError("A senha precisa de 8+ caracteres, com letras e números.");
      setShake((n) => n + 1);
      return;
    }
    // On success the reset ends and the root layout opens the app.
    void run(() => auth.updatePassword(password));
  };

  const back = () => {
    if (step === "password") void auth.cancelRecovery();
    router.back();
  };

  return (
    <AuthShell
      title={<AppText variant="largeTitle" style={styles.title}>{COPY[step].title}</AppText>}
      subtitle={<AppText variant="callout" color="secondaryLabel">{COPY[step].subtitle}</AppText>}
      footer={<PrimaryButton variant="plain" label="Voltar para entrar" onPress={back} />}>
      <Animated.View key={step} entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={styles.step}>
        {step === "email" && (
          <AuthField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" onSubmitEditing={sendCode} />
        )}
        {step === "code" && (
          <CodeInput value={code} onChange={setCode} error={!!error} onComplete={(value) => void run(() => auth.verifyReset(email, value), "password")} />
        )}
        {step === "password" && (
          <>
            <AuthField label="Nova senha" value={password} onChangeText={setPassword} secure autoComplete="new-password" textContentType="newPassword" onSubmitEditing={savePassword} />
            {password.length > 0 && <PasswordMeter password={password} />}
          </>
        )}
        {error && (
          <AppText variant="footnote" align="center" style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </AppText>
        )}
        {step === "email" && <PrimaryButton label="Enviar código" onPress={sendCode} loading={busy} shake={shake} glow />}
        {step === "code" && (
          <>
            <PrimaryButton label="Confirmar" onPress={() => void run(() => auth.verifyReset(email, code), "password")} disabled={code.length < 6} loading={busy} shake={shake} glow />
            <PrimaryButton
              variant="plain"
              label={left > 0 ? `Reenviar código em ${left}s` : "Reenviar código"}
              disabled={left > 0}
              onPress={() => {
                restart();
                void run(() => auth.requestReset(email));
              }}
            />
          </>
        )}
        {step === "password" && <PrimaryButton label="Salvar e entrar" onPress={savePassword} loading={busy} shake={shake} glow />}
      </Animated.View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  title: { color: "#FFFFFF", fontWeight: "800" },
  step: { gap: space.md },
  error: { color: "#F87171" },
});
