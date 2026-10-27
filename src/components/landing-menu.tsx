import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { space } from "@/theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { css, SurfaceButton } from "./surface-parts";

// Landing page menu for narrow screens: three lines that fold into an X, and a short panel that drops from the bar.
// Built for speed: it opens and closes in 160 ms, and a tap on a section closes it and scrolls at once.

const BAR_HEIGHT = 72;
const FAST = "160ms cubic-bezier(.2,.8,.2,1)";

/** Three lines; open, the outer two swing into an X and the middle one fades. */
export function MenuButton({ open, onPress }: { open: boolean; onPress: () => void }) {
  const line = (shift: number, turn: number) =>
    css({ transform: open ? `translateY(${shift}px) rotate(${turn}deg)` : "none", transition: `transform 200ms cubic-bezier(.2,.8,.2,1)` });
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} hitSlop={8}>
      <View style={styles.burger}>
        <View style={[styles.line, line(7, 45)]} />
        <View style={[styles.line, css({ opacity: open ? 0 : 1, transition: "opacity 120ms" })]} />
        <View style={[styles.line, line(-7, -45)]} />
      </View>
    </Pressable>
  );
}

interface Item {
  id: string;
  label: string;
}

interface MenuProps {
  open: boolean;
  items: readonly Item[];
  onPick: (id: string | null) => void;
  /** The main button: "Instalar app" on a phone's browser, else "Começar". */
  main: { label: string; onPress: () => void };
  onSignIn: () => void;
}

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link">
      {({ pressed, hovered }) => (
        <View style={[styles.row, (pressed || hovered) && styles.rowLit]}>
          <AppText variant="headline" style={styles.flex}>
            {label}
          </AppText>
          <Icon ios="chevron.right" android="chevron_right" size={18} color="rgba(238,247,255,0.45)" />
        </View>
      )}
    </Pressable>
  );
}

/** A panel under the bar with the sections and the two buttons; the page dims below it, and a tap there closes it. */
export function LandingMenu({ open, items, onPick, main, onSignIn }: MenuProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onPick(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onPick]);

  const shown = css({ visibility: open ? "visible" : "hidden", transition: `visibility 0ms linear ${open ? 0 : 160}ms` });
  return (
    <View aria-hidden={!open} style={[styles.layer, shown]}>
      <Pressable
        style={[StyleSheet.absoluteFill, styles.dim, css({ opacity: open ? 1 : 0, transition: `opacity ${FAST}` })]}
        onPress={() => onPick(null)}
        accessibilityLabel="Fechar menu"
      />
      <View style={[styles.panel, PANEL, css({ opacity: open ? 1 : 0, transform: `translateY(${open ? 0 : -8}px)`, transition: `opacity ${FAST}, transform ${FAST}` })]}>
        {items.map((item) => (
          <Row key={item.id} label={item.label} onPress={() => onPick(item.id)} />
        ))}
        <View style={styles.actions}>
          <View style={styles.flex}>
            <SurfaceButton label="Entrar" onPress={onSignIn} variant="outline" size="md" />
          </View>
          <View style={styles.flex}>
            <SurfaceButton label={main.label} onPress={main.onPress} size="md" />
          </View>
        </View>
      </View>
    </View>
  );
}

const PANEL = css({
  backgroundColor: "rgba(4,21,38,0.96)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.45), inset 0 -1px 0 rgba(125,211,252,0.14)",
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  burger: { width: 40, height: 40, alignItems: "center", justifyContent: "center", gap: 5 },
  line: { width: 22, height: 2, borderRadius: 1, backgroundColor: "#FFFFFF" },
  layer: { position: "fixed" as "absolute", top: BAR_HEIGHT, left: 0, right: 0, bottom: 0, zIndex: 25 },
  dim: { backgroundColor: "rgba(1,8,16,0.5)" },
  panel: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.lg },
  row: { flexDirection: "row", alignItems: "center", minHeight: 48, paddingHorizontal: space.sm, borderRadius: 12 },
  rowLit: { backgroundColor: "rgba(125,211,252,0.1)" },
  actions: { flexDirection: "row", gap: space.md, marginTop: space.md },
});
