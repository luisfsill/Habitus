import { Redirect, useLocalSearchParams } from "expo-router";

/** Old address (pushes already queued, links): /amigos/<id> and /amigos/lista now live under /profile. */
export default function PersonRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/profile/${id}`} />;
}
