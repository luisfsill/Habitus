import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedStyle, withSpring } from "react-native-reanimated";

import { AppText } from "@/components/app-text";
import { AuthField } from "@/components/auth-field";
import { AuthShell } from "@/components/auth-shell";
import { Icon } from "@/components/icon";
import { PasswordMeter } from "@/components/password-meter";
import { PrimaryButton } from "@/components/primary-button";
import { ShimmerTitle } from "@/components/shimmer-title";
import { isValidEmail, passwordChecks } from "@/domain/auth-rules";
import { useAuth } from "@/state/auth";
import { HIT, radius, space, useTheme } from "@/theme";

type Mode = "signup" | "signin";

function Tabs({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const [width, setWidth] = useState(0);
  const indicator = useAnimatedStyle(() => ({
    width: width / 2 - 3,
    transform: [{ translateX: withSpring(mode === "signup" ? 0 : width / 2, { damping: 20, stiffness: 220 }) }],
  }));
  return (
    <View style={styles.tabs} accessibilityRole="tablist" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.indicator, indicator]} />
      {(["signup", "signin"] as const).map((m) => (
        <Pressable
          key={m}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === m }}
          onPress={() => onChange(m)}
          style={styles.tab}>
          <AppText variant="subheadline" style={{ fontWeight: mode === m ? "700" : "500", color: mode === m ? "#FFFFFF" : "#A1A1AA" }}>
            {m === "signup" ? "Criar conta" : "Entrar"}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

function Consent({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.consent}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel="Li e aceito os Termos de uso e a Política de privacidade"
        onPress={onToggle}
        hitSlop={12}
        style={[styles.check, { borderColor: checked ? colors.accent : colors.secondaryLabel, backgroundColor: checked ? colors.accent : "transparent" }]}>
        {checked && <Icon ios="checkmark" android="check" size={14} color="#FFFFFF" />}
      </Pressable>
      <AppText variant="footnote" color="secondaryLabel" style={styles.flex}>
        Li e aceito os{" "}
        <AppText variant="footnote" color="accentText" onPress={() => router.push("/legal/terms")}>
          Termos de uso
        </AppText>{" "}
        e a{" "}
        <AppText variant="footnote" color="accentText" onPress={() => router.push("/legal/privacy")}>
          Política de privacidade
        </AppText>
        .
      </AppText>
    </View>
  );
}

type FieldError = { field: "email" | "password" | "form"; message: string };

function validate(mode: Mode, email: string, password: string, accepted: boolean): FieldError | null {
  if (!isValidEmail(email)) return { field: "email", message: "Digite um e-mail válido." };
  if (mode === "signin") return password ? null : { field: "password", message: "Digite sua senha." };
  const checks = passwordChecks(password);
  if (!(checks.length && checks.letter && checks.number)) {
    return { field: "password", message: "A senha precisa de 8+ caracteres, com letras e números." };
  }
  return accepted ? null : { field: "form", message: "Para criar a conta, aceite os Termos de uso e a Política de privacidade." };
}

export default function AuthScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<FieldError | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const signup = mode === "signup";

  const fail = (next: FieldError) => {
    setError(next);
    setShake((n) => n + 1);
  };

  const submit = async () => {
    const invalid = validate(mode, email, password, accepted);
    if (invalid) return fail(invalid);
    setBusy(true);
    setError(null);
    const result = signup ? await auth.signUp(email, password) : await auth.signIn(email, password);
    setBusy(false);
    if ("needsCode" in result || (signup && result.ok)) {
      router.push({ pathname: "/auth/code", params: { email: email.trim() } });
    } else if (!result.ok) {
      fail({ field: "form", message: result.message });
    }
    // A successful sign-in sets the session; the root layout moves on to the app.
  };

  const errorOf = (field: FieldError["field"]) => (error?.field === field ? error.message : undefined);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <AuthShell
      title={<ShimmerTitle key={mode} before={signup ? "Bora criar seu" : "Que bom te ver de novo no seu"} highlight="Habitus" after="." />}
      subtitle={
        <AppText variant="callout" color="secondaryLabel">
          Seu progresso salvo em qualquer aparelho.
        </AppText>
      }>
      <Tabs mode={mode} onChange={switchMode} />
      <Animated.View layout={LinearTransition.springify().damping(18)} style={styles.fields}>
        <AuthField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          error={errorOf("email")}
        />
        <AuthField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete={signup ? "new-password" : "current-password"}
          textContentType={signup ? "newPassword" : "password"}
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          error={errorOf("password")}
        />
        {signup && password.length > 0 && (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <PasswordMeter password={password} />
          </Animated.View>
        )}
        {signup ? (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <Consent checked={accepted} onToggle={() => setAccepted((a) => !a)} />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.forgot}>
            <AppText variant="footnote" color="accentText" accessibilityRole="link" onPress={() => router.push("/auth/forgot")}>
              Esqueci minha senha
            </AppText>
          </Animated.View>
        )}
        {errorOf("form") && (
          <AppText variant="footnote" style={styles.formError} accessibilityLiveRegion="polite">
            {errorOf("form")}
          </AppText>
        )}
        <PrimaryButton
          label={signup ? "Criar conta" : "Entrar"}
          onPress={() => void submit()}
          loading={busy}
          shake={shake}
          glow
        />
      </Animated.View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: "row", borderRadius: radius.md, padding: 3, backgroundColor: "rgba(255,255,255,0.07)" },
  indicator: { position: "absolute", top: 3, bottom: 3, left: 3, borderRadius: radius.sm, backgroundColor: "rgba(255,255,255,0.14)" },
  tab: { flex: 1, minHeight: HIT, alignItems: "center", justifyContent: "center" },
  fields: { gap: space.md },
  consent: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 1 },
  forgot: { alignItems: "flex-end" },
  formError: { color: "#F87171", textAlign: "center" },
});
