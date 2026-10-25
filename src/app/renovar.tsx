import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Platform, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { AuthShell } from "@/components/auth-shell";
import { PlanCard } from "@/components/plan-card";
import { PrimaryButton } from "@/components/primary-button";
import { displayName, type Plan, renewWhatsAppUrl } from "@/domain/access";
import { fetchPlans } from "@/services/profile";
import { useAccess } from "@/state/access";
import { useAuth } from "@/state/auth";
import { space, ThemePreferenceContext } from "@/theme";

function confirm(message: string, onYes: () => void) {
  // Alert has no buttons on the web; the browser dialog stands in.
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(message)) onYes();
    return;
  }
  Alert.alert("Excluir conta", message, [
    { text: "Cancelar", style: "cancel" },
    { text: "Excluir", style: "destructive", onPress: onYes },
  ]);
}

/** "Seu plano acabou": the plans, renewal over WhatsApp, and a way out. */
function RenewScreen() {
  const { profile, hasAccess, refresh } = useAccess();
  const { signOut, deleteAccount } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchPlans()
      .then((list) => {
        const active = list.filter((p) => p.active);
        setPlans(active);
        setSelected((active.find((p) => p.highlight) ?? active[0])?.id ?? null);
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  const plan = plans.find((p) => p.id === selected);
  const trial = profile?.plan === "trial";
  const title = hasAccess ? "Planos do Habitus" : trial ? "Seu teste grátis acabou" : "Seu plano acabou";

  const renew = () => {
    if (!profile || !plan) return;
    void Linking.openURL(renewWhatsAppUrl(displayName(profile), profile.email, plan.name));
  };

  const recheck = async () => {
    setChecking(true);
    await refresh();
    setChecking(false);
    setMessage("Ainda não encontramos a renovação. Assim que for liberada, toque aqui de novo.");
  };

  const remove = () =>
    confirm("Excluir sua conta e todo o seu progresso? Não dá para desfazer.", () =>
      confirm("Tem certeza? A conta será excluída agora.", () => {
        void deleteAccount().then((r) => setMessage(r.ok ? null : r.message));
      }),
    );

  return (
    <AuthShell
      title={<AppText variant="largeTitle" style={styles.title}>{title}</AppText>}
      subtitle={
        <AppText variant="callout" color="secondaryLabel">
          Escolha um plano e fale com a gente pelo WhatsApp. Assim que o pagamento for confirmado, o app é liberado.
        </AppText>
      }
      footer={
        <View style={styles.links}>
          {hasAccess && <PrimaryButton variant="plain" label="Voltar" onPress={() => router.back()} />}
          <PrimaryButton variant="plain" label="Termos de uso" onPress={() => router.push("/legal/terms")} />
          <PrimaryButton variant="plain" label="Política de privacidade" onPress={() => router.push("/legal/privacy")} />
          <PrimaryButton variant="plain" label="Sair" onPress={() => void signOut({ force: true })} />
          {!hasAccess && <PrimaryButton variant="plain" destructive label="Excluir conta" onPress={remove} />}
        </View>
      }>
      {plans.map((p) => (
        <PlanCard key={p.id} plan={p} selected={p.id === selected} onSelect={() => setSelected(p.id)} />
      ))}
      <PrimaryButton label="Renovar pelo WhatsApp" onPress={renew} disabled={!plan} glow />
      {!hasAccess && <PrimaryButton variant="tinted" label="Já paguei, atualizar" onPress={() => void recheck()} loading={checking} />}
      {message && (
        <AppText variant="footnote" color="secondaryLabel" align="center" accessibilityLiveRegion="polite">
          {message}
        </AppText>
      )}
    </AuthShell>
  );
}

export default function RenewRoute() {
  return (
    <ThemePreferenceContext.Provider value="dark">
      <RenewScreen />
    </ThemePreferenceContext.Provider>
  );
}

const styles = StyleSheet.create({
  title: { color: "#FFFFFF", fontWeight: "800" },
  links: { gap: space.xs },
});
