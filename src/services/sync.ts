import { type AppData, sanitizeData } from "@/domain/app-data";
import { mergeData } from "@/domain/sync";

import { requireSupabase } from "./supabase";

const TABLE = "user_data";

/** The account's copy on the server, or null when it has none yet. */
export async function fetchRemote(userId: string): Promise<AppData | null> {
  const { data, error } = await requireSupabase().from(TABLE).select("data").eq("user_id", userId).maybeSingle<{ data: unknown }>();
  if (error) throw error;
  return data ? sanitizeData(data.data) : null;
}

export async function overwriteRemote(userId: string, data: AppData): Promise<void> {
  const { error } = await requireSupabase()
    .from(TABLE)
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Read, merge, write: never drops what another device already sent. Returns the merged data. */
export async function pushMerged(userId: string, local: AppData): Promise<AppData> {
  const remote = await fetchRemote(userId);
  const merged = remote ? mergeData(local, remote) : local;
  await overwriteRemote(userId, merged);
  return merged;
}

/** Deletes the signed-in user; their user_data row goes with it (on delete cascade). */
export async function deleteAccountRemote(): Promise<void> {
  const { error } = await requireSupabase().rpc("delete_my_account");
  if (error) throw error;
}
