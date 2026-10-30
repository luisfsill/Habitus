import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { radius, space, useTheme } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { Block, Bullets } from "./landing-sections";
import { ShakeView } from "./shake-view";
import { css, Reveal, SurfaceButton, useInView } from "./surface-parts";

// What the app really does (PRODUCT.md, Amigos and Conversas); no ranking, it is out of scope.
const POINTS = [
  { icon: "vibration", text: "Chamar a atenção: a tela treme, vibra e toca som." },
  { icon: "format_quote", text: "Depoimentos no perfil e Feed da galera." },
  { icon: "chat", text: "Directs com figurinhas que dançam." },
  { icon: "group", text: "Amigos pelo @, com faixa e sequência." },
] as const;

// Made-up friends and lines, about the app's own habits.
const LINES = [
  { mine: false, text: "Já bebeu sua água hoje? 💧" },
  { mine: true, text: "6 de 6! Dia perfeito 🔥" },
  { mine: false, text: "Ei, me espera que eu tô na faixa amarela" },
] as const;

function Bubble({ mine, text }: (typeof LINES)[number]) {
  const { colors } = useTheme();
  return (
    <View style={[styles.bubble, mine ? [styles.mine, { backgroundColor: colors.accent }] : { backgroundColor: colors.fill }]}>
      <AppText variant="subheadline">
        {text}
      </AppText>
    </View>
  );
}

/** A friend's chat, drawn flat: it shakes once when it scrolls into view, and again (with the real sound) at each press. */
function NudgeChat({ onNudge }: { onNudge?: () => void }) {
  const { colors } = useTheme();
  const { ref, shown } = useInView();
  const [shakes, setShakes] = useState(0);
  useEffect(() => {
    if (!shown) return;
    const id = setTimeout(() => setShakes((n) => n || 1), 900);
    return () => clearTimeout(id);
  }, [shown]);
  const nudge = () => {
    setShakes((n) => n + 1);
    onNudge?.();
  };
  return (
    <View ref={ref}>
      <ShakeView trigger={shakes}>
        <View style={[styles.chat, { borderColor: colors.separator }, css({ boxShadow: "0 24px 60px rgba(0,0,0,0.45)" })]}>
          <View style={[styles.head, { borderColor: colors.separator }]}>
            <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
              <AppText variant="headline" color="accentText">
                B
              </AppText>
            </View>
            <View style={styles.flex}>
              <AppText variant="headline">Bia</AppText>
              <AppText variant="caption" color="secondaryLabel">
                Disponível
              </AppText>
            </View>
          </View>
          {LINES.map((line) => (
            <Bubble key={line.text} {...line} />
          ))}
          {shakes > 0 && (
            <AppText variant="footnote" color="secondaryLabel" align="center" style={styles.bold}>
              Você chamou a atenção!
            </AppText>
          )}
          <Pressable onPress={nudge} accessibilityRole="button" accessibilityLabel="Chamar a atenção da Bia">
            {({ hovered }) => (
              <View style={[styles.nudge, { backgroundColor: hovered ? colors.accentSoft : colors.fill }]}>
                <Icon ios="bell.and.waves.left.and.right" android="vibration" size={18} color={colors.accentText} />
                <AppText variant="subheadline" color="accentText" style={styles.bold}>
                  Chamar a atenção
                </AppText>
              </View>
            )}
          </Pressable>
        </View>
      </ShakeView>
    </View>
  );
}

/** A testimonial on a friend's wall, the way the profile's Mural shows it. */
function Testimonial() {
  const { colors } = useTheme();
  return (
    <View style={[styles.wall, { borderColor: colors.separator }]}>
      <AppText variant="caption" color="accentText" style={styles.kicker}>
        DEPOIMENTO DE ANA PARA BIA
      </AppText>
      <AppText variant="body">Amiga que me chama a atenção na hora da água e ainda manda figurinha. Te adoro! 💛</AppText>
    </View>
  );
}

interface Props {
  wide: boolean;
  /** The call to action: install on a phone, sign up on a computer. */
  cta: { label: string; onPress: () => void };
  /** Plays the app's nudge sound. */
  onNudge?: () => void;
}

export function SocialSection({ wide, cta, onNudge }: Props) {
  return (
    <Block id="amigos" kicker="Com os amigos" title="O melhor do MSN e do Orkut, agora com hábitos">
      <View style={[styles.split, wide && styles.splitWide]}>
        <View style={[styles.visual, wide && styles.visualWide]}>
          <NudgeChat onNudge={onNudge} />
          <Reveal>
            <Testimonial />
          </Reveal>
        </View>
        <View style={[styles.text, wide && styles.flex]}>
          <AppText variant="title3" color="secondaryLabel" style={styles.lede}>
            Lembra de chamar a atenção do amigo? Tá tudo aqui, agora com hábitos.
          </AppText>
          <Bullets items={POINTS} />
          <View style={styles.cta}>
            <SurfaceButton label={cta.label} onPress={cta.onPress} />
          </View>
        </View>
      </View>
    </Block>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: "700" },
  flex: { flex: 1 },
  kicker: { fontWeight: "700", letterSpacing: 1 },
  split: { gap: space.xxl },
  splitWide: { flexDirection: "row", alignItems: "center", gap: space.xxl * 2 },
  visual: { gap: space.lg },
  visualWide: { width: 440 },
  text: { gap: space.xl },
  lede: { fontWeight: "400", lineHeight: 30 },
  chat: { gap: space.sm, padding: space.lg, borderRadius: 22, borderWidth: 1, backgroundColor: "rgba(11,34,56,0.92)" },
  head: { flexDirection: "row", alignItems: "center", gap: space.md, paddingBottom: space.md, marginBottom: space.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  // The green ring is the friend's "Disponível" status, as in Conversas.
  avatar: { width: 40, height: 40, borderRadius: radius.pill, borderWidth: 2, borderColor: "#34C759", alignItems: "center", justifyContent: "center" },
  bubble: { alignSelf: "flex-start", maxWidth: "85%", paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: 18 },
  mine: { alignSelf: "flex-end" },
  nudge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, minHeight: 40, borderRadius: radius.pill, marginTop: space.sm },
  wall: { gap: space.xs, paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  cta: { alignItems: "flex-start", marginTop: space.sm },
});
