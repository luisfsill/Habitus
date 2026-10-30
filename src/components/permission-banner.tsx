import { StyleSheet, View } from "react-native";

import { space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { PrimaryButton } from "./primary-button";

type Kind = "notifications" | "exact-alarms";

const COPY: Record<Kind, { title: string; body: string; button: string; ios: string; android: string }> = {
  notifications: {
    title: "Notificações desativadas",
    body: "Sem elas, o Habitus não consegue lembrar você das dicas na hora certa.",
    button: "Abrir Ajustes",
    ios: "bell.slash.fill",
    android: "notifications_off",
  },
  "exact-alarms": {
    title: "Lembretes podem atrasar",
    body: "Sem a permissão de alarmes e lembretes, o Android pode atrasar os avisos em até 1 hora.",
    button: "Permitir horário exato",
    ios: "clock.badge.exclamationmark",
    android: "alarm_off",
  },
};

interface Props {
  kind?: Kind;
  onPress: () => void;
}

export function PermissionBanner({ kind = "notifications", onPress }: Props) {
  const { colors } = useTheme();
  const copy = COPY[kind];
  return (
    <View>
      <View style={styles.row} accessibilityRole="alert">
        <Icon ios={copy.ios} android={copy.android} size={22} color={colors.warm} />
        <View style={styles.text}>
          <AppText variant="headline">{copy.title}</AppText>
          <AppText variant="subheadline" color="secondaryLabel">
            {copy.body}
          </AppText>
        </View>
      </View>
      <View style={styles.button}>
        <PrimaryButton label={copy.button} variant="tinted" onPress={onPress} />
      </View>
    </View>
  );
}

interface BannersProps {
  permission: "granted" | "denied" | "undetermined";
  exactAlarms: boolean;
  onOpenSettings: () => void;
  onAllowExactAlarms: () => void;
}

/** The one permission problem worth showing right now, if any. None in dev: the dev server rarely has the permission. */
export function PermissionBanners({ permission, exactAlarms, onOpenSettings, onAllowExactAlarms }: BannersProps) {
  if (__DEV__) return null;
  if (permission === "denied") return <PermissionBanner onPress={onOpenSettings} />;
  if (permission === "granted" && !exactAlarms) return <PermissionBanner kind="exact-alarms" onPress={onAllowExactAlarms} />;
  return null;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  text: { flex: 1, gap: 2 },
  button: { marginTop: space.md },
});
