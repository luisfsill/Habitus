import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { AuthShell } from "@/components/auth-shell";
import { Icon } from "@/components/icon";
import { PlanCard } from "@/components/plan-card";
import { PrimaryButton } from "@/components/primary-button";
import { displayName, hasAccess as profileHasAccess, type Plan, renewWhatsAppUrl } from "@/domain/access";
import { fetchPlans } from "@/services/profile";
import { useAccess } from "@/state/access";
import { useAuth } from "@/state/auth";
import { HIT, radius, space, ThemePreferenceContext } from "@/theme";

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

function confirmLeave(onYes: () => void) {
  const message = "Algumas mudanças ainda não foram enviadas e serão perdidas. Sair mesmo assim?";
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(message)) onYes();
    return;
  }
  Alert.alert("Sair sem enviar?", message, [
    { text: "Cancelar", style: "cancel" },
    { text: "Sair", style: "destructive", onPress: onYes },
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

  // Paid while this screen was the only route: go to the app (nothing to go back to).
  useEffect(() => {
    if (hasAccess && !router.canGoBack()) router.replace("/");
  }, [hasAccess]);

  const plan = plans.find((p) => p.id === selected);
  const trial = profile?.plan === "trial";
  const title = hasAccess ? "Planos do Habitus" : trial ? "Seu teste grátis acabou" : "Seu plano acabou";
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const renew = () => {
    if (!profile || !plan) return;
    void Linking.openURL(renewWhatsAppUrl(displayName(profile), profile.email, plan.name));
  };

  const recheck = async () => {
    setChecking(true);
    const fresh = await refresh();
    setChecking(false);
    if (fresh === null) setMessage("Sem conexão. Tente de novo em instantes.");
    else if (!profileHasAccess(fresh, new Date())) setMessage("Ainda não encontramos a renovação. Assim que for liberada, toque aqui de novo.");
  };

  // With no plan the server refuses the upload anyway; with a plan, unsent changes need a warning.
  const leave = async () => {
    if ((await signOut({ force: !hasAccess })) === "unsynced") {
      confirmLeave(() => void signOut({ force: true }));
    }
  };

  const remove = () =>
    confirm("Excluir sua conta e todo o seu progresso? Não dá para desfazer.", () =>
      confirm("Tem certeza? A conta será excluída agora.", () => {
        void deleteAccount().then((r) => setMessage(r.ok ? null : r.message));
      }),
    );

  return (
    <AuthShell
      title={
        <>
          {/* With a plan this screen sits on top of the app: a round back button, up where the thumb lands last. */}
          {hasAccess && (
            <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8} style={styles.back}>
              <Icon ios="chevron.left" android="arrow_back" size={22} color="#FFFFFF" />
            </Pressable>
          )}
          <AppText variant="largeTitle" style={styles.title}>
            {title}
          </AppText>
        </>
      }
      subtitle={
        <AppText variant="callout" color="secondaryLabel">
          Escolha um plano e fale com a gente pelo WhatsApp. Assim que o pagamento for confirmado, o app é liberado.
        </AppText>
      }
      footer={
        <View style={styles.links}>
          <PrimaryButton variant="plain" label="Sair" onPress={() => void leave()} />
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
  back: {
    width: HIT,
    height: HIT,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  links: { gap: space.xs },
});
