import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { hasAccess as profileHasAccess, type Profile } from "@/domain/access";
import { log } from "@/services/log";
import { fetchMyProfile, updateMyName } from "@/services/profile";
import { loadProfileCache, saveProfileCache } from "@/services/storage";

interface AccessValue {
  /** Null when signed out, or offline on a device that never saw this account's profile. */
  profile: Profile | null;
  ready: boolean;
  /** True when the profile could not be read and there is no saved copy. */
  offline: boolean;
  hasAccess: boolean;
  isAdmin: boolean;
  /** Re-reads the profile; returns it, or null when it could not be read. */
  refresh: () => Promise<Profile | null>;
  setName: (name: string) => Promise<void>;
}

const Context = createContext<AccessValue | null>(null);

/** The signed-in account's plan and role, refreshed on open and on return to the foreground. */
export function AccessProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(userId === null);
  const [offline, setOffline] = useState(false);
  const known = useRef(false);
  // Bumped on every refresh, so an expiry is noticed even offline (the profile itself does not change).
  const [checkedAt, setCheckedAt] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    if (!userId) return null;
    try {
      const fresh = await fetchMyProfile(userId);
      known.current = true;
      setProfile(fresh);
      setOffline(false);
      await saveProfileCache(fresh);
      return fresh;
    } catch (error) {
      log.warn("could not read profile", error);
      // With a saved copy the app keeps working; without one it cannot know the plan.
      setOffline(!known.current);
      return null;
    } finally {
      setCheckedAt(Date.now());
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const boot = async () => {
      const cached = await loadProfileCache();
      // A cached profile from another account is never used.
      if (cached && cached.id === userId && !cancelled) {
        known.current = true;
        setProfile(cached);
        setReady(true);
      }
      await refresh();
      if (!cancelled) setReady(true);
    };
    void boot();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [userId, refresh]);

  const value = useMemo<AccessValue>(
    () => ({
      profile,
      ready,
      offline,
      hasAccess: profile !== null && profileHasAccess(profile, new Date(checkedAt)),
      isAdmin: profile?.role === "admin",
      refresh,
      async setName(name) {
        await updateMyName(name);
        await refresh();
      },
    }),
    [profile, ready, offline, refresh, checkedAt],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAccess(): AccessValue {
  const value = useContext(Context);
  if (!value) throw new Error("useAccess must be used inside AccessProvider");
  return value;
}
