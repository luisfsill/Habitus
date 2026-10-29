import { NativeTabs } from "expo-router/native-tabs";

import { useUnreadCount } from "@/state/use-chat";
import { useIncomingCount } from "@/state/use-friends";
import { useOnlineSharing } from "@/state/use-online";
import { useTheme } from "@/theme";

export default function TabsLayout() {
  const { colors } = useTheme();
  const requests = useIncomingCount();
  useOnlineSharing();
  const unread = useUnreadCount();
  return (
    <NativeTabs tintColor={colors.accent} labelStyle={{ selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Hoje</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "sun.max", selected: "sun.max.fill" }} md="wb_sunny" />
      </NativeTabs.Trigger>
      {/* Now a segment of Conquistas; the route only redirects. */}
      <NativeTabs.Trigger name="history" hidden>
        <NativeTabs.Trigger.Label>Histórico</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "calendar", selected: "calendar" }} md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="achievements">
        <NativeTabs.Trigger.Label>Conquistas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "trophy", selected: "trophy.fill" }} md="emoji_events" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="conversas">
        <NativeTabs.Trigger.Label>Conversas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} md="chat" />
        <NativeTabs.Trigger.Badge hidden={unread === 0}>{String(unread)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="account_circle" />
        <NativeTabs.Trigger.Badge hidden={requests === 0}>{String(requests)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} md="settings" />
      </NativeTabs.Trigger>
      {/* Opened from the account menu (Área admin), never from the tab bar. */}
      <NativeTabs.Trigger name="admin" hidden>
        <NativeTabs.Trigger.Label>Admin</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "shield", selected: "shield.fill" }} md="admin_panel_settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
