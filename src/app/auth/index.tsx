import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, LinearTransition, useAnimatedStyle, withTiming } from "react-native-reanimated";

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
    transform: [{ translateX: withTiming(mode === "signup" ? 0 : width / 2, { duration: 250, easing: Easing.out(Easing.cubic) }) }],
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

type FieldError = { field: "name" | "email" | "password" | "form"; message: string };

interface Form {
  name: string;
  email: string;
  password: string;
  accepted: boolean;
}

function validate(mode: Mode, { name, email, password, accepted }: Form): FieldError | null {
  if (mode === "signup" && !name.trim()) return { field: "name", message: "Digite seu nome." };
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
  // Opens on "Entrar"; the landing page's "Começar grátis" links here with ?modo=criar.
  const { modo } = useLocalSearchParams<{ modo?: string }>();
  const [mode, setMode] = useState<Mode>(modo === "criar" ? "signup" : "signin");
  const [name, setName] = useState("");
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
    const invalid = validate(mode, { name, email, password, accepted });
    if (invalid) return fail(invalid);
    setBusy(true);
    setError(null);
    const result = signup ? await auth.signUp(name, email, password) : await auth.signIn(email, password);
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
      <Animated.View layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}>
      <Animated.View key={mode} style={[styles.fields, swap]}>
        {signup && (
          <View>
            <AuthField label="Nome" value={name} onChangeText={(t) => setName(t.slice(0, 80))} autoComplete="name" autoCapitalize="words" textContentType="name" error={errorOf("name")} />
          </View>
        )}
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
          <Consent checked={accepted} onToggle={() => setAccepted((a) => !a)} />
        ) : (
          <View style={styles.forgot}>
            <AppText variant="footnote" color="accentText" accessibilityRole="link" onPress={() => router.push("/auth/forgot")}>
              Esqueci minha senha
            </AppText>
          </View>
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
      </Animated.View>
    </AuthShell>
  );
}

// Remounted per mode: the form comes back from a soft blur (blur is web-only; native gets fade + scale).
// Plain object: StyleSheet.create on web rejects Reanimated's CSS animation props.
const swap = {
  animationName: {
    from: { opacity: 0, transform: [{ scale: 0.97 }], ...Platform.select({ web: { filter: "blur(6px)" } }) },
    to: { opacity: 1, transform: [{ scale: 1 }], ...Platform.select({ web: { filter: "blur(0px)" } }) },
  },
  animationDuration: "250ms",
  animationTimingFunction: "ease-out",
} as const;

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
