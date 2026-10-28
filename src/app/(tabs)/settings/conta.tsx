import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ActionRow } from "@/components/action-row";
import { AppText } from "@/components/app-text";
import { Screen } from "@/components/screen";
import { PrimaryButton } from "@/components/primary-button";
import { Section } from "@/components/section";
import { ToggleSwitch } from "@/components/toggle-switch";
import { UsernameField } from "@/components/username-field";
import { useAppState } from "@/state/app-state";
import { useAccess } from "@/state/access";
import { useAuth } from "@/state/auth";
import { confirm, useSignOut } from "@/state/use-sign-out";
import { useUsernameCheck } from "@/state/use-username-check";
import { HIT, useTheme } from "@/theme";

/** Inline editor for the @: saves only once the typed one is free. */
function UsernameEdit({ current, onDone }: { current: string; onDone: (message: string) => void }) {
  const { isAdmin, setUsername } = useAccess();
  const { value, status, change } = useUsernameCheck(isAdmin, current);
  const [saving, setSaving] = useState(false);
  const save = () => {
    setSaving(true);
    setUsername(value)
      .then(() => onDone("@ salvo."))
      .catch((error: Error) => onDone(error.message))
      .finally(() => setSaving(false));
  };
  return (
    <View style={styles.edit}>
      <UsernameField value={value} onChange={change} status={status} />
      <PrimaryButton label="Salvar" onPress={save} disabled={status !== "available"} loading={saving} />
    </View>
  );
}

function AccountSection({ onReset }: { onReset: () => void }) {
  const { session, deleteAccount } = useAuth();
  const leave = useSignOut();
  const { profile, setName, setSearchable } = useAccess();
  const [editing, setEditing] = useState(false);
  const { colors } = useTheme();
  const [name, setDraftName] = useState(profile?.name ?? "");
  const [message, setMessage] = useState<string | null>(null);

  const saveName = () => {
    if (!name.trim() || name.trim() === profile?.name) return;
    setName(name.trim())
      .then(() => setMessage("Nome salvo."))
      .catch((error: Error) => setMessage(error.message));
  };

  const remove = () =>
    confirm("Excluir conta?", "Sua conta e todo o seu progresso serão apagados. Não dá para desfazer.", "Continuar", () =>
      confirm("Tem certeza?", "Esta é a última confirmação. A conta será excluída agora.", "Excluir conta", () => {
        void deleteAccount().then((result) => setMessage(result.ok ? null : result.message));
      }),
    );

  return (
    <Section title="Conta">
      <View>
        <View style={styles.row}>
          <AppText variant="body">Nome</AppText>
          <TextInput
            value={name}
            onChangeText={(t) => setDraftName(t.slice(0, 80))}
            onBlur={saveName}
            onSubmitEditing={saveName}
            placeholder="Seu nome"
            placeholderTextColor={colors.secondaryLabel}
            autoCapitalize="words"
            accessibilityLabel="Nome"
            style={[styles.nameInput, { color: colors.label }]}
          />
        </View>
        <Pressable onPress={() => setEditing((e) => !e)} accessibilityRole="button" accessibilityLabel="Editar apelido" style={styles.row}>
          <AppText variant="body">Apelido</AppText>
          <AppText variant="body" color="secondaryLabel" numberOfLines={1} style={styles.value}>
            {profile?.username ? `@${profile.username}` : "Escolher"}
          </AppText>
        </Pressable>
        {editing && (
          <UsernameEdit
            current={profile?.username ?? ""}
            onDone={(text) => {
              setMessage(text);
              if (text === "@ salvo.") setEditing(false);
            }}
          />
        )}
        <View style={styles.row}>
          <AppText variant="body">Aparecer na busca</AppText>
          <ToggleSwitch
            value={profile?.searchable !== false}
            onValueChange={(on) => void setSearchable(on).catch((error: Error) => setMessage(error.message))}
            accessibilityLabel="Aparecer na busca"
          />
        </View>
        <AppText variant="footnote" color="secondaryLabel">
          Se desligar, ninguém acha você e você também não pode buscar ninguém.
        </AppText>
        {session?.user.email && (
          <View style={styles.row}>
            <AppText variant="body">E-mail</AppText>
            <AppText variant="body" color="secondaryLabel" numberOfLines={1} style={styles.value}>
              {session.user.email}
            </AppText>
          </View>
        )}
      </View>
      <View>
        <ActionRow label="Ver planos" icon={{ ios: "creditcard", android: "credit_card" }} navigates onPress={() => router.push("/renovar")} />
        <ActionRow label="Termos de uso" icon={{ ios: "doc.text", android: "description" }} navigates onPress={() => router.push("/legal/terms")} />
        <ActionRow label="Política de privacidade" icon={{ ios: "lock", android: "lock" }} navigates onPress={() => router.push("/legal/privacy")} />
      </View>
      <View>
        <ActionRow label="Sair" icon={{ ios: "rectangle.portrait.and.arrow.right", android: "logout" }} onPress={() => void leave()} />
        <ActionRow label="Resetar dados" icon={{ ios: "arrow.counterclockwise", android: "restart_alt" }} destructive onPress={onReset} />
        <ActionRow label="Excluir conta" icon={{ ios: "trash", android: "delete" }} destructive onPress={remove} />
        {message && (
          <AppText variant="footnote" color="secondaryLabel" accessibilityLiveRegion="polite">
            {message}
          </AppText>
        )}
      </View>
    </Section>
  );
}

export default function AccountScreen() {
  const { reset } = useAppState();
  return (
    <Screen title="Conta" underHeader>
      <AccountSection
        onReset={() =>
          confirm("Resetar dados?", "Apaga histórico, afirmações e horários, neste aparelho e na nuvem. Não dá para desfazer.", "Resetar", () => void reset())
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  value: { flex: 1, textAlign: "right", marginLeft: 16 },
  edit: { gap: 12, paddingBottom: 8 },
  nameInput: { flex: 1, textAlign: "right", fontSize: 17, minHeight: HIT, marginLeft: 16 },
});
