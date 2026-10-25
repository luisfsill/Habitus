import { StyleSheet, View } from "react-native";

import type { LegalDocument } from "@/domain/legal";
import { space } from "@/theme";

import { AppText } from "./app-text";
import { Screen } from "./screen";

/** Plain reading page for the Termos de uso and the Política de privacidade. */
export function LegalPage({ doc }: { doc: LegalDocument }) {
  return (
    <Screen title={doc.title} subtitle={`Versão de ${doc.version.split("-").reverse().join("/")}`} underHeader>
      {doc.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <AppText variant="headline" accessibilityRole="header">
            {section.title}
          </AppText>
          {section.paragraphs.map((p) => (
            <AppText key={p} variant="body" color="secondaryLabel">
              {p}
            </AppText>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
});
