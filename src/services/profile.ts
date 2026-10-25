import { type Plan, type Profile, parsePlan, parseProfile } from "@/domain/access";
import { authErrorMessage } from "@/domain/auth-rules";

import { requireSupabase } from "./supabase";

/** Portuguese message for a failed call: our own SQL messages pass through, the rest is translated. */
export function serviceError(error: { code?: string; message?: string; name?: string }): Error {
  return new Error(error.code === "42501" && error.message ? error.message : authErrorMessage(error));
}

export async function fetchMyProfile(userId: string): Promise<Profile> {
  const result = await requireSupabase().from("profiles").select("*").eq("id", userId).single();
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
