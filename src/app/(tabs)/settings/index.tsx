import { type Href, router } from "expo-router";

import { ActionRow } from "@/components/action-row";
import { PermissionBanners } from "@/components/permission-banner";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { openSystemSettings } from "@/services/notifications";
import { useAppState } from "@/state/app-state";
import { TabAccount } from "@/state/tab-account";

interface Item {
  label: string;
  icon: { ios: string; android: string };
  href: Href;
}

// Grouped like Instagram's settings: a short heading, then one row per screen.
const GROUPS: readonly { title: string; items: readonly Item[] }[] = [
  {
    title: "Seu dia",
    items: [
      { label: "Horário", icon: { ios: "clock", android: "schedule" }, href: "/settings/horario" },
      { label: "Hora de dormir", icon: { ios: "moon", android: "bedtime" }, href: "/settings/dormir" },
      { label: "Dias da semana", icon: { ios: "calendar", android: "calendar_month" }, href: "/settings/dias" },
    ],
  },
  {
    title: "Lembretes",
    items: [
      { label: "Notificações", icon: { ios: "bell", android: "notifications" }, href: "/settings/notificacoes" },
      { label: "Água", icon: { ios: "drop", android: "water_drop" }, href: "/settings/agua" },
      { label: "Afirmações", icon: { ios: "quote.bubble", android: "format_quote" }, href: "/settings/afirmacoes" },
    ],
  },
  {
    title: "App",
    items: [{ label: "Aparência", icon: { ios: "paintpalette", android: "palette" }, href: "/settings/aparencia" }],
  },
  {
    title: "Sua conta",
    items: [{ label: "Conta", icon: { ios: "person.crop.circle", android: "account_circle" }, href: "/settings/conta" }],
  },
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
      {GROUPS.map((group) => (
        <Section key={group.title} title={group.title}>
          {group.items.map((item) => (
            <ActionRow key={item.label} label={item.label} icon={item.icon} navigates onPress={() => router.push(item.href)} />
          ))}
        </Section>
      ))}
    </Screen>
  );
}
