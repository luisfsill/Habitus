import { log } from "./log";

// The Foco total fire listens for a blow on the microphone and follows the phone's tilt; Antes de dormir listens
// for the voice saying its phrase. Web only for now:
// on native both calls do nothing (the app build has the microphone turned off, see app.json).
// The audio is only measured on the device, never recorded or sent.

type Stop = () => void;

/** Runs `fn` once, on the first tap anywhere: browsers only start audio, and iOS only asks for motion, after one. */
function onFirstTap(fn: () => void): Stop {
  const handler = () => {
    document.removeEventListener("pointerdown", handler);
    fn();
  };
  document.addEventListener("pointerdown", handler);
  return () => document.removeEventListener("pointerdown", handler);
}

/** Calls `onLevel` about 30 times a second with how hard someone is blowing (0 still, 1 a strong blow). */
export function listenForBlow(onLevel: (level: number) => void): Stop {
  // A blow is loud, low rumble on the microphone: keep the lows and measure how loud they are.
  return listenToMic("lowpass", 600, onLevel);
}

/**
 * Antes de dormir: calls `onLevel` about 30 times a second with how loud someone is speaking (0 silence, 1 loud).
 * Only the volume of the speech band, never what is said.
 */
export function listenForVoice(onLevel: (level: number) => void): Stop {
  return listenToMic("bandpass", 1000, onLevel);
}

/** The microphone can be listened to here (the web; the app build has it off). */
export function canListen(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof AudioContext !== "undefined";
}

function listenToMic(type: BiquadFilterType, frequency: number, onLevel: (level: number) => void): Stop {
  if (!canListen()) return () => undefined;
  let stopped = false;
  let cleanup: Stop = () => undefined;
  void navigator.mediaDevices
    .getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
    .then((stream) => {
      if (stopped) return stream.getTracks().forEach((t) => t.stop());
      const ctx = new AudioContext();
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = frequency;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(filter).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      // Right away when the browser allows it (the tap that started listening is recent), else on the next tap.
      void ctx.resume();
      const untap = onFirstTap(() => void ctx.resume());
      const id = setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const v of samples) sum += v * v;
        const rms = Math.sqrt(sum / samples.length);
        onLevel(Math.min(Math.max((rms - 0.015) / 0.12, 0), 1));
      }, 33);
      cleanup = () => {
        clearInterval(id);
        untap();
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
      };
    })
    .catch((error: unknown) => log.warn("no microphone", error));
  return () => {
    stopped = true;
    cleanup();
  };
}

interface MotionPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

/** Calls `onTilt` with the phone's left/right tilt in radians (0 upright, positive to the right). */
export function listenForTilt(onTilt: (radians: number) => void): Stop {
  if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") return () => undefined;
  const handler = (event: DeviceOrientationEvent) => {
    if (event.gamma !== null) onTilt((event.gamma * Math.PI) / 180);
  };
  window.addEventListener("deviceorientation", handler);
  // iOS: motion only flows after asking, and asking needs a tap.
  const ask = (DeviceOrientationEvent as unknown as MotionPermission).requestPermission;
  const untap = ask ? onFirstTap(() => void ask().catch((error: unknown) => log.warn("no motion for the fire", error))) : () => undefined;
  return () => {
    untap();
    window.removeEventListener("deviceorientation", handler);
  };
}
