import { Tabs } from "expo-router";

import { FloatingTabBar } from "@/components/floating-tab-bar";
import { useAccess } from "@/state/access";

// Native tabs render as a floating pill on top of the page on web, which does
// not fit four tabs on a phone. The PWA draws its own floating bar instead.
const TABS = [
  { key: "index", label: "Hoje", ios: "sun.max", android: "wb_sunny" },
  { key: "history", label: "Histórico", ios: "calendar", android: "calendar_month" },
  { key: "achievements", label: "Conquistas", ios: "trophy", android: "emoji_events" },
  { key: "settings", label: "Ajustes", ios: "gearshape", android: "settings" },
  { key: "admin", label: "Admin", ios: "shield", android: "admin_panel_settings" },
] as const;

export default function WebTabsLayout() {
  const { isAdmin } = useAccess();
  // Only administrators see the Admin tab; for everyone else it is not a link at all.
  const shown = TABS.filter((tab) => tab.key !== "admin" || isAdmin);
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, emitter, navigateToTab, insets }) => {
        const keyOf = (name: string) => state.routes.find((r) => r.name === name)?.key;
        return (
          <FloatingTabBar
            tabs={shown}
            active={state.routes[state.index]?.name ?? "index"}
            bottomInset={insets.bottom}
            onPress={(name) => {
              const key = keyOf(name);
              if (!key) return;
              const event = emitter.emit({ type: "tabPress", target: key, canPreventDefault: true });
              if (name !== state.routes[state.index]?.name && !event.defaultPrevented) navigateToTab(key);
            }}
          />
        );
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.key} name={tab.key} options={{ title: tab.label, href: tab.key === "admin" && !isAdmin ? null : undefined }} />
      ))}
    </Tabs>
  );
}
