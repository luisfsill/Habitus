import { type Plan, type PlanKind, type Profile, parseProfile, type Role } from "@/domain/access";
import { type Invite, parseInvite } from "@/domain/invites";

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

/** A new invite for up to `uses` accounts; `days` null gives unlimited access. */
export async function createInvite(days: number | null, uses: number): Promise<string> {
  const result = await requireSupabase().rpc("admin_create_invite", { invite_days: days, invite_uses: uses });
  if (result.error) throw serviceError(result.error);
  return result.data as unknown as string;
}

/** Removes the invite: its link stops working; licenses already granted stay. */
export function deleteInvite(code: string): Promise<void> {
  return rpc("admin_delete_invite", { invite_code: code });
}

export async function listInvites(): Promise<Invite[]> {
  const { data, error } = await requireSupabase()
    .from("invites")
    .select("*, invite_redemptions(user_id, used_at)")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw serviceError(error);
  const invites = (data as unknown[]).map(parseInvite).filter((i): i is Invite => i !== null);
  const ids = [...new Set(invites.flatMap((i) => i.redemptions.flatMap((r) => (r.userId ? [r.userId] : []))))];
  if (ids.length === 0) return invites;
  // Who redeemed each invite: admins read every profile.
  // shortcut: one `in` filter in the URL, fine for a few hundred redemptions; page it if codes get thousands of uses.
  const people = await requireSupabase().from("profiles").select("id, name, email").in("id", ids);
  if (people.error) throw serviceError(people.error);
  const byId = new Map((people.data as { id: string; name: string | null; email: string | null }[]).map((p) => [p.id, p]));
  return invites.map((i) => ({
    ...i,
    redemptions: i.redemptions.map((r) => {
      const p = r.userId ? byId.get(r.userId) : undefined;
      return p ? { ...r, user: { name: p.name ?? "", email: p.email ?? "" } } : r;
    }),
  }));
}
