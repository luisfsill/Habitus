import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ActionRow } from "@/components/action-row";
import { AppText } from "@/components/app-text";
import { Avatar } from "@/components/avatar";
import { Divider } from "@/components/divider";
import { Icon } from "@/components/icon";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { ToggleSwitch } from "@/components/toggle-switch";
import { pickAvatar } from "@/services/avatar";
import { useAppState } from "@/state/app-state";
import { useAccess } from "@/state/access";
import { useAuth } from "@/state/auth";
import { confirm } from "@/state/use-sign-out";
import { HIT, space, useTheme } from "@/theme";

const AVATAR = 112;
const editProfile = () => router.push("/settings/perfil");

/** A label and its value on one line; tappable rows open "Editar perfil". */
function InfoRow({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const body = (
    <>
      <AppText variant="body">{label}</AppText>
      <AppText variant="body" color="secondaryLabel" numberOfLines={1} style={styles.value}>
        {value}
      </AppText>
      {onPress && <Icon ios="chevron.right" android="chevron_right" size={16} color={colors.secondaryLabel} />}
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`${label}: ${value}. Editar`} style={styles.row}>
      {body}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.row}>
      {body}
    </View>
  );
}

/** The big profile photo with "Adicionar/Trocar foto" and "Remover". */
function Photo() {
  const { profile, setAvatar } = useAccess();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photo = profile?.avatarUrl ?? null;

  const change = async (remove: boolean) => {
    const asset = remove ? null : await pickAvatar();
    if (!remove && !asset) return;
    setBusy(true);
    try {
      await setAvatar(asset);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.photo}>
      <Avatar url={photo} size={AVATAR} />
      <View style={styles.photoActions}>
        <PrimaryButton label={photo ? "Trocar foto" : "Adicionar foto"} variant="tinted" loading={busy} onPress={() => void change(false)} />
        {photo && <PrimaryButton label="Remover" variant="plain" disabled={busy} onPress={() => void change(true)} />}
      </View>
      {error && (
        <AppText variant="footnote" color="danger" align="center" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
    </View>
  );
}

export default function AccountScreen() {
  const { session, deleteAccount } = useAuth();
  const { profile, setSearchable } = useAccess();
  const { reset } = useAppState();
  const [message, setMessage] = useState<string | null>(null);
  const resetData = () =>
    confirm("Resetar dados?", "Apaga histórico, afirmações e horários, neste aparelho e na nuvem. Não dá para desfazer.", "Resetar", () => void reset());

  const remove = () =>
    confirm("Excluir conta?", "Sua conta e todo o seu progresso serão apagados. Não dá para desfazer.", "Continuar", () =>
      confirm("Tem certeza?", "Esta é a última confirmação. A conta será excluída agora.", "Excluir conta", () => {
        void deleteAccount().then((result) => setMessage(result.ok ? null : result.message));
      }),
    );

  return (
    <Screen title="Conta" underHeader>
      <Photo />
      <View>
        <InfoRow label="Nome" value={profile?.name || "Sem nome"} onPress={editProfile} />
        <Divider />
        <InfoRow label="Apelido" value={profile?.username ? `@${profile.username}` : "Sem @"} onPress={editProfile} />
        {session?.user.email && <Divider />}
        {session?.user.email && <InfoRow label="E-mail" value={session.user.email} />}
        <Divider />
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
      </View>
      <View>
        <ActionRow label="Resetar dados" icon={{ ios: "arrow.counterclockwise", android: "restart_alt" }} destructive onPress={resetData} />
        <Divider />
        <ActionRow label="Excluir conta" icon={{ ios: "trash", android: "delete" }} destructive onPress={remove} />
        {message && (
          <AppText variant="footnote" color="secondaryLabel" accessibilityLiveRegion="polite">
            {message}
          </AppText>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { alignItems: "center", gap: space.md },
  photoActions: { flexDirection: "row", gap: space.sm },
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  value: { flex: 1, textAlign: "right", marginLeft: 16 },
});
