import { Tabs, TabList, TabSlot, TabTrigger, useTabTrigger } from "expo-router/ui";
import { StyleSheet, View } from "react-native";

import { Icon } from "@/components/icon";
import { LiquidNavbar, type NimbusFx } from "@/components/ui/liquid-glass-navbar";
import { useUnreadCount } from "@/state/use-chat";
import { useIncomingCount } from "@/state/use-friends";
import { useOnlineSharing } from "@/state/use-online";
import { playSplash, settleWater, stirWater } from "@/services/water-sound";
import { pinned, useTheme } from "@/theme";

// Native tabs render as a floating pill on top of the page on web, which does
// not fit four tabs on a phone. The PWA draws its own floating bar instead: the liquid glass navbar.
// Headless tabs (expo-router/ui): their screen container does not clip, so the
// page can overflow and the document scrolls (mobile Safari then hides its bars).
const TABS = [
  { key: "index", fx: "glow" as NimbusFx, label: "Hoje", ios: "sun.max", android: "wb_sunny", href: "/" },
  { key: "achievements", fx: "pop" as NimbusFx, label: "Conquistas", ios: "trophy", android: "emoji_events", href: "/achievements" },
  { key: "conversas", fx: "pop" as NimbusFx, label: "Conversas", ios: "bubble.left.and.bubble.right", android: "chat", href: "/conversas" },
  { key: "profile", fx: "pop" as NimbusFx, label: "Perfil", ios: "person.crop.circle", android: "account_circle", href: "/profile" },
  { key: "settings", fx: "wave" as NimbusFx, label: "Ajustes", ios: "gearshape", android: "settings", href: "/settings" },
  { key: "admin", fx: "pop" as NimbusFx, label: "Admin", ios: "shield", android: "admin_panel_settings", href: "/admin" },
] as const;

type Tab = (typeof TABS)[number];

function Bar({ tabs }: { tabs: readonly Tab[] }) {
  const { switchTab, getTrigger } = useTabTrigger({ name: "index" });
  // In the admin area (reached from the account menu) no tab is lit, so any tab leads back.
  const active = getTrigger("admin")?.isFocused ? -1 : Math.max(0, tabs.findIndex((tab) => getTrigger(tab.key)?.isFocused));
  const { colors, scheme } = useTheme();
  const incoming = useIncomingCount();
  useOnlineSharing();
  const unread = useUnreadCount();
  const items = tabs.map((tab, i) => ({
    key: tab.key,
    label:
      tab.key === "profile" && incoming > 0
        ? `${tab.label}, ${incoming} ${incoming === 1 ? "pedido" : "pedidos"}`
        : tab.key === "conversas" && unread > 0
          ? `${tab.label}, ${unread} ${unread === 1 ? "não lida" : "não lidas"}`
          : tab.label,
    fx: tab.fx,
    icon: (
      <View>
        <Icon ios={tab.ios} android={tab.android} size={24} color={i === active ? colors.label : colors.secondaryLabel} />
        {((tab.key === "conversas" && unread > 0) || (tab.key === "profile" && incoming > 0)) && <View style={[styles.dot, { backgroundColor: colors.danger }]} />}
      </View>
    ),
  }));
  return (
    <View pointerEvents="box-none" style={[styles.wrap, pinned]}>
      <LiquidNavbar items={items} active={active} tone={scheme} compact label="Abas" style={BAR} sounds={SOUNDS} onChange={(_, item) => switchTab(item.key, {})} />
    </View>
  );
}

export default function WebTabsLayout() {
  // The admin tab is registered but never drawn: administrators open it from the account menu (the admin layout also redirects others).
  const shown = TABS.filter((tab) => tab.key !== "admin");
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
// The same gap below and at the sides, so the pill follows the rounded screen corners. Like iOS 26's own tab bar
// it sits over the home indicator's safe area (34 pt), still clear of the indicator line itself.
const EDGE = 18;
// Almost edge to edge on a phone, as wide as the page column on a computer. The pill is wider than its fixed wrap
// (it overflows it evenly): mobile Safari paints its toolbar in a solid colour when a fixed box at least 90% of the
// window wide sits at the bottom edge, and keeps that colour once a scroll has put its probe point inside the box
// (WebKit fixedContainerEdges). The wrap stays at 84%, below that, and off the edge (`bottom`, not padding).
// Five tabs read as one group: on a wide screen the pill stays this narrow instead of spanning the 1120 px column.
const BAR = { width: `calc(100vw - ${2 * EDGE}px)`, maxWidth: 640 };
const SIDE = "8%";

const styles = StyleSheet.create({
  // The triggers only register the tabs; the floating bar is the visible one.
  hidden: { display: "none" },
  wrap: { left: SIDE, right: SIDE, bottom: EDGE, alignItems: "center" },
  // Unread messages or friend requests: a red dot on the icon's top right, gone once seen.
  dot: { position: "absolute", top: -2, right: -4, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: "#FFFFFF" },
});
