import { Tabs } from "expo-router";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { MAX_WIDTH } from "@/components/screen";
import { useAccess } from "@/state/access";
import { useTheme } from "@/theme";

// Native tabs render as a floating pill on top of the page on web, which does
// not fit four tabs on a phone. The PWA gets a classic bottom tab bar instead.
const TABS = [
  { name: "index", title: "Hoje", ios: "sun.max", android: "wb_sunny" },
  { name: "history", title: "Histórico", ios: "calendar", android: "calendar_month" },
  { name: "achievements", title: "Conquistas", ios: "trophy", android: "emoji_events" },
  { name: "settings", title: "Ajustes", ios: "gearshape", android: "settings" },
  { name: "admin", title: "Admin", ios: "shield", android: "admin_panel_settings" },
] as const;

export default function WebTabsLayout() {
  const { colors } = useTheme();
  const { isAdmin } = useAccess();
  const { bottom } = useSafeAreaInsets();
  // Keep the tabs in the same column as the content on wide screens.
  const side = Math.max(0, (useWindowDimensions().width - MAX_WIDTH) / 2);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondaryLabel,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.separator, height: 68 + bottom, paddingTop: 6, paddingBottom: 10 + bottom, paddingHorizontal: side },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 16, fontWeight: "600" },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            // Only administrators see the Admin tab; for everyone else it is not a link at all.
            href: tab.name === "admin" && !isAdmin ? null : undefined,
            tabBarIcon: ({ color }) => <Icon ios={tab.ios} android={tab.android} size={24} color={String(color)} />,
          }}
        />
      ))}
    </Tabs>
  );
}
