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
