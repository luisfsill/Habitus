import type { Session } from "@supabase/supabase-js";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { defaultData } from "@/domain/app-data";
import { authErrorMessage, TERMS_VERSION } from "@/domain/auth-rules";
import { log } from "@/services/log";
import { rescheduleAll } from "@/services/notifications";
import { forgetPushDevice } from "@/services/web-push";
import { clearData, loadData, saveProfileCache } from "@/services/storage";
import { supabase, supabaseConfigured } from "@/services/supabase";
import { deleteAccountRemote, pushMerged } from "@/services/sync";

import { leaveToLanding } from "./desktop-frame";

export type AuthResult = { ok: true } | { ok: false; message: string };

interface AuthValue {
  /** False when the build has no Supabase variables. */
  configured: boolean;
  /** False until the saved session has been read. */
  ready: boolean;
  session: Session | null;
  /** True between a valid reset code and the new password: keeps the account screens up. */
  recovering: boolean;
  /** `invite`: a code from an admin; a valid one replaces the 7-day trial with its license. */
  signUp: (name: string, email: string, password: string, invite?: string) => Promise<AuthResult>;
  verifySignup: (email: string, code: string) => Promise<AuthResult>;
  resendSignup: (email: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult | { needsCode: true }>;
  requestReset: (email: string) => Promise<AuthResult>;
  verifyReset: (email: string, code: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  /** Ends an unfinished password reset (no-op otherwise). Stable across renders. */
  cancelRecovery: () => Promise<void>;
  /** "unsynced" when changes could not be sent; call again with force to drop them. */
  signOut: (opts?: { force: boolean }) => Promise<"ok" | "unsynced">;
  deleteAccount: () => Promise<AuthResult>;
}

const Context = createContext<AuthValue | null>(null);

const OK: AuthResult = { ok: true };

async function attempt(run: () => Promise<{ error: unknown }>): Promise<AuthResult> {
  try {
    const { error } = await run();
    return error ? { ok: false, message: authErrorMessage(error as { code?: string }) } : OK;
  } catch (error) {
    return { ok: false, message: authErrorMessage(error as { message?: string }) };
  }
}

/** Leaves the device as if nobody had signed in (it may be shared). */
async function forgetLocal(): Promise<void> {
  await clearData();
  await saveProfileCache(null);
  await rescheduleAll(defaultData());
  await forgetPushDevice();
  await supabase?.auth.signOut({ scope: "local" });
  leaveToLanding();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabaseConfigured);
  const [recovering, setRecovering] = useState(false);
  const recoveringRef = useRef(false);
  const setRecoveringBoth = useCallback((value: boolean) => {
    recoveringRef.current = value;
    setRecovering(value);
  }, []);

  // Leaving the reset screen any way (button, system back, swipe) drops the temporary session.
  const cancelRecovery = useCallback(async () => {
    if (!recoveringRef.current) return;
    setRecoveringBoth(false);
    await supabase?.auth.signOut({ scope: "local" });
  }, [setRecoveringBoth]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((error: unknown) => log.error("could not read session", error))
      .finally(() => setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(() => {
    const auth = () => {
      if (!supabase) throw new Error("Supabase is not configured");
      return supabase.auth;
    };
    return {
      configured: supabaseConfigured,
      ready,
      session,
      recovering,
      async signUp(name, email, password, invite) {
        try {
          const { data, error } = await auth().signUp({
            email: email.trim(),
            password,
            options: { data: { name: name.trim(), invite, terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() } },
          });
          if (error) return { ok: false, message: authErrorMessage(error) };
          // With e-mail confirmation on, an existing address comes back as a user with no identities.
          if (data.user?.identities?.length === 0) return { ok: false, message: authErrorMessage({ code: "user_already_exists" }) };
          return OK;
        } catch (error) {
          return { ok: false, message: authErrorMessage(error as { message?: string }) };
        }
      },
      verifySignup: (email, code) => attempt(() => auth().verifyOtp({ email: email.trim(), token: code, type: "email" })),
      resendSignup: (email) => attempt(() => auth().resend({ type: "signup", email: email.trim() })),
      async signIn(email, password) {
        try {
          const { error } = await auth().signInWithPassword({ email: email.trim(), password });
          if (error?.code === "email_not_confirmed") {
            await auth().resend({ type: "signup", email: email.trim() });
            return { needsCode: true };
          }
          return error ? { ok: false, message: authErrorMessage(error) } : OK;
        } catch (error) {
          return { ok: false, message: authErrorMessage(error as { message?: string }) };
        }
      },
      requestReset: (email) => attempt(() => auth().resetPasswordForEmail(email.trim())),
      async verifyReset(email, code) {
        setRecoveringBoth(true);
        const result = await attempt(() => auth().verifyOtp({ email: email.trim(), token: code, type: "recovery" }));
        if (!result.ok) setRecoveringBoth(false);
        return result;
      },
      async updatePassword(password) {
        const result = await attempt(() => auth().updateUser({ password }));
        if (result.ok) setRecoveringBoth(false);
        return result;
      },
      cancelRecovery,
      async signOut(opts) {
        const userId = session?.user.id;
        if (userId) {
          try {
            await pushMerged(userId, await loadData());
          } catch (error) {
            log.warn("could not send changes before signing out", error);
            if (!opts?.force) return "unsynced";
          }
        }
        await forgetLocal();
        return "ok";
      },
      async deleteAccount() {
        try {
          await deleteAccountRemote();
        } catch (error) {
          return { ok: false, message: authErrorMessage(error as { message?: string }) };
        }
        await forgetLocal();
        return OK;
      },
    };
  }, [ready, session, recovering, setRecoveringBoth, cancelRecovery]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(Context);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
