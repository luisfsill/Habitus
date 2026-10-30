import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { BadgeList } from "@/components/badge-list";
import { OptionsSheet, type SheetOption } from "@/components/options-sheet";
import { PrimaryButton } from "@/components/primary-button";
import { ProfileCard } from "@/components/profile-card";
import type { Stat } from "@/components/stat-columns";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { WallComposer } from "@/components/wall-composer";
import { WallList } from "@/components/wall-post";
import { BADGES, type BadgeState } from "@/domain/achievements";
import { STAFF_BADGE, type UserProfile } from "@/domain/friends";
import { isTestimonial, muralTitle, type WallPost } from "@/domain/wall";
import { blockUser, cancelFriendRequest, getUserProfile, removeFriend, respondFriendRequest, sendFriendRequest } from "@/services/social";
import { useAccess } from "@/state/access";
import { useNow } from "@/state/use-now";
import { confirm } from "@/state/use-sign-out";
import { useWall } from "@/state/use-wall";
import { space } from "@/theme";

/** Runs an action, then reloads the profile, or leaves it (after unfriending or blocking it would be stale). */
type Run = (action: () => Promise<unknown>, then?: "leave") => void;
const goBack = () => (router.canGoBack() ? router.back() : router.replace("/profile"));

/** Instagram-like row of small buttons for where the two people stand; friends get "Amigos ▾" with the rest inside. */
function Actions({ p, run, busy, onTestimonial }: { p: UserProfile; run: Run; busy: boolean; onTestimonial: () => void }) {
  const [menu, setMenu] = useState(false);
  if (p.relation === "none") {
    return p.canRequest ? (
      <PrimaryButton size="small" label="Pedir amizade" icon={{ ios: "person.badge.plus", android: "person_add" }} onPress={() => run(() => sendFriendRequest(p.id))} loading={busy} />
    ) : (
      <PrimaryButton size="small" variant="tinted" label="Tente de novo mais tarde" onPress={() => undefined} disabled />
    );
  }
  if (p.relation === "outgoing") {
    const cancel = () => confirm("Cancelar pedido?", `${p.name} ainda não respondeu.`, "Cancelar pedido", () => run(() => cancelFriendRequest(p.id)));
    return <PrimaryButton size="small" variant="tinted" label="Pedido enviado" icon={{ ios: "clock", android: "schedule" }} onPress={cancel} loading={busy} accessibilityHint="Toque para cancelar o pedido" />;
  }
  if (p.relation === "incoming") {
    return (
      <View style={styles.row}>
        <View style={styles.grow}>
          <PrimaryButton size="small" label="Aceitar" onPress={() => run(() => respondFriendRequest(p.id, true))} loading={busy} />
        </View>
        <View style={styles.grow}>
          <PrimaryButton size="small" label="Recusar" variant="tinted" onPress={() => run(() => respondFriendRequest(p.id, false))} disabled={busy} />
        </View>
      </View>
    );
  }
  const unfriend = () => confirm("Desfazer amizade?", `${p.name} sai da sua lista de amigos.`, "Desfazer", () => run(() => removeFriend(p.id), "leave"));
  const block = () => confirm("Bloquear?", `${p.name} não vai mais achar você nem pedir sua amizade.`, "Bloquear", () => run(() => blockUser(p.id), "leave"));
  const options: SheetOption[] = [
    { label: "Desfazer amizade", icon: { ios: "person.badge.minus", android: "person_remove" }, destructive: true, onPress: unfriend },
    { label: "Bloquear", icon: { ios: "hand.raised", android: "block" }, destructive: true, onPress: block },
  ];
  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <View style={styles.grow}>
          <PrimaryButton size="small" variant="tinted" label="Amigos" icon={{ ios: "person.fill.checkmark", android: "how_to_reg" }} onPress={() => setMenu(true)} loading={busy} accessibilityHint="Abre as opções de amizade" />
        </View>
        <View style={styles.grow}>
          <PrimaryButton size="small" label="Direct" icon={{ ios: "bubble.left.and.bubble.right", android: "chat" }} onPress={() => router.push(`/chat/${p.id}`)} />
        </View>
      </View>
      {/* Full width under the other two: three labels with icons do not fit one phone row. */}
      <PrimaryButton size="small" variant="tinted" label="Depoimento" icon={{ ios: "square.and.pencil", android: "edit" }} onPress={onTestimonial} />
      <OptionsSheet visible={menu} title={`Você e ${p.name} são amigos`} options={options} onClose={() => setMenu(false)} />
    </View>
  );
}

