import { redeemedMessage } from "@/domain/invites";
import { redeemInvite } from "@/services/profile";

import { useAccess } from "./access";

/** Redeems a gift code for this account, reloads the plan and resolves to the message to show. */
export function useRedeem(): (code: string) => Promise<string> {
  const { refresh } = useAccess();
  return async (code) => {
    const days = await redeemInvite(code);
    await refresh();
    return redeemedMessage(days);
  };
}
