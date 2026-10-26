import { Tabs, TabList, TabSlot, TabTrigger, useTabTrigger } from "expo-router/ui";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatingTabBar, type TabItem } from "@/components/floating-tab-bar";
import { useAccess } from "@/state/access";

// Native tabs render as a floating pill on top of the page on web, which does
// not fit four tabs on a phone. The PWA draws its own floating bar instead.
// Headless tabs (expo-router/ui): their screen container does not clip, so the
// page can overflow and the document scrolls (mobile Safari then hides its bars).
const TABS = [
  { key: "index", label: "Hoje", ios: "sun.max", android: "wb_sunny", href: "/" },
  { key: "history", label: "Histórico", ios: "calendar", android: "calendar_month", href: "/history" },
  { key: "achievements", label: "Conquistas", ios: "trophy", android: "emoji_events", href: "/achievements" },
  { key: "settings", label: "Ajustes", ios: "gearshape", android: "settings", href: "/settings" },
  { key: "admin", label: "Admin", ios: "shield", android: "admin_panel_settings", href: "/admin" },
] as const;

function Bar({ tabs }: { tabs: readonly TabItem[] }) {
  const { switchTab, getTrigger } = useTabTrigger({ name: "index" });
  const active = tabs.find((tab) => getTrigger(tab.key)?.isFocused)?.key ?? "index";
  const insets = useSafeAreaInsets();
  return <FloatingTabBar tabs={tabs} active={active} bottomInset={insets.bottom} onPress={(key) => switchTab(key, {})} />;
}

export default function WebTabsLayout() {
  const { isAdmin } = useAccess();
  // Only administrators see the Admin tab; for everyone else it is not a link at all (the admin layout also redirects).
  const shown = TABS.filter((tab) => tab.key !== "admin" || isAdmin);
  return (
    <Tabs>
      <TabSlot />
      <TabList style={styles.hidden}>
        {TABS.map((tab) => (
          <TabTrigger key={tab.key} name={tab.key} href={tab.href} />
        ))}
      </TabList>
      <Bar tabs={shown} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // The triggers only register the tabs; the floating bar is the visible one.
  hidden: { display: "none" },
});
