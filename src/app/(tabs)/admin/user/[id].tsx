import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ActionRow } from "@/components/action-row";
import { formatDate } from "@/components/admin-user-row";
import { AppText } from "@/components/app-text";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { StatColumns } from "@/components/stat-columns";
import { ToggleSwitch } from "@/components/toggle-switch";
import { accessStatus, displayName, endOfDaySaoPaulo, extendAccess, parseBrDate, type Profile, statusLabel } from "@/domain/access";
import { isValidEmail } from "@/domain/auth-rules";
import { deleteUser, listProfiles, resetPassword, setAccess, setRole, updateEmail, updateName } from "@/services/admin";
import { useAuth } from "@/state/auth";
import { confirm } from "@/state/use-sign-out";
import { HIT, type Palette, radius, space, type, useTheme } from "@/theme";

const GRANTS = [30, 90, 365] as const;

const STATUS_COLOR: Record<ReturnType<typeof accessStatus>, keyof Palette> = {
  admin: "label",
  unlimited: "accentText",
  active: "successText",
  trial: "warm",
  expired: "danger",
};

function newPassword(p: Profile, report: (message: string) => void) {
  resetPassword(p.id)
    .then((pw) => {
      report(`Nova senha provisória: ${pw}`);
      const text = `Olá, ${displayName(p)}! Sua nova senha provisória do Habitus é: ${pw}`;
      confirm("Senha gerada", `Nova senha: ${pw}\n\nEnviar pelo WhatsApp?`, "Enviar", () => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`));
    })
    .catch((e: Error) => report(e.message));
}

function removeAccount(p: Profile, report: (message: string) => void) {
  confirm("Excluir conta?", `${displayName(p)} e todo o progresso serão apagados.`, "Continuar", () =>
    confirm("Tem certeza?", "Não dá para desfazer.", "Excluir", () => {
      deleteUser(p.id)
        .then(() => router.back())
        .catch((e: Error) => report(e.message));
    }),
  );
}

/** A label on the left and an editable value on the right; `onApply` adds an "Aplicar" button once there is text. */
function FieldRow({ label, onApply, ...input }: { label: string; onApply?: () => void } & React.ComponentProps<typeof TextInput>) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <AppText variant="body">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.secondaryLabel}
        returnKeyType="done"
        onSubmitEditing={onApply}
        {...input}
        style={[type.body, styles.input, { color: colors.label }]}
      />
      {onApply && input.value ? (
        <Pressable onPress={onApply} accessibilityRole="button" accessibilityLabel={`Aplicar ${label.toLowerCase()}`} hitSlop={8}>
          <AppText variant="body" color="accentText" style={styles.bold}>
            Aplicar
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Grants, custom days or date, unlimited switch and removal for one account. */
function AccessSection({ p, now, run, report }: { p: Profile; now: Date; run: (action: () => Promise<unknown>, done: string) => Promise<void>; report: (message: string) => void }) {
  const { colors } = useTheme();
  const [days, setDays] = useState("");
  const [until, setUntil] = useState("");
  const access = (next: { until: string | null; unlimited: boolean }, done: string) => run(() => setAccess(p.id, { ...next, plan: "paid" }), done);
  const grant = (n: number) => void access({ until: extendAccess(p.accessUntil, n, now), unlimited: false }, `+${n} dias adicionados.`);
  const addDays = () => {
    const n = Number.parseInt(days, 10);
    if (!Number.isFinite(n) || n < 1) return report("Digite um número de dias (1 ou mais).");
    grant(n);
    setDays("");
  };
  const setDate = () => {
    const day = parseBrDate(until);
    if (!day) return report("Use o formato DD/MM/AAAA, por exemplo 31/12/2026.");
    void access({ until: endOfDaySaoPaulo(day), unlimited: false }, `Válido até ${until.trim()}.`);
    setUntil("");
  };

  return (
    <Section title="Acesso" footer="Os dias somam à validade atual. Uma data nova substitui a validade.">
      <View style={styles.grants}>
        {GRANTS.map((n) => (
          <Pressable
            key={n}
            onPress={() => grant(n)}
            accessibilityRole="button"
            accessibilityLabel={`Liberar mais ${n} dias`}
            style={({ pressed }) => [styles.chip, { backgroundColor: colors.accentSoft, opacity: pressed ? 0.6 : 1 }]}>
            <AppText variant="subheadline" color="accentText" style={styles.bold}>
              +{n} dias
            </AppText>
          </Pressable>
        ))}
      </View>
      <View>
        <FieldRow label="Somar dias" value={days} onChangeText={setDays} onApply={addDays} keyboardType="number-pad" placeholder="ex.: 15" />
        <FieldRow label="Válido até" value={until} onChangeText={setUntil} onApply={setDate} placeholder="DD/MM/AAAA" />
      </View>
      <View style={styles.row}>
        <AppText variant="body">Acesso ilimitado</AppText>
        <ToggleSwitch
          value={p.unlimited}
          onValueChange={(on) => void access({ until: p.accessUntil, unlimited: on }, on ? "Acesso ilimitado." : "Ilimitado desligado.")}
          accessibilityLabel="Acesso ilimitado"
        />
      </View>
      <ActionRow
        label="Remover acesso"
        icon={{ ios: "nosign", android: "block" }}
        destructive
        onPress={() => void run(() => setAccess(p.id, { until: now.toISOString(), unlimited: false, plan: p.plan }), "Acesso removido.")}
      />
    </Section>
  );
}

/** Everything about one account: status at a glance, access, details, role and account actions. */
export default function AdminUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [p, setP] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const self = session?.user.id === id;

  const show = useCallback(
    (list: Profile[]) => {
      const found = list.find((x) => x.id === id) ?? null;
      setP(found);
      setName(found?.name ?? "");
      setEmail(found?.email ?? "");
    },
    [id],
  );
  const load = () => listProfiles().then(show);

  useEffect(() => {
    listProfiles()
      .then(show)
      .catch((e: Error) => setStatus(e.message));
  }, [show]);

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      await load();
      setStatus(done);
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  if (!p) {
    return (
      <Screen title="Usuário" underHeader>
        <AppText variant="body" color="secondaryLabel">{status ?? "Carregando…"}</AppText>
      </Screen>
    );
  }

  const now = new Date();
  const saveName = () => {
    if (name.trim() && name.trim() !== p.name) void run(() => updateName(p.id, name.trim()), "Nome salvo.");
  };
  const saveEmail = () => {
    if (email.trim() === p.email) return;
    if (!isValidEmail(email)) return setStatus("E-mail inválido.");
    void run(() => updateEmail(p.id, email.trim()), "E-mail trocado.");
  };

  return (
    <Screen title={displayName(p)} subtitle={`Conta criada em ${formatDate(p.createdAt)}`} underHeader>
      <StatColumns
        stats={[
          { value: statusLabel(p, now), label: "status", color: STATUS_COLOR[accessStatus(p, now)] },
          { value: p.unlimited ? "∞" : formatDate(p.accessUntil), label: "válido até" },
          { value: p.role === "admin" ? "Admin" : "Usuário", label: "cargo" },
        ]}
      />
      {status && (
        <AppText variant="subheadline" color="accentText" selectable accessibilityLiveRegion="polite">
          {status}
        </AppText>
      )}

      <AccessSection p={p} now={now} run={run} report={setStatus} />

      <Section title="Dados" footer="As mudanças salvam ao sair do campo.">
        <View>
          <FieldRow label="Nome" value={name} onChangeText={setName} onBlur={saveName} onSubmitEditing={saveName} autoCapitalize="words" placeholder="Nome" />
          <FieldRow label="E-mail" value={email} onChangeText={setEmail} onBlur={saveEmail} onSubmitEditing={saveEmail} keyboardType="email-address" autoCapitalize="none" placeholder="email@exemplo.com" />
        </View>
      </Section>

      <Section title="Cargo" footer={self ? "Você não pode mudar o seu próprio cargo." : "Administradores veem o painel Admin."}>
        <View style={styles.row}>
          <AppText variant="body">Administrador</AppText>
          {self ? (
            <AppText variant="body" color="secondaryLabel">Sim</AppText>
          ) : (
            <ToggleSwitch
              value={p.role === "admin"}
              onValueChange={(on) => void run(() => setRole(p.id, on ? "admin" : "user"), on ? "Agora é administrador." : "Agora é usuário comum.")}
              accessibilityLabel="Administrador"
            />
          )}
        </View>
      </Section>

      <Section title="Conta">
        <View>
          <ActionRow label="Gerar nova senha provisória" icon={{ ios: "key", android: "key" }} onPress={() => newPassword(p, setStatus)} />
          {!self && <ActionRow label="Excluir conta" icon={{ ios: "trash", android: "delete" }} destructive onPress={() => removeAccount(p, setStatus)} />}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  input: { flex: 1, textAlign: "right", minHeight: HIT },
  grants: { flexDirection: "row", gap: space.sm },
  chip: { flex: 1, minHeight: 40, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  bold: { fontWeight: "600" },
});
