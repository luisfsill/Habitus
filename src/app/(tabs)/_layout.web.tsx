import { Tabs } from "expo-router";

import { Icon } from "@/components/icon";
import { useTheme } from "@/theme";

// Native tabs render as a floating pill on top of the page on web, which does
// not fit four tabs on a phone. The PWA gets a classic bottom tab bar instead.
const TABS = [
  { name: "index", title: "Hoje", ios: "sun.max", android: "wb_sunny" },
  { name: "history", title: "Histórico", ios: "calendar", android: "calendar_month" },
  { name: "achievements", title: "Conquistas", ios: "trophy", android: "emoji_events" },
  { name: "settings", title: "Ajustes", ios: "gearshape", android: "settings" },
] as const;

export default function WebTabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondaryLabel,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.separator, height: 68, paddingTop: 6, paddingBottom: 10 },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 16, fontWeight: "600" },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <Icon ios={tab.ios} android={tab.android} size={24} color={String(color)} />,
          }}
        />
      ))}
    </Tabs>
  );
}
