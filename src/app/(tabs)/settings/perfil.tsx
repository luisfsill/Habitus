import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { UsernameField } from "@/components/username-field";
import { useAccess } from "@/state/access";
import { useUsernameCheck } from "@/state/use-username-check";
import { space } from "@/theme";

/** Something changed, the name is not empty, and an unchanged @ needs no check while a changed one must be free. */
function canSaveProfile(name: string, nameChanged: boolean, usernameChanged: boolean, status: string): boolean {
  const usernameOk = !usernameChanged || status === "available";
  return (nameChanged || usernameChanged) && name.trim() !== "" && usernameOk;
}

/** Name and @ in one place; the @ is only saved once the typed one is free. */
export default function EditProfileScreen() {
  const { profile, isAdmin, setName, setUsername } = useAccess();
  const current = profile?.username ?? "";
  const [name, setDraftName] = useState(profile?.name ?? "");
  const username = useUsernameCheck(isAdmin, current);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const nameChanged = name.trim() !== "" && name.trim() !== profile?.name;
  const usernameChanged = username.value !== current;
  const canSave = canSaveProfile(name, nameChanged, usernameChanged, username.status);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (nameChanged) await setName(name.trim());
      if (usernameChanged) await setUsername(username.value);
      if (router.canGoBack()) router.back();
      else router.replace("/settings/conta");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Editar perfil" underHeader>
      <View style={styles.fields}>
        <TextField
          label="Nome"
          value={name}
          onChangeText={(t) => setDraftName(t.slice(0, 80))}
          placeholder="Seu nome"
          autoCapitalize="words"
          maxLength={80}
          style={styles.field}
        />
        <UsernameField label="Apelido" value={username.value} onChange={username.change} status={usernameChanged ? username.status : "idle"} />
      </View>
      <PrimaryButton label="Salvar" onPress={() => void save()} disabled={!canSave} loading={saving} />
      {message && (
        <AppText variant="footnote" color="danger" accessibilityLiveRegion="polite">
          {message}
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: space.md },
  // TextField grows to fill a row by default; here the two fields stack at their natural height.
  field: { flexGrow: 0, flexBasis: "auto" },
});
