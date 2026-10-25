import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Platform, StyleSheet, Switch, View } from "react-native";

import { formatDate } from "@/components/admin-user-row";
import { AppText } from "@/components/app-text";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { SegmentedControl } from "@/components/segmented-control";
import { TextField } from "@/components/text-field";
import { accessStatus, displayName, endOfDaySaoPaulo, extendAccess, type Profile, type Role } from "@/domain/access";
import { isValidEmail } from "@/domain/auth-rules";
import { deleteUser, listProfiles, resetPassword, setAccess, setRole, updateEmail, updateName } from "@/services/admin";
import { useAuth } from "@/state/auth";
import { HIT, space, useTheme } from "@/theme";

const ROLES: readonly { value: Role; label: string }[] = [
  { value: "user", label: "Usuário comum" },
  { value: "admin", label: "Administrador" },
];

function confirm(title: string, message: string, action: string, onYes: () => void) {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: action, style: "destructive", onPress: onYes },
  ]);
}

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

/** Everything about one account: name, e-mail, exact validity, role, password, deletion. */
export default function AdminUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { colors } = useTheme();
  const [p, setP] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState("");
  const [until, setUntil] = useState("");
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

  const access = (next: { until: string | null; unlimited: boolean }, done: string) =>
    run(() => setAccess(p.id, { ...next, plan: "paid" }), done);
  const addDays = () => {
    const n = Number.parseInt(days, 10);
    if (!Number.isFinite(n) || n < 1) return setStatus("Digite um número de dias (1 ou mais).");
    void access({ until: extendAccess(p.accessUntil, n, new Date()), unlimited: false }, `+${n} dias adicionados.`);
    setDays("");
  };
  const setDate = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) return setStatus("Use o formato AAAA-MM-DD, por exemplo 2026-12-31.");
    void access({ until: endOfDaySaoPaulo(until), unlimited: false }, `Válido até ${until.split("-").reverse().join("/")}.`);
  };
  return (
    <Screen title={displayName(p)} subtitle={`Conta criada em ${formatDate(p.createdAt)}`} underHeader>
      {status && (
        <AppText variant="subheadline" color="accentText" selectable accessibilityLiveRegion="polite">
          {status}
        </AppText>
      )}
      <Section title="Dados">
        <TextField label="Nome" value={name} onChangeText={setName} autoCapitalize="words" />
        <PrimaryButton label="Salvar nome" variant="tinted" onPress={() => void run(() => updateName(p.id, name), "Nome salvo.")} />
        <TextField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <PrimaryButton
          label="Salvar e-mail"
          variant="tinted"
          onPress={() => (isValidEmail(email) ? void run(() => updateEmail(p.id, email.trim()), "E-mail trocado.") : setStatus("E-mail inválido."))}
        />
      </Section>

      <Section title="Acesso" footer={`Status: ${accessStatus(p, new Date())}. Validade atual: ${p.unlimited ? "ilimitado" : formatDate(p.accessUntil)}.`}>
        <View style={styles.inline}>
          <TextField label="Adicionar dias" value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="ex.: 15" />
          <PrimaryButton label="Adicionar" variant="tinted" onPress={addDays} />
        </View>
        <View style={styles.inline}>
          <TextField label="Válido até (AAAA-MM-DD)" value={until} onChangeText={setUntil} placeholder="2026-12-31" />
          <PrimaryButton label="Definir" variant="tinted" onPress={setDate} />
        </View>
        <View style={styles.row}>
          <AppText variant="body">Acesso ilimitado</AppText>
          <Switch
            value={p.unlimited}
            onValueChange={(on) => void access({ until: p.accessUntil, unlimited: on }, on ? "Acesso ilimitado." : "Ilimitado desligado.")}
            trackColor={{ true: colors.accent, false: colors.switchOff }}
            thumbColor="#FFFFFF"
            {...{ activeThumbColor: "#FFFFFF" }}
            accessibilityLabel="Acesso ilimitado"
          />
        </View>
        <PrimaryButton
          label="Remover acesso"
          variant="plain"
          destructive
          onPress={() => void run(() => setAccess(p.id, { until: new Date().toISOString(), unlimited: false, plan: p.plan }), "Acesso removido.")}
        />
      </Section>

      <Section title="Cargo" footer={self ? "Você não pode mudar o seu próprio cargo." : undefined}>
        <SegmentedControl
          label="Cargo"
          options={ROLES}
          value={p.role}
          onChange={(role) => (self ? undefined : void run(() => setRole(p.id, role), role === "admin" ? "Agora é administrador." : "Agora é usuário comum."))}
        />
      </Section>

      <Section title="Conta">
        <PrimaryButton label="Gerar nova senha provisória" variant="tinted" onPress={() => newPassword(p, setStatus)} />
        {!self && <PrimaryButton label="Excluir conta" variant="plain" destructive onPress={() => removeAccount(p, setStatus)} />}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, flexWrap: "wrap" },
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
