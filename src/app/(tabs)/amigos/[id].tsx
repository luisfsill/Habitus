import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ActionRow } from "@/components/action-row";
import { AppText } from "@/components/app-text";
import { Avatar } from "@/components/avatar";
import { BeltChip } from "@/components/person-row";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { BADGES } from "@/domain/achievements";
import { STAFF_BADGE, type UserProfile } from "@/domain/friends";
import { blockUser, cancelFriendRequest, getUserProfile, removeFriend, respondFriendRequest, sendFriendRequest } from "@/services/social";
import { confirm } from "@/state/use-sign-out";
import { radius, space, useTheme } from "@/theme";

/** Runs an action, then reloads the profile, or leaves it (after unfriending or blocking it would be stale). */
type Run = (action: () => Promise<unknown>, then?: "leave") => void;
const goBack = () => (router.canGoBack() ? router.back() : router.replace("/amigos"));

/** The button (or buttons) for where the two people stand. */
function RelationActions({ p, run, busy }: { p: UserProfile; run: Run; busy: boolean }) {
  if (p.relation === "none") {
    return p.canRequest ? (
      <PrimaryButton label="Pedir amizade" onPress={() => run(() => sendFriendRequest(p.id))} loading={busy} />
    ) : (
      <PrimaryButton label="Tente de novo mais tarde" onPress={() => undefined} disabled />
    );
  }
  if (p.relation === "outgoing") {
    return (
      <Section title="Pedido enviado">
        <ActionRow label="Cancelar pedido" icon={{ ios: "xmark.circle", android: "cancel" }} destructive onPress={() => run(() => cancelFriendRequest(p.id))} />
        <AppText variant="footnote" color="secondaryLabel">{`${p.name} ainda não respondeu.`}</AppText>
      </Section>
    );
  }
  if (p.relation === "incoming") {
    return (
      <View style={styles.pair}>
        <View style={styles.grow}>
          <PrimaryButton label="Aceitar" onPress={() => run(() => respondFriendRequest(p.id, true))} loading={busy} />
        </View>
        <View style={styles.grow}>
          <PrimaryButton label="Recusar" variant="tinted" onPress={() => run(() => respondFriendRequest(p.id, false))} disabled={busy} />
        </View>
      </View>
    );
  }
  const unfriend = () => confirm("Desfazer amizade?", `${p.name} sai da sua lista de amigos e do ranking.`, "Desfazer", () => run(() => removeFriend(p.id), "leave"));
  const block = () => confirm("Bloquear?", `${p.name} não vai mais achar você nem pedir sua amizade.`, "Bloquear", () => run(() => blockUser(p.id), "leave"));
  return (
    <Section title="Amizade">
      <ActionRow label="Desfazer amizade" icon={{ ios: "person.badge.minus", android: "person_remove" }} destructive onPress={unfriend} />
      <ActionRow label="Bloquear" icon={{ ios: "hand.raised", android: "block" }} destructive onPress={block} />
    </Section>
  );
}

function FriendDetails({ p }: { p: UserProfile }) {
  if (p.relation !== "friends") return null;
  const titles = BADGES.filter((b) => p.badges?.includes(b.id)).map((b) => b.title);
  return (
    <Section title="Conquistas">
      <AppText variant="body">Sequência: {p.streak ?? 0} dias</AppText>
      <AppText variant="body" color={titles.length ? "label" : "secondaryLabel"}>
        {titles.length ? titles.join(", ") : "Nenhuma conquista ainda."}
      </AppText>
    </Section>
  );
}

function Failed({ error, retry }: { error: string; retry: () => void }) {
  return (
    <Screen title="Perfil" underHeader>
      <AppText variant="body" color="secondaryLabel" accessibilityLiveRegion="polite">
        {error}
      </AppText>
      {error !== "Perfil não encontrado." && <PrimaryButton label="Tentar de novo" variant="tinted" onPress={retry} />}
      <PrimaryButton label="Voltar" variant="plain" onPress={goBack} />
    </Screen>
  );
}

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [p, setP] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      getUserProfile(id)
        .then((found) => {
          setP(found);
          setLoadError(null);
        })
        .catch((e: Error) => setLoadError(e.message)),
    [id],
  );
  useEffect(() => void load(), [load]);

  const run: Run = (action, then) => {
    setBusy(true);
    action()
      .then(() => {
        setStatus(null);
        if (then === "leave") return goBack();
        return load();
      })
      .catch((e: Error) => setStatus(e.message))
      .finally(() => setBusy(false));
  };

  if (!p) {
    if (loadError) return <Failed error={loadError} retry={() => void load()} />;
    return (
      <Screen title="Perfil" underHeader>
        <AppText variant="body" color="secondaryLabel">Carregando…</AppText>
      </Screen>
    );
  }

  return (
    <Screen title={p.name} underHeader>
      <Avatar url={p.avatarUrl} size={96} />
      <View style={styles.tags}>
        <AppText variant="subheadline" color="secondaryLabel">
          @{p.username}
        </AppText>
        <BeltChip level={p.level} />
        <AppText variant="subheadline" color="secondaryLabel">
          Nível {p.level}
        </AppText>
        {p.isAdmin && (
          <View style={[styles.staff, { backgroundColor: colors.accentSoft }]}>
            <AppText variant="caption" color="accentText" style={styles.bold}>
              {STAFF_BADGE}
            </AppText>
          </View>
        )}
      </View>
      {(status ?? loadError) && (
        <AppText variant="subheadline" color="danger" accessibilityLiveRegion="polite">
          {status ?? loadError}
        </AppText>
      )}
      <FriendDetails p={p} />
      <RelationActions p={p} run={run} busy={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm },
  staff: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
  bold: { fontWeight: "700" },
  pair: { flexDirection: "row", gap: space.sm },
  grow: { flex: 1 },
});
