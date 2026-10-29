import { router } from "expo-router";

import { ActionRow } from "@/components/action-row";
import { ProfileCard } from "@/components/profile-card";
import type { Stat } from "@/components/stat-columns";
import { Screen } from "@/components/screen";
import type { Progress } from "@/domain/achievements";
import { useAccess } from "@/state/access";
import { useAppState } from "@/state/app-state";
import { useFriends } from "@/state/use-friends";

const openList = () => router.push("/amigos/lista");

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

/** The Perfil tab: the viewer's mini profile; the friend count opens the list, where requests and search live. */
export default function ProfileScreen() {
  const { profile } = useAccess();
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
          stats={myStats(progress, overview ? overview.friends.length : null)}
          onEdit={() => router.navigate("/settings/conta")}
        />
      )}
      {incoming > 0 && (
        <ActionRow label="Pedidos de amizade" icon={{ ios: "bell", android: "notifications" }} detail={incoming === 1 ? "1 pessoa quer ser sua amiga" : `${incoming} pessoas querem ser suas amigas`} navigates onPress={openList} />
      )}
      <ActionRow label="Encontrar amigos" icon={{ ios: "person.badge.plus", android: "person_add" }} navigates onPress={openList} />
    </Screen>
  );
}
