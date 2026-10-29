import { Redirect } from "expo-router";

/** Histórico now lives in Conquistas; old links and the PWA shortcut still land there. */
export default function HistoryRedirect() {
  return <Redirect href="/achievements?tab=historico" />;
}
