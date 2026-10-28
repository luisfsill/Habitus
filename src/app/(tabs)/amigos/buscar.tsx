import { router } from "expo-router";

import { AppText } from "@/components/app-text";
import { PersonRow } from "@/components/person-row";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { TextField } from "@/components/text-field";
import { useAccess } from "@/state/access";
import { useUserSearch } from "@/state/use-friends";

function Results({ search }: { search: ReturnType<typeof useUserSearch> }) {
  const { query, results, error, retry } = search;
  if (query === "") return null;
  if (error) {
    return (
      <>
        <AppText variant="subheadline" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
        <PrimaryButton label="Tentar de novo" variant="tinted" onPress={retry} />
      </>
    );
  }
  if (!results) return <AppText variant="body" color="secondaryLabel">Buscando…</AppText>;
  if (results.length === 0) {
    return (
      <AppText variant="body" color="secondaryLabel" accessibilityLiveRegion="polite">
        Ninguém encontrado.
      </AppText>
    );
  }
  return (
    <Section title="Resultados">
      {results.map((p) => (
        <PersonRow key={p.id} person={p} onPress={() => router.push(`/amigos/${p.id}`)} />
      ))}
    </Section>
  );
}

export default function SearchFriendsScreen() {
  const { profile } = useAccess();
  // Hidden accounts cannot search either (the server refuses too).
  const hidden = profile?.searchable === false;
  const search = useUserSearch(!hidden);

  if (hidden) {
    return (
      <Screen title="Buscar amigos" underHeader>
        <AppText variant="body" color="secondaryLabel">
          Você está fora da busca. Ative &quot;Aparecer na busca&quot; em Ajustes para buscar pessoas.
        </AppText>
        <PrimaryButton label="Abrir Ajustes" variant="tinted" onPress={() => router.navigate("/settings/conta")} />
      </Screen>
    );
  }

  return (
    <Screen title="Buscar amigos" underHeader>
      <TextField label="Nome ou @" value={search.text} onChangeText={search.setText} placeholder="Pelo menos 3 letras" autoCapitalize="none" maxLength={40} />
      <Results search={search} />
    </Screen>
  );
}
