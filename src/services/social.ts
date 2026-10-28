import { type FriendsOverview, parseFriendsOverview, parsePublicUser, parseUserProfile, type PublicStats, type PublicUser, type UserProfile } from "@/domain/friends";
import { type GlobalRanking, parseGlobalRanking } from "@/domain/ranking";

import { serviceError } from "./profile";
import { requireSupabase } from "./supabase";

async function call(name: string, args?: Record<string, unknown>): Promise<unknown> {
  const result = await requireSupabase().rpc(name, args);
  if (result.error) throw serviceError(result.error);
  return result.data as unknown;
}

export async function setMyUsername(username: string): Promise<void> {
  await call("set_my_username", { new_username: username });
}

export async function usernameAvailable(candidate: string): Promise<boolean> {
  return (await call("username_available", { candidate })) === true;
}

export async function setMySearchable(on: boolean): Promise<void> {
  await call("set_my_searchable", { on_search: on });
}

export async function searchUsers(q: string): Promise<PublicUser[]> {
  const rows = await call("search_users", { q });
  return Array.isArray(rows) ? rows.map(parsePublicUser).filter((u): u is PublicUser => u !== null) : [];
}

export async function getUserProfile(id: string): Promise<UserProfile> {
  const profile = parseUserProfile(await call("get_user_profile", { uid: id }));
  if (!profile) throw new Error("Perfil não encontrado.");
  return profile;
}

export async function sendFriendRequest(id: string): Promise<"sent" | "accepted"> {
  return (await call("send_friend_request", { uid: id })) === "accepted" ? "accepted" : "sent";
}

export async function respondFriendRequest(id: string, accept: boolean): Promise<void> {
  await call("respond_friend_request", { uid: id, accept });
}

export async function cancelFriendRequest(id: string): Promise<void> {
  await call("cancel_friend_request", { uid: id });
}

export async function removeFriend(id: string): Promise<void> {
  await call("remove_friend", { uid: id });
}

export async function blockUser(id: string): Promise<void> {
  await call("block_user", { uid: id });
}

export async function unblockUser(id: string): Promise<void> {
  await call("unblock_user", { uid: id });
}

export async function myFriends(): Promise<FriendsOverview> {
  return parseFriendsOverview(await call("my_friends"));
}

export async function fetchGlobalRanking(today: string): Promise<GlobalRanking> {
  return parseGlobalRanking(await call("global_ranking", { today }));
}

/** Upserts the numbers friends can see (RLS lets each user write only their own row). */
export async function publishStats(userId: string, stats: PublicStats): Promise<void> {
  const { error } = await requireSupabase()
    .from("public_stats")
    .upsert(
      { user_id: userId, xp: stats.xp, level: stats.level, streak: stats.streak, badges: stats.badges, week_start: stats.weekStart, week_xp: stats.weekXp, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) throw serviceError(error);
}
