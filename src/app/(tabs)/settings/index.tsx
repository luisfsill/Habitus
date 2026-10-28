import { type Href, router } from "expo-router";
import { View } from "react-native";

import { ActionRow } from "@/components/action-row";
import { PermissionBanners } from "@/components/permission-banner";
import { Screen } from "@/components/screen";
import { openSystemSettings } from "@/services/notifications";
import { useAppState } from "@/state/app-state";
import { TabAccount } from "@/state/tab-account";

// One plain list, like Instagram's settings: each row opens its own screen.
const ITEMS: readonly { label: string; icon: { ios: string; android: string }; href: Href }[] = [
  { label: "Conta", icon: { ios: "person.crop.circle", android: "account_circle" }, href: "/settings/conta" },
  { label: "Horário", icon: { ios: "clock", android: "schedule" }, href: "/settings/horario" },
  { label: "Dias da semana", icon: { ios: "calendar", android: "calendar_month" }, href: "/settings/dias" },
  { label: "Notificações", icon: { ios: "bell", android: "notifications" }, href: "/settings/notificacoes" },
  { label: "Água", icon: { ios: "drop", android: "water_drop" }, href: "/settings/agua" },
  { label: "Afirmações", icon: { ios: "quote.bubble", android: "format_quote" }, href: "/settings/afirmacoes" },
  { label: "Aparência", icon: { ios: "paintpalette", android: "palette" }, href: "/settings/aparencia" },
];

export default function SettingsMenuScreen() {
  const { permission, exactAlarms, askExactAlarms } = useAppState();
  return (
    <Screen title="Ajustes" accessory={<TabAccount />}>
      <PermissionBanners
        permission={permission}
        exactAlarms={exactAlarms}
        onOpenSettings={() => void openSystemSettings()}
        onAllowExactAlarms={() => void askExactAlarms()}
      />
      <View>
        {ITEMS.map((item) => (
          <ActionRow key={item.label} label={item.label} icon={item.icon} navigates onPress={() => router.push(item.href)} />
        ))}
      </View>
    </Screen>
  );
}
