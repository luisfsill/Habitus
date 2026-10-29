import { Asset } from "expo-asset";

import { log } from "./log";

/**
 * The tab bar's water (web only). Web Audio instead of expo-audio's <audio> element: iOS Safari ignores an <audio>
 * element's volume, so a fade never ended and the water kept sloshing after the finger let go, and its seek before
 * every play() lagged behind the finger.
 */

// Stretches of water-slosh.mp3 (in seconds) where a hand keeps stirring the water; each drag picks one at random.
const SLOSH_BITS: readonly (readonly [number, number])[] = [
  [0.6, 3.2],
  [4.5, 6.2],
  [6.7, 10.1],
  [11, 14.7],
  [15.1, 16.4],
];
// Short touches of the water in the same recording (seconds): a tap plays one, never the same twice in a row.
// Only the loud ones: the others peak 10 to 15 dB lower and sounded faint even at full volume.
const SPLASH_BITS: readonly (readonly [number, number])[] = [
  [1.35, 1.57],
  [1.53, 1.87],
  [2.83, 3.05],
  [12.03, 12.3],
  [18.08, 18.4],
];
/** The water keeps moving a little after the finger lets go (seconds). */
const SETTLE_S = 1.2;
/** Past a splash the water rings out instead of cutting off (seconds). */
const RING_S = 0.4;

let ctx: AudioContext | null = null;
// Ajustes → Sons e notificações → Sons da dock; the app state keeps it in step with the settings.
let dockOn = true;

export function setDockSound(on: boolean): void {
  dockOn = on;
}
let buffer: AudioBuffer | null = null;

/** Creates the context and decodes the recording once; until it is decoded the water is silent. */
function context(): AudioContext | null {
  if (ctx || typeof AudioContext === "undefined") return ctx;
  const audio = new AudioContext();
  ctx = audio;
  // iOS starts the context suspended and only resumes it inside a touch's end or a click.
  const unlock = () => void audio.resume().catch(() => undefined);
  for (const type of ["touchend", "pointerup", "click"]) window.addEventListener(type, unlock, { capture: true, passive: true });
  fetch(Asset.fromModule(require("../../assets/sounds/water-slosh.mp3") as number).uri)
    .then((r) => r.arrayBuffer())
    .then((data) => audio.decodeAudioData(data))
    .then((decoded) => (buffer = decoded))
    .catch((error: unknown) => log.warn("could not load the water sound", error));
  return audio;
}

/** Plays `[from, to]` of the recording through a fresh gain node, starting at `volume`. */
function start(audio: AudioContext, [from, to]: readonly [number, number], volume: number, extra = 0) {
  const gain = audio.createGain();
  gain.gain.value = volume;
  gain.connect(audio.destination);
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.connect(gain);
  source.start(0, from, to - from + extra);
  return { source, gain };
}

const slosh = {
  voice: null as { source: AudioBufferSourceNode; gain: GainNode } | null,
  settling: false,
  lastStir: 0,
};

function nextSlosh(audio: AudioContext, volume: number): void {
  const voice = start(audio, SLOSH_BITS[Math.floor(Math.random() * SLOSH_BITS.length)], volume);
  slosh.voice = voice;
  slosh.settling = false;
  // At the end of the stretch: another one while the finger still moves, otherwise the water is quiet.
  voice.source.onended = () => {
    if (slosh.voice !== voice) return;
    slosh.voice = null;
    if (!slosh.settling && Date.now() - slosh.lastStir < 200) nextSlosh(audio, voice.gain.gain.value);
  };
}

/** The water sloshing under a dragging finger; `strength` (0 to 1) follows the finger's speed. Silent if audio is unavailable. */
export function stirWater(strength: number): void {
  if (!dockOn) return;
  try {
    const audio = context();
    if (!audio || !buffer || audio.state !== "running") return;
    slosh.lastStir = Date.now();
    const volume = 0.3 + 0.7 * Math.min(1, Math.max(0, strength));
    const voice = slosh.voice;
    if (!voice || slosh.settling) {
      voice?.source.stop();
      nextSlosh(audio, volume);
      return;
    }
    voice.gain.gain.cancelScheduledValues(audio.currentTime);
    voice.gain.gain.setTargetAtTime(volume, audio.currentTime, 0.05);
  } catch (error) {
    log.warn("could not play the water sound", error);
  }
}

/** Fades the sloshing out when the finger lets go, instead of cutting it. */
export function settleWater(): void {
  const voice = slosh.voice;
  if (!ctx || !voice || slosh.settling) return;
  slosh.settling = true;
  const now = ctx.currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
  voice.gain.gain.linearRampToValueAtTime(0, now + SETTLE_S);
  voice.source.stop(now + SETTLE_S);
}

const splash = { last: -1, source: null as AudioBufferSourceNode | null };

/** A finger touching the water: a random short splash at full volume. Silent if audio is unavailable. */
export function playSplash(): void {
  if (!dockOn) return;
  try {
    const audio = context();
    if (!audio || !buffer) return;
    void audio.resume().catch(() => undefined);
    let i = Math.floor(Math.random() * SPLASH_BITS.length);
    if (i === splash.last) i = (i + 1) % SPLASH_BITS.length;
    splash.last = i;
    const [from, to] = SPLASH_BITS[i];
    splash.source?.stop();
    const { source, gain } = start(audio, [from, to], 1, RING_S);
    splash.source = source;
    const ring = audio.currentTime + (to - from);
    gain.gain.setValueAtTime(1, ring);
    gain.gain.linearRampToValueAtTime(0, ring + RING_S);
  } catch (error) {
    log.warn("could not play the splash", error);
  }
}

// Decoded ahead of the first touch, so it already sounds.
if (typeof window !== "undefined") context();
