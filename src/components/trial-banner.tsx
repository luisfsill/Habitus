import { StyleSheet, View } from "react-native";

import { accessStatus, daysLeft, type Profile } from "@/domain/access";
import { space } from "@/theme";

import { AppText } from "./app-text";
import { PrimaryButton } from "./primary-button";

/** Shown on Hoje in the last 3 days of the free trial. */
export function TrialBanner({ profile, now, onSeePlans }: { profile: Profile | null; now: Date; onSeePlans: () => void }) {
  if (!profile || accessStatus(profile, now) !== "trial") return null;
  const left = daysLeft(profile, now);
  if (left > 3) return null;
  return (
    <View>
      <View style={styles.row}>
        <AppText variant="subheadline" style={styles.flex}>
          {left === 1 ? "Falta 1 dia" : `Faltam ${left} dias`} do seu teste grátis.
        </AppText>
        <PrimaryButton label="Ver planos" variant="tinted" onPress={onSeePlans} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  flex: { flex: 1 },
});
