import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ActionRow } from "@/components/action-row";
import { AppText } from "@/components/app-text";
import { Divider } from "@/components/divider";
import { Screen } from "@/components/screen";
import { ToggleSwitch } from "@/components/toggle-switch";
import { useAppState } from "@/state/app-state";
import { useAccess } from "@/state/access";
import { useAuth } from "@/state/auth";
import { confirm } from "@/state/use-sign-out";
import { HIT } from "@/theme";

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
      <View>
        <ActionRow label="Editar perfil" icon={{ ios: "pencil", android: "edit" }} navigates onPress={() => router.push("/settings/perfil")} />
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
        <Divider />
        <Pressable onPress={() => router.push("/settings/perfil")} accessibilityRole="link" accessibilityLabel="Apelido, editar" style={styles.row}>
          <AppText variant="body">Apelido</AppText>
          <AppText variant="body" color="secondaryLabel" numberOfLines={1} style={styles.value}>
            {profile?.username ? `@${profile.username}` : "Sem @"}
          </AppText>
        </Pressable>
        {session?.user.email && <Divider />}
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
  row: { minHeight: HIT, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  value: { flex: 1, textAlign: "right", marginLeft: 16 },
});
