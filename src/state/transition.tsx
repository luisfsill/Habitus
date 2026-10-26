import { router } from "expo-router";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

import { TransitionScreen, type TransitionPhase } from "@/components/transition-screen";

import { useAuth } from "./auth";

interface TransitionValue {
  /** Shows the curtain now (sign-out starts it before the network work). No-op while one is up. */
  begin: (phase: TransitionPhase) => void;
  /** Drops the curtain (sign-out cancelled). */
  cancel: () => void;
}

const Context = createContext<TransitionValue | null>(null);

/**
 * Curtain over the whole app while signing in or out. It starts when the account state flips
 * (or earlier, via `begin`) and lifts once its animation has played and the flip has landed.
 */
export function TransitionProvider({ children }: { children: ReactNode }) {
  const { ready, session, recovering } = useAuth();
  const signedIn = ready && session !== null && !recovering;
  const [phase, setPhase] = useState<TransitionPhase | null>(null);
  // null until the saved session is known, so a cold start never shows the curtain.
  const previous = useRef<boolean | null>(null);

  const begin = useCallback((next: TransitionPhase) => {
    setPhase((current) => current ?? next);
  }, []);
  const cancel = useCallback(() => setPhase(null), []);

  useEffect(() => {
    if (!ready) return;
    const was = previous.current;
    previous.current = signedIn;
    if (was !== null && was !== signedIn) begin(signedIn ? "in" : "out");
    // Signed out from "/": go to Entrar, not the landing page that "/" shows to visitors.
    if (was === true && !signedIn) router.replace("/auth");
  }, [ready, signedIn, begin]);

  return (
    <Context.Provider value={{ begin, cancel }}>
      {children}
      {phase && <TransitionScreen phase={phase} landed={signedIn === (phase === "in")} onDone={cancel} />}
    </Context.Provider>
  );
}

export function useCurtain(): TransitionValue {
  const value = useContext(Context);
  if (!value) throw new Error("useCurtain must be used inside TransitionProvider");
  return value;
}
