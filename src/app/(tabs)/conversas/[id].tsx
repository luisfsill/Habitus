import { Redirect, useLocalSearchParams } from "expo-router";

/** Old address (pushes already queued, links): the chat now has its own screen outside the tabs. */
export default function ChatRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/chat/${id}`} />;
}
