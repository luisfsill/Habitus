import { type ComponentRef, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { type SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { space, useTheme } from "@/theme";

import { Icon } from "./icon";

const ACTION = 88;
// A press this soon after a drag ends is the drag's own release, not a tap.
const AFTER_DRAG_MS = 400;
// Let go past half the row, the swipe deletes on its own, as in iOS. No fling rule: a quick flick must not delete.
const FULL_SWIPE = 0.5;
const SETTLE_MS = 220;
const LEAVE_MS = 240;

/** Wraps a row's press so a drag or a tap on an open row never fires it. */
export type PressGuard = (onPress: () => void) => () => void;

// One row open at a time across the list, as in iOS. `closedAt` marks a close by a click elsewhere, so that click does nothing else.
const rows = { open: null as { token: object; close: () => void } | null, closedAt: 0 };

function claimOpen(token: object, close: () => void) {
  if (rows.open && rows.open.token !== token) rows.open.close();
  rows.open = { token, close };
}

function releaseOpen(token: object) {
  if (rows.open?.token === token) rows.open = null;
}

function stamp(ref: { current: number }) {
  ref.current = Date.now();
}

interface Props {
  children: (guard: PressGuard) => ReactNode;
  /** What the button deletes, for screen readers: "Apagar Pagar boleto". */
  title: string;
  onDelete: () => void;
  /** Off while the list is in selection mode. */
  enabled?: boolean;
}

function DeleteAction({ x, title, onPress }: { x: SharedValue<number>; title: string; onPress: () => void }) {
  const { colors } = useTheme();
  // Pinned right; the red is exactly what the drag uncovers (the row above is clear glass) and fills the row while it leaves.
  const grow = useAnimatedStyle(() => ({ width: Math.max(0, -x.get()) }));
  return (
    <Animated.View style={[styles.action, { backgroundColor: colors.destructive }, grow]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Apagar ${title}`} style={styles.press}>
        <Icon ios="trash.fill" android="delete" size={30} color={colors.onAccent} />
      </Pressable>
    </Animated.View>
  );
}

/** Web: while watching, a click anywhere outside the row closes it (on native, a touch on another row is caught by `guard`). */
function useOutsideClose(box: RefObject<ComponentRef<typeof View> | null>) {
  const stop = useRef<(() => void) | null>(null);
  const unwatch = () => {
    stop.current?.();
    stop.current = null;
  };
  const watch = (close: () => void) => {
    unwatch();
    if (Platform.OS !== "web") return;
    const node = box.current as unknown as HTMLElement | null;
    const onDown = (e: PointerEvent) => {
      if (node?.contains(e.target as Node)) return;
      rows.closedAt = Date.now();
      close();
    };
    document.addEventListener("pointerdown", onDown, true);
    stop.current = () => document.removeEventListener("pointerdown", onDown, true);
  };
  useEffect(() => () => stop.current?.(), []);
  return { watch, unwatch };
}

/** The row's offset and its moves: settle open or closed, or leave left while folding its height so the rows below move up. */
function useRowMotion(onDelete: () => void) {
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const fold = useSharedValue(1);
  const deleting = useSharedValue(false);
  const settle = (to: number) => {
    "worklet";
    x.set(reduceMotion ? to : withTiming(to, { duration: SETTLE_MS }));
  };
  // Keeps going left from wherever the row is, folding at the same time.
  const leave = () => {
    "worklet";
    if (deleting.get()) return;
    deleting.set(true);
    if (reduceMotion) {
      scheduleOnRN(onDelete);
      return;
    }
    x.set(withTiming(-width.get(), { duration: LEAVE_MS }));
    fold.set(
      withTiming(0, { duration: LEAVE_MS }, (done) => {
        if (done) scheduleOnRN(onDelete);
      }),
    );
  };
  const rowStyle = useAnimatedStyle(() => (fold.get() < 1 ? { height: height.get() * fold.get() } : {}));
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  return { x, width, height, deleting, settle, leave, rowStyle, slide };
}

/** A row that slides left to show a red delete button with a white trash can; a long swipe deletes, like the lists in iOS. */
export function SwipeToDelete({ children, title, onDelete, enabled = true }: Props) {
  const box = useRef<ComponentRef<typeof View>>(null);
  const draggedAt = useRef(0);
  const [token] = useState(() => ({}));
  const start = useSharedValue(0);
  const motion = useRowMotion(onDelete);
  const { x, width, deleting, settle, leave } = motion;

  const outside = useOutsideClose(box);
  const opened = (isOpen: boolean) => {
    stamp(draggedAt);
    if (isOpen) {
      const close = () => {
        settle(0);
        opened(false);
      };
      claimOpen(token, close);
      outside.watch(close);
    } else {
      releaseOpen(token);
      outside.unwatch();
    }
  };
  useEffect(() => () => releaseOpen(token), [token]);

  const pan = usePanGesture({
    enabled,
    activeOffsetX: [-10, 10],
    failOffsetY: [-10, 10],
    onActivate: () => {
      start.set(x.get());
    },
    onUpdate: (e) => {
      if (!deleting.get()) x.set(Math.min(0, start.get() + e.translationX));
    },
    // Decided on the release frame itself, so the row never springs back before leaving.
    onDeactivate: () => {
      if (deleting.get()) return;
      const at = -x.get();
      if (width.get() > 0 && at > width.get() * FULL_SWIPE) {
        leave();
        return;
      }
      const open = at > ACTION / 2;
      settle(open ? -ACTION : 0);
      scheduleOnRN(opened, open);
    },
  });

  const guard: PressGuard = (onPress) => () => {
    if (deleting.get() || Date.now() - Math.max(draggedAt.current, rows.closedAt) < AFTER_DRAG_MS) return;
    // A tap on any row while one is open only closes it, as in iOS.
    if (rows.open) rows.open.close();
    else if (Math.abs(x.get()) < 1) onPress();
  };

  return (
    <Animated.View
      ref={box}
      style={[styles.clip, motion.rowStyle]}
      onLayout={(e) => {
        width.set(e.nativeEvent.layout.width);
        if (!deleting.get()) motion.height.set(e.nativeEvent.layout.height);
      }}>
      <View style={styles.under}>
        <DeleteAction x={x} title={title} onPress={leave} />
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.fill, motion.slide]}>{children(guard)}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Takes back the Section row's vertical padding so the row and the red button run separator to separator,
  // and clips so the row slides under its own edge.
  clip: { overflow: "hidden", marginVertical: -space.md },
  fill: { paddingVertical: space.md },
  under: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, flexDirection: "row-reverse" },
  action: { flexDirection: "row", overflow: "hidden" },
  // The trash keeps to the red's leading edge while it grows, as in iOS.
  press: { width: ACTION, alignItems: "center", justifyContent: "center" },
});
