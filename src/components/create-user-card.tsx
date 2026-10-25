import { useState } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";

import { isValidEmail } from "@/domain/auth-rules";
import { space } from "@/theme";

import { AppText } from "./app-text";
import { GlassCard } from "./glass-card";
import { PrimaryButton } from "./primary-button";
import { TextField } from "./text-field";

interface Props {
  /** Creates the account and returns its provisional password. */
  onCreate: (name: string, email: string) => Promise<string>;
  onClose: () => void;
}

/** Admin form: name + e-mail, then the provisional password shown once. */
export function CreateUserCard({ onCreate, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    if (!name.trim() || !isValidEmail(email)) return setError("Informe nome e e-mail válidos.");
    setBusy(true);
    setError(null);
    try {
      setPassword(await onCreate(name.trim(), email.trim()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const message = `Olá, ${name.trim()}! Sua conta no Habitus está pronta.\nE-mail: ${email.trim()}\nSenha provisória: ${password ?? ""}\nVocê pode trocar a senha em "Esqueci minha senha".`;
  const copy = () => {
    // shortcut: copies only on the web (no clipboard module installed); native shares via WhatsApp.
    void navigator.clipboard?.writeText(message).then(() => setCopied(true));
  };

  return (
    <GlassCard>
      <View style={styles.root}>
        <AppText variant="headline">Criar usuário</AppText>
        {password === null ? (
          <>
            <View style={styles.fields}>
              <TextField label="Nome" value={name} onChangeText={setName} autoCapitalize="words" />
              <TextField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>
            {error && <AppText variant="footnote" color="danger">{error}</AppText>}
            <View style={styles.buttons}>
              <PrimaryButton label="Criar com 7 dias de teste" onPress={() => void create()} loading={busy} />
              <PrimaryButton label="Cancelar" variant="plain" onPress={onClose} />
            </View>
          </>
        ) : (
          <>
            <AppText variant="subheadline" color="secondaryLabel">
              Conta criada. Esta senha provisória aparece só agora:
            </AppText>
            <AppText variant="title2" selectable style={styles.password}>
              {password}
            </AppText>
            <View style={styles.buttons}>
              <PrimaryButton label="Enviar pelo WhatsApp" onPress={() => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`)} />
              {Platform.OS === "web" && <PrimaryButton label={copied ? "Copiado" : "Copiar mensagem"} variant="tinted" onPress={copy} />}
              <PrimaryButton label="Concluir" variant="plain" onPress={onClose} />
            </View>
          </>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  fields: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  buttons: { gap: space.sm },
  password: { letterSpacing: 2, fontVariant: ["tabular-nums"] },
});
