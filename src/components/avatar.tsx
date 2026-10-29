import { Image, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";

import type { Presence } from "@/domain/chat";
import { useTheme } from "@/theme";

import { AVATAR_PRESETS } from "./avatar-presets";
import { Icon } from "./icon";

/** The drawing behind a `preset:<id>` avatar, or undefined for a photo link or an unknown id. */
export const presetXml = (url: string | null) => (url?.startsWith("preset:") ? AVATAR_PRESETS.find((p) => `preset:${p.id}` === url)?.xml : undefined);

/** A round profile photo or default avatar, or a person icon on a soft fill when there is none. Decorative: the name sits beside it. */
export function Avatar({ url, size }: { url: string | null; size: number }) {
  const { colors } = useTheme();
  const xml = presetXml(url);
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.fill }]}>
      {xml ? (
        <SvgXml xml={xml} width={size} height={size} />
      ) : url && !url.startsWith("preset:") ? (
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <Icon ios="person.fill" android="person" size={Math.round(size * 0.5)} color={colors.secondaryLabel} />
      )}
    </View>
  );
}

/** A presence ring, plus "invisible" for my own ring (friends see me offline, I see light gray). */
type Ring = Presence | "invisible";

// MSN colours: available, away, offline; light gray for invisible.
export const PRESENCE_COLORS: Record<Ring, string> = { online: "#22C55E", away: "#F5B400", offline: "#EF4444", invisible: "#C7C7CC" };
const PRESENCE_LABELS: Record<Ring, string> = { online: "Online", away: "Ausente", offline: "Offline", invisible: "Invisível" };

/** The avatar inside a ring in the friend's presence colour (green, yellow or red), like MSN. */
export function PresenceAvatar({ url, size, presence }: { url: string | null; size: number; presence: Ring }) {
  const ring = Math.max(2, Math.round(size / 16));
  return (
    <View
      accessible
      accessibilityLabel={PRESENCE_LABELS[presence]}
      style={{ padding: ring, borderRadius: size, borderWidth: ring, borderColor: PRESENCE_COLORS[presence] }}>
      <Avatar url={url} size={size - ring * 4} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
