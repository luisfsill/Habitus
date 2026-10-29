import { useEffect, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/app-text";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { parsePrice, type Plan } from "@/domain/access";
import { savePlan, setFreeAccess } from "@/services/admin";
import { fetchPlans } from "@/services/profile";
import { useAccess } from "@/state/access";
import { HIT, space, useTheme } from "@/theme";

interface Draft {
  name: string;
  days: string;
  price: string;
  highlight: boolean;
  active: boolean;
}

const toDraft = (p: Plan): Draft => ({ name: p.name, days: String(p.days), price: (p.priceCents / 100).toFixed(2).replace(".", ","), highlight: p.highlight, active: p.active });

function PlanEditor({ plan, onSaved }: { plan: Plan; onSaved: (message: string) => void }) {
  const { colors } = useTheme();
  const [d, setD] = useState(() => toDraft(plan));
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  const save = async () => {
    const days = Number.parseInt(d.days, 10);
    const priceCents = parsePrice(d.price);
    if (!d.name.trim() || !(days > 0) || priceCents === null) return onSaved("Confira nome, dias e preço.");
    setBusy(true);
    try {
      await savePlan({ ...plan, name: d.name.trim(), days, priceCents, highlight: d.highlight, active: d.active });
      onSaved(`${d.name.trim()} salvo.`);
    } catch (e) {
      onSaved((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (label: string, value: boolean, key: "highlight" | "active") => (
    <View style={styles.row}>
      <AppText variant="body">{label}</AppText>
      <Switch
        value={value}
        onValueChange={(on) => patch({ [key]: on })}
        trackColor={{ true: colors.accent, false: colors.switchOff }}
        thumbColor="#FFFFFF"
        {...{ activeThumbColor: "#FFFFFF" }}
        accessibilityLabel={label}
      />
    </View>
  );

  return (
    <View>
      <View style={styles.editor}>
        <View style={styles.fields}>
          <TextField label="Nome" value={d.name} onChangeText={(name) => patch({ name })} />
          <TextField label="Dias" value={d.days} onChangeText={(days) => patch({ days })} keyboardType="number-pad" />
          <TextField label="Preço (R$)" value={d.price} onChangeText={(price) => patch({ price })} keyboardType="decimal-pad" />
        </View>
        {toggle('Destacar como "Mais vantajoso"', d.highlight, "highlight")}
        {toggle("Mostrar na tela de renovação", d.active, "active")}
        <PrimaryButton label="Salvar" variant="tinted" onPress={() => void save()} loading={busy} />
      </View>
    </View>
  );
}

/** While on, every account gets in, expired or not; the plans below wait for when charging starts. */
function FreeAccessSwitch({ onSaved }: { onSaved: (message: string) => void }) {
  const { colors } = useTheme();
  const { profile, refresh } = useAccess();
  const [busy, setBusy] = useState(false);
  const on = profile?.freeAccess === true;
  const change = async (next: boolean) => {
    setBusy(true);
    try {
      await setFreeAccess(next);
      await refresh();
      onSaved(next ? "App liberado para todos." : "Cobrança ligada: vale o plano de cada conta.");
    } catch (e) {
      onSaved((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.editor}>
      <View style={styles.row}>
        <AppText variant="headline">App liberado para todos</AppText>
        <Switch
          value={on}
          disabled={busy}
          onValueChange={(next) => void change(next)}
          trackColor={{ true: colors.accent, false: colors.switchOff }}
          thumbColor="#FFFFFF"
          {...{ activeThumbColor: "#FFFFFF" }}
          accessibilityLabel="App liberado para todos"
        />
      </View>
      <AppText variant="footnote" color="secondaryLabel">
        {on ? "Ninguém precisa de plano agora. Desligue quando for começar a cobrar." : "Cada conta usa o app enquanto o plano dela estiver em dia."}
      </AppText>
    </View>
  );
}

export default function AdminPlansScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans()
      .then(setPlans)
      .catch((e: Error) => setMessage(e.message));
  }, []);

  return (
    <Screen title="Planos e preços" subtitle="Aparecem na tela de renovação" underHeader>
      {message && (
        <AppText variant="subheadline" color="accentText" accessibilityLiveRegion="polite">
          {message}
        </AppText>
      )}
      <FreeAccessSwitch onSaved={setMessage} />
      {plans.map((p) => (
        <PlanEditor key={p.id} plan={p} onSaved={setMessage} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  editor: { gap: space.md },
  fields: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