/** The person's mural: the depoimentos friends left (their own posts go to the Feed); anyone who can open the profile reads it. */
function Mural({ p, writing, stopWriting }: { p: UserProfile; writing: boolean; stopWriting: () => void }) {
  const { profile } = useAccess();
  const me = profile?.id ?? "";
  const now = useNow(60_000);
  const { posts, error, publish, edit, remove } = useWall(p.id);
  const ask = (post: WallPost) => confirm("Apagar publicação?", "Ela sai do mural e do feed.", "Apagar", () => void remove(post));
  return (
    <Section title="Mural">
      {writing && (
        <WallComposer
          label={`Depoimento para ${p.name}`}
          placeholder="Escreva algo bonito sobre essa pessoa"
          avatarUrl={profile?.avatarUrl ?? null}
          onSubmit={(text) => publish(p.id, text).then(stopWriting)}
          onCancel={stopWriting}
        />
      )}
      {error && (
        <AppText variant="footnote" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
      <WallList
        posts={posts?.filter(isTestimonial) ?? null}
        me={me}
        now={now}
        titleOf={(post) => muralTitle(post, me)}
        empty="Nenhum depoimento ainda."
        onOpen={(id) => (id === me ? router.navigate("/profile") : router.push(`/profile/${id}`))}
        onDelete={ask}
        onEdit={edit}
      />
    </Section>
  );
}

/** Streak and medals, only for friends (the server hides them from anyone else). */
function friendStats({ relation, streak, badges }: UserProfile): Stat[] | undefined {
  if (relation !== "friends") return undefined;
  const days = streak ?? 0;
  const medals = badges?.length ?? 0;
  return [
    { value: String(days), label: days === 1 ? "dia seguido" : "dias seguidos", color: "warm" },
    { value: String(medals), label: medals === 1 ? "medalha" : "medalhas", color: "successText" },
  ];
}

/** The medals the server shares (friends only), as earned badges. */
const medalsOf = (p: UserProfile): BadgeState[] => BADGES.filter((b) => p.badges?.includes(b.id)).map((def) => ({ def, unlocked: true, progress: def.target }));

/** Friends see the streak and medals; anyone else gets a line saying so. */
function FriendDetails({ p }: { p: UserProfile }) {
  if (p.relation !== "friends") {
    return (
      <AppText variant="footnote" color="secondaryLabel" align="center">
        Sequência e medalhas aparecem quando vocês forem amigos.
      </AppText>
    );
  }
  const medals = medalsOf(p);
  return (
    <Section title={`Medalhas · ${medals.length}`}>
      {medals.length ? (
        <BadgeList badges={medals} />
      ) : (
        <AppText variant="body" color="secondaryLabel">
          Nenhuma medalha ainda.
        </AppText>
      )}
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
  const [p, setP] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);

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
    <Screen underHeader>
      <ProfileCard
        name={p.name}
        username={p.username}
        photo={p.avatarUrl}
        level={p.level}
        stats={friendStats(p)}
        badges={p.relation === "friends" ? medalsOf(p) : undefined}
        staff={p.isAdmin ? STAFF_BADGE : undefined}
      />
      <Actions p={p} run={run} busy={busy} onTestimonial={() => setWriting(true)} />
      {(status ?? loadError) && (
        <AppText variant="subheadline" color="danger" accessibilityLiveRegion="polite">
          {status ?? loadError}
        </AppText>
      )}
      <FriendDetails p={p} />
      <Mural p={p} writing={writing} stopWriting={() => setWriting(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm },
  grow: { flex: 1 },
  stack: { gap: space.sm },
});
