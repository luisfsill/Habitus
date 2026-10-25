import { type Plan, type PlanKind, type Profile, parseProfile, type Role } from "@/domain/access";

import { serviceError } from "./profile";
import { requireSupabase } from "./supabase";

async function rpc(name: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await requireSupabase().rpc(name, args);
  if (error) throw serviceError(error);
}

/** Calls the admin-users Edge Function; its errors come back as { error: "mensagem" }. */
async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const result = await requireSupabase().functions.invoke<T>("admin-users", { body });
  const error = result.error as { message?: string; context?: { json?: () => Promise<{ error?: string }> } } | null;
  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(detail?.error ?? serviceError(error).message);
  }
  return result.data as T;
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await requireSupabase().from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw serviceError(error);
  return (data as unknown[]).map(parseProfile).filter((p): p is Profile => p !== null);
}

export function setAccess(id: string, access: { until: string | null; unlimited: boolean; plan: PlanKind }): Promise<void> {
  return rpc("admin_set_access", { uid: id, until: access.until, is_unlimited: access.unlimited, new_plan: access.plan });
}

export function setRole(id: string, role: Role): Promise<void> {
  return rpc("admin_set_role", { uid: id, new_role: role });
}

export function updateName(id: string, name: string): Promise<void> {
  return rpc("admin_update_name", { uid: id, new_name: name });
}

export function deleteUser(id: string): Promise<void> {
  return rpc("admin_delete_user", { uid: id });
}

export function savePlan(plan: Plan): Promise<void> {
  return rpc("admin_save_plan", {
    plan_id: plan.id,
    plan_name: plan.name,
    plan_days: plan.days,
    plan_price_cents: plan.priceCents,
    plan_highlight: plan.highlight,
    plan_active: plan.active,
  });
}

/** Creates a confirmed account with a provisional password, shown once to the admin. */
export function createUser(name: string, email: string): Promise<{ id: string; password: string }> {
  return invoke({ action: "create", name, email });
}

export async function updateEmail(id: string, email: string): Promise<void> {
  await invoke({ action: "update_email", id, email });
}

export async function resetPassword(id: string): Promise<string> {
  return (await invoke<{ password: string }>({ action: "reset_password", id })).password;
}
