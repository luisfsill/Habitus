import { useCallback, useEffect, useRef, useState } from "react";

import type { UsernameStatus } from "@/components/username-field";
import { cleanUsername, usernameError } from "@/domain/username";
import { usernameAvailable } from "@/services/social";

/** The typed @ and its availability. Only the latest check may set the status; a failed check shows its message. */
export function useUsernameCheck(isAdmin: boolean, initial = "") {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const latest = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      latest.current += 1;
      clearTimeout(timer.current);
    },
    [],
  );

  const change = useCallback(
    (text: string, delay = 400) => {
      const u = cleanUsername(text);
      const id = ++latest.current;
      clearTimeout(timer.current);
      setValue(u);
      const error = u === "" ? null : usernameError(u, isAdmin);
      if (u === "" || error) return setStatus(error ?? "idle");
      setStatus("checking");
      timer.current = setTimeout(() => {
        usernameAvailable(u)
          .then((free) => id === latest.current && setStatus(free ? "available" : "taken"))
          .catch((e: Error) => id === latest.current && setStatus(e.message));
      }, delay);
    },
    [isAdmin],
  );

  return { value, status, change };
}
