import { router } from "expo-router";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

import { TransitionScreen, type TransitionPhase } from "@/components/transition-screen";
import { takeLoginCurtain } from "@/services/storage";

import { useAuth } from "./auth";

interface TransitionValue {
  /** Shows the curtain now (sign-out starts it before the network work). No-op while one is up. */
  begin: (phase: TransitionPhase) => void;
  /** Drops the curtain (sign-out cancelled). */
  cancel: () => void;
  /** The app below reports whether it has loaded; the curtain stays up until it has. */
  setAppReady: (ready: boolean) => void;
}

const Context = createContext<TransitionValue | null>(null);

/**
 * Curtain over the whole app while signing in or out. It starts in the same render the account state flips
 * (or earlier, via `begin`) and lifts once its animation has played, the flip has landed and the app below has loaded.
 * Switching accounts remounts the app, which renders nothing while it loads: without both rules that blank frame
 * showed as a flash of the light background.
 */
export function TransitionProvider({ children }: { children: ReactNode }) {
  const { ready, session, recovering } = useAuth();
  const signedIn = ready && session !== null && !recovering;
  const [phase, setPhase] = useState<TransitionPhase | null>(null);
  const [appReady, setAppReady] = useState(false);
  // null until the saved session is known, so a cold start never shows the curtain.
  const [seen, setSeen] = useState<boolean | null>(null);
  const previous = useRef<boolean | null>(null);

  const begin = useCallback((next: TransitionPhase) => {
    setPhase((current) => current ?? next);
  }, []);
  const cancel = useCallback(() => setPhase(null), []);

  // Adjusted during render, not in an effect, so the remounted app never paints a frame without the curtain.
  if (ready && seen !== signedIn) {
    setSeen(signedIn);
    if (seen !== null) begin(signedIn ? "in" : "out");
  }

  useEffect(() => {
    if (!ready) return;
    const was = previous.current;
    previous.current = signedIn;
    // Just signed in from the landing's dialog, which reloaded the page (`leaveLoginModal`).
    if (was === null && takeLoginCurtain() && signedIn) begin("in");
    // Signed out from "/": go to Entrar, not the landing page that "/" shows to visitors.
    if (was === true && !signedIn) router.replace("/auth");
  }, [ready, signedIn, begin]);

  return (
    <Context.Provider value={{ begin, cancel, setAppReady }}>
      {children}
      {phase && <TransitionScreen phase={phase} landed={appReady && signedIn === (phase === "in")} onDone={cancel} />}
    </Context.Provider>
  );
}

export function useCurtain(): TransitionValue {
  const value = useContext(Context);
  if (!value) throw new Error("useCurtain must be used inside TransitionProvider");
  return value;
}

/** Keeps the curtain up while the caller (the remounted app, still empty) is loading. */
export function useCurtainHold(loading: boolean) {
  const { setAppReady } = useCurtain();
  useEffect(() => {
    setAppReady(!loading);
    return () => setAppReady(false);
  }, [loading, setAppReady]);
}
