import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ActionRow } from "@/components/action-row";
import { AppText } from "@/components/app-text";
import { PersonRow } from "@/components/person-row";
import { PrimaryButton } from "@/components/primary-button";
import { RankList } from "@/components/rank-list";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import type { PublicUser } from "@/domain/friends";
import { respondFriendRequest } from "@/services/social";
import { TabAccount } from "@/state/tab-account";
import { useFriends } from "@/state/use-friends";
import { space } from "@/theme";

const SEARCH = { ios: "magnifyingglass", android: "search" };
const open = (id: string) => router.push(`/amigos/${id}`);

function Requests({ people, onAnswer, busy }: { people: PublicUser[]; onAnswer: (p: PublicUser, accept: boolean) => void; busy: string | null }) {
  return (
    <Section title="Pedidos">
      {people.map((p) => (
        <PersonRow key={p.id} person={p} onPress={() => open(p.id)}>
          <View style={styles.grow}>
            <PrimaryButton label="Aceitar" onPress={() => onAnswer(p, true)} loading={busy === p.id} accessibilityHint={`Aceita o pedido de ${p.name}`} />
          </View>
          <View style={styles.grow}>
            <PrimaryButton label="Recusar" variant="tinted" onPress={() => onAnswer(p, false)} disabled={busy === p.id} accessibilityHint={`Recusa o pedido de ${p.name}`} />
          </View>
        </PersonRow>
      ))}
    </Section>
  );
}

function Problem({ message, retry, loading }: { message: string | null; retry?: () => void; loading: boolean }) {
  if (!message) return null;
  return (
    <View style={styles.error}>
      <AppText variant="subheadline" color="danger" accessibilityLiveRegion="polite">
        {message}
      </AppText>
      {retry && <PrimaryButton label="Tentar de novo" variant="tinted" onPress={retry} loading={loading} />}
    </View>
  );
}

export default function FriendsScreen() {
  const { overview, ranking, loading, error, reload } = useFriends();
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const answer = async (p: PublicUser, accept: boolean) => {
    setBusy(p.id);
    try {
      await respondFriendRequest(p.id, accept);
      setStatus(null);
      await reload();
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const search = <ActionRow label="Buscar amigos" icon={SEARCH} navigates onPress={() => router.push("/amigos/buscar")} />;

  const retry = error ? () => void reload() : undefined;

  if (!overview) {
    return (
      <Screen title="Amigos" accessory={<TabAccount />}>
        {error ? <Problem message={error} retry={retry} loading={loading} /> : <AppText variant="body" color="secondaryLabel">Carregando…</AppText>}
      </Screen>
    );
  }

  const { friends, incoming } = overview;
  return (
    <Screen title="Amigos" accessory={<TabAccount />}>
      <Problem message={error ?? status} retry={retry} loading={loading} />
      {friends.length > 0 ? (
        <Section title="Ranking da semana">
          <RankList rows={ranking} />
        </Section>
      ) : (
        <AppText variant="body" color="secondaryLabel">
          Adicione amigos para ver o ranking da semana.
        </AppText>
      )}
      {incoming.length > 0 && <Requests people={incoming} onAnswer={(p, accept) => void answer(p, accept)} busy={busy} />}
      {friends.length > 0 && (
        <Section title="Amigos">
          {friends.map((f) => (
            <PersonRow key={f.id} person={f} onPress={() => open(f.id)} />
          ))}
        </Section>
      )}
      <Section title="Encontrar pessoas">{search}</Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  error: { gap: space.sm },
});
