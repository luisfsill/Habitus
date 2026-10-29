import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { ActionRow } from "@/components/action-row";
import { AppText } from "@/components/app-text";
import { PrimaryButton } from "@/components/primary-button";
import { ProfileCard } from "@/components/profile-card";
import type { Stat } from "@/components/stat-columns";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { WallList } from "@/components/wall-post";
import type { Progress } from "@/domain/achievements";
import { STAFF_BADGE } from "@/domain/friends";
import { isTestimonial, muralTitle, type WallPost } from "@/domain/wall";
import { useAccess } from "@/state/access";
import { useAppState } from "@/state/app-state";
import { useFriends } from "@/state/use-friends";
import { useNow } from "@/state/use-now";
import { confirm } from "@/state/use-sign-out";
import { useWall } from "@/state/use-wall";
import { space } from "@/theme";

const openList = () => router.push("/profile/lista");
const editProfile = () => router.navigate("/settings/conta");

/** Friends (a link to the list, like a follower count), streak, total XP and medals for the viewer's own card. */
function myStats({ stats, badges }: Progress, friends: number | null): Stat[] {
  const medals = badges.filter((b) => b.unlocked).length;
  return [
    { value: friends === null ? "–" : String(friends), label: friends === 1 ? "amigo" : "amigos", color: "accentText", onPress: openList, accessibilityLabel: `${friends ?? 0} amigos. Ver e adicionar amigos` },
    { value: String(stats.currentStreak), label: stats.currentStreak === 1 ? "dia seguido" : "dias seguidos", color: "warm" },
    { value: String(stats.xp), label: "XP no total", color: "accentText" },
    { value: String(medals), label: medals === 1 ? "medalha" : "medalhas", color: "successText" },
  ];
}

/** The viewer's own mural: the depoimentos friends left (posting happens in the Feed, on Hoje). */
function MyMural({ me }: { me: string }) {
  const now = useNow(60_000);
  const { posts, error, remove } = useWall(me);
  const ask = (post: WallPost) => confirm("Apagar depoimento?", "Ele sai do seu mural e do feed dos amigos.", "Apagar", () => void remove(post));
  return (
    <Section title="Meu mural">
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
        empty="Nenhum depoimento ainda. Quando um amigo deixar um, ele aparece aqui."
        onOpen={(id) => id !== me && router.push(`/profile/${id}`)}
        onDelete={ask}
      />
    </Section>
  );
}

/** The Perfil tab: the viewer's mini profile; the friend count opens the list, where requests and search live. */
export default function ProfileScreen() {
  const { profile, isAdmin } = useAccess();
  const { progress } = useAppState();
  const { overview } = useFriends();
  const incoming = overview?.incoming.length ?? 0;
  return (
    <Screen title="Perfil">
      {profile && (
        <ProfileCard
          name={profile.name}
          username={profile.username ?? null}
          photo={profile.avatarUrl}
          level={progress.level.level}
          xp={progress.level}
          badges={progress.badges}
          staff={isAdmin ? STAFF_BADGE : undefined}
          stats={myStats(progress, overview ? overview.friends.length : null)}
          onEdit={editProfile}
        />
      )}
      <View style={styles.row}>
        <View style={styles.grow}>
          <PrimaryButton size="small" variant="tinted" label="Editar perfil" onPress={editProfile} />
        </View>
        <View style={styles.grow}>
          <PrimaryButton size="small" variant="tinted" label="Amigos" icon={{ ios: "person.2", android: "group" }} onPress={openList} />
        </View>
      </View>
      {incoming > 0 && (
        <ActionRow label="Pedidos de amizade" icon={{ ios: "bell", android: "notifications" }} detail={incoming === 1 ? "1 pessoa quer ser sua amiga" : `${incoming} pessoas querem ser suas amigas`} navigates onPress={openList} />
      )}
      {profile && <MyMural me={profile.id} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm },
  grow: { flex: 1 },
});
