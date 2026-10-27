import { type AudioPlayer, createAudioPlayer } from "expo-audio";

import type { TrickIndex } from "@/domain/tricks";

import { log } from "./log";

// One player per sound for the whole app: each is short and replays from the start.
const players = new Map<number, AudioPlayer>();

function play(source: number): void {
  try {
    let player = players.get(source);
    if (!player) {
      player = createAudioPlayer(source);
      players.set(source, player);
    }
    void player.seekTo(0).then(() => player.play());
  } catch (error) {
    log.warn("could not play a sound", error);
  }
}

/** The "gluk" of a water drop, played on each cup of water. Silent if audio is unavailable. */
export function playDrop(): void {
  play(require("../../assets/sounds/drop.mp3") as number);
}

// Stretches of water-slosh.mp3 (in seconds) where a hand keeps stirring the water; each drag picks one at random.
const SLOSH_BITS: readonly (readonly [number, number])[] = [
  [0.6, 3.2],
  [4.5, 6.2],
  [6.7, 10.1],
  [11, 14.7],
  [15.1, 16.4],
];
const slosh = {
  player: null as AudioPlayer | null,
  // Ours, not player.playing: that one stays false until the seek before play() finishes.
  on: false,
  lastStir: 0,
  end: undefined as ReturnType<typeof setTimeout> | undefined,
  fade: undefined as ReturnType<typeof setInterval> | undefined,
};

function startSlosh(player: AudioPlayer): void {
  const [from, to] = SLOSH_BITS[Math.floor(Math.random() * SLOSH_BITS.length)];
  void player.seekTo(from).then(() => player.play());
  clearTimeout(slosh.end);
  // At the end of the stretch: another one while the finger still moves, otherwise the water calms down.
  slosh.end = setTimeout(() => (Date.now() - slosh.lastStir < 200 ? startSlosh(player) : settleWater()), (to - from) * 1000);
}

/** The water sloshing under a dragging finger; `strength` (0 to 1) follows the finger's speed. Silent if audio is unavailable. */
export function stirWater(strength: number): void {
  try {
    const player = (slosh.player ??= createAudioPlayer(require("../../assets/sounds/water-slosh.mp3") as number));
    slosh.lastStir = Date.now();
    player.volume = 0.3 + 0.7 * Math.min(1, Math.max(0, strength));
    if (slosh.fade || !slosh.on) {
      clearInterval(slosh.fade);
      slosh.fade = undefined;
      slosh.on = true;
      startSlosh(player);
    }
  } catch (error) {
    log.warn("could not play the water sound", error);
  }
}

/** Fades the sloshing out when the finger lets go, instead of cutting it. */
export function settleWater(): void {
  const player = slosh.player;
  clearTimeout(slosh.end);
  if (!player || !slosh.on || slosh.fade) return;
  slosh.fade = setInterval(() => {
    // About 1.2 s from full volume: the water keeps moving a little after the finger lets go.
    player.volume = Math.max(0, player.volume - 0.025);
    if (player.volume > 0) return;
    clearInterval(slosh.fade);
    slosh.fade = undefined;
    slosh.on = false;
    player.pause();
  }, 30);
}

// Short touches of the water in the same recording (seconds): a tap plays one, never the same twice in a row.
// Only the loud ones: the others peak 10 to 15 dB lower and sounded faint even at full volume.
const SPLASH_BITS: readonly (readonly [number, number])[] = [
  [1.35, 1.57],
  [1.53, 1.87],
  [2.83, 3.05],
  [12.03, 12.3],
  [18.08, 18.4],
];
const splash = {
  player: null as AudioPlayer | null,
  last: -1,
  stop: undefined as ReturnType<typeof setTimeout> | undefined,
  fade: undefined as ReturnType<typeof setInterval> | undefined,
};

/** A finger touching the water: a random short splash at full volume. Silent if audio is unavailable. */
export function playSplash(): void {
  try {
    const player = (splash.player ??= createAudioPlayer(require("../../assets/sounds/water-slosh.mp3") as number));
    let i = Math.floor(Math.random() * SPLASH_BITS.length);
    if (i === splash.last) i = (i + 1) % SPLASH_BITS.length;
    splash.last = i;
    const [from, to] = SPLASH_BITS[i];
    player.volume = 1;
    clearTimeout(splash.stop);
    clearInterval(splash.fade);
    void player.seekTo(from).then(() => {
      player.play();
      clearTimeout(splash.stop);
      // Past the splash the water rings out for about 0.4 s instead of cutting off.
      splash.stop = setTimeout(() => {
        splash.fade = setInterval(() => {
          player.volume = Math.max(0, player.volume - 1 / 13);
          if (player.volume > 0) return;
          clearInterval(splash.fade);
          player.pause();
        }, 30);
      }, (to - from) * 1000);
    });
  } catch (error) {
    log.warn("could not play the splash", error);
  }
}

// Tips that have their own celebration sound so far.
const CELEBRATION_SOUNDS: Partial<Record<TrickIndex, number>> = {
  0: require("../../assets/sounds/sun-chime.wav") as number,
};

// Background sound of the tips that have a live scene so far.
const AMBIENT_SOUNDS: Partial<Record<TrickIndex, number>> = {
  0: require("../../assets/sounds/forest.mp3") as number,
  1: require("../../assets/sounds/wind.mp3") as number,
  2: require("../../assets/sounds/metas-528hz.mp3") as number,
  3: require("../../assets/sounds/fire.mp3") as number,
};

/** Starts a tip's background sound in a loop, if it has one; the returned function stops it. */
export function playAmbient(index: TrickIndex): () => void {
  const source = AMBIENT_SOUNDS[index];
  if (source === undefined) return () => undefined;
  try {
    const player = createAudioPlayer(source);
    player.loop = true;
    player.play();
    let stopped = false;
    // Concluir stops it and then the screen closing calls this again: only the first call counts.
    return () => {
      if (stopped) return;
      stopped = true;
      player.pause();
      player.remove();
    };
  } catch (error) {
    log.warn("could not play the background sound", error);
    return () => undefined;
  }
}

/** The sound of a finished tip's celebration, if that tip has one. */
export function playCelebration(index: TrickIndex): void {
  const source = CELEBRATION_SOUNDS[index];
  if (source !== undefined) play(source);
}
