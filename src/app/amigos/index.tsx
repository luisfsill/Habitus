import { Redirect } from "expo-router";

/** Old address (pushes already queued, links): the Perfil tab is now /profile. */
export default function FriendsRedirect() {
  return <Redirect href="/profile" />;
}
