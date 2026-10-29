import { type Plan, type Profile, parsePlan, parseProfile } from "@/domain/access";
import { authErrorMessage } from "@/domain/auth-rules";

import { requireSupabase } from "./supabase";

/** Portuguese message for a failed call: our own SQL messages pass through, the rest is translated. */
export function serviceError(error: { code?: string; message?: string; name?: string }): Error {
  return new Error(error.code === "42501" && error.message ? error.message : authErrorMessage(error));
}

export async function fetchMyProfile(userId: string): Promise<Profile> {
  const read = (columns: string) => requireSupabase().from("profiles").select(columns).eq("id", userId).single();
  // Before admin.sql adds free_access the column is unknown: read the profile without it.
  let result = await read("*, free_access");
  if (result.error) result = await read("*");
  if (result.error) throw serviceError(result.error);
  const profile = parseProfile(result.data as unknown);
  if (!profile) throw new Error("Perfil inválido.");
  return profile;
}

export async function updateMyName(name: string): Promise<void> {
  const { error } = await requireSupabase().rpc("update_my_name", { new_name: name });
  if (error) throw serviceError(error);
}

export async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await requireSupabase().from("plans").select("*").order("sort");
  if (error) throw serviceError(error);
  return (data as unknown[]).map(parsePlan).filter((p): p is Plan => p !== null);
}

/** Redeems an invite code for the signed-in account; resolves to its license days (null = unlimited). */
export async function redeemInvite(code: string): Promise<number | null> {
  const result = await requireSupabase().rpc("redeem_invite", { invite_code: code });
  if (result.error) throw serviceError(result.error);
  return (result.data as { days: number | null }).days ?? null;
}

/** License days of a usable invite (null = unlimited), or undefined when the code is not valid. */
export async function checkInvite(code: string): Promise<number | null | undefined> {
  const result = await requireSupabase().rpc("check_invite", { invite_code: code });
  if (result.error) throw serviceError(result.error);
  const data = result.data as unknown;
  return data === null ? undefined : ((data as { days: number | null }).days ?? null);
}
