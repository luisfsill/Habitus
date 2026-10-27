import { Tabs, TabList, TabSlot, TabTrigger, useTabTrigger } from "expo-router/ui";
import { StyleSheet, View } from "react-native";

import { Icon } from "@/components/icon";
import { MAX_WIDTH } from "@/components/screen";
import { LiquidNavbar, type NimbusFx } from "@/components/ui/liquid-glass-navbar";
import { playSplash, settleWater, stirWater } from "@/services/sound";
import { useAccess } from "@/state/access";
import { pinned, useTheme } from "@/theme";

// Native tabs render as a floating pill on top of the page on web, which does
// not fit four tabs on a phone. The PWA draws its own floating bar instead: the liquid glass navbar.
// Headless tabs (expo-router/ui): their screen container does not clip, so the
// page can overflow and the document scrolls (mobile Safari then hides its bars).
const TABS = [
  { key: "index", fx: "glow" as NimbusFx, label: "Hoje", ios: "sun.max", android: "wb_sunny", href: "/" },
  { key: "history", fx: "spin" as NimbusFx, label: "Histórico", ios: "calendar", android: "calendar_month", href: "/history" },
  { key: "achievements", fx: "pop" as NimbusFx, label: "Conquistas", ios: "trophy", android: "emoji_events", href: "/achievements" },
  { key: "settings", fx: "wave" as NimbusFx, label: "Ajustes", ios: "gearshape", android: "settings", href: "/settings" },
  { key: "admin", fx: "pop" as NimbusFx, label: "Admin", ios: "shield", android: "admin_panel_settings", href: "/admin" },
] as const;

type Tab = (typeof TABS)[number];

function Bar({ tabs }: { tabs: readonly Tab[] }) {
  const { switchTab, getTrigger } = useTabTrigger({ name: "index" });
  const active = Math.max(0, tabs.findIndex((tab) => getTrigger(tab.key)?.isFocused));
  const { colors, scheme } = useTheme();
  const items = tabs.map((tab, i) => ({
    key: tab.key,
    label: tab.label,
    fx: tab.fx,
    icon: <Icon ios={tab.ios} android={tab.android} size={24} color={i === active ? colors.label : colors.secondaryLabel} />,
  }));
  return (
    <View pointerEvents="box-none" style={[styles.wrap, pinned]}>
      <LiquidNavbar items={items} active={active} tone={scheme} compact label="Abas" style={BAR} sounds={SOUNDS} onChange={(_, item) => switchTab(item.key, {})} />
    </View>
  );
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

// A tap touches the water; dragging a finger across it sloshes the water.
const SOUNDS = { tap: playSplash, stir: stirWater, settle: settleWater };
// Almost edge to edge on a phone, as wide as the page column on a computer.
const BAR = { width: "100%", maxWidth: MAX_WIDTH };
// The same gap below and at the sides, so the pill follows the rounded screen corners. Like iOS 26's own tab bar
// it sits over the home indicator's safe area (34 pt), still clear of the indicator line itself.
const EDGE = 18;

const styles = StyleSheet.create({
  // The triggers only register the tabs; the floating bar is the visible one.
  hidden: { display: "none" },
  wrap: { left: 0, right: 0, bottom: 0, alignItems: "center", paddingHorizontal: EDGE, paddingBottom: EDGE },
});
