import { redeemInvite } from "@/services/profile";

import { useAccess } from "./access";

/** Redeems a gift code for this account, reloads the plan and resolves to its license days (null = unlimited). */
export function useRedeem(): (code: string) => Promise<number | null> {
  const { refresh } = useAccess();
  return async (code) => {
    const days = await redeemInvite(code);
    await refresh();
    return days;
  };
}
