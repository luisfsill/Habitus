// Synthesizes the "chamar atenção" sound: a short buzzing boing, original and dependency-free.
// Run: node scripts/build-nudge-sound.mjs  → assets/sounds/nudge.wav (16-bit PCM, mono, 22050 Hz).
import { Buffer } from "node:buffer";
import { writeFileSync } from "node:fs";

const RATE = 22050;
const SECONDS = 0.6;
const n = Math.round(RATE * SECONDS);
const samples = new Float64Array(n);

let phase = 0;
for (let i = 0; i < n; i++) {
  const t = i / RATE;
  // Pitch springs down from ~520 Hz to ~150 Hz with a wobble: the "boing".
  const freq = (150 + 370 * Math.exp(-t * 7)) * (1 + 0.12 * Math.sin(2 * Math.PI * 24 * t) * Math.exp(-t * 3));
  phase += (2 * Math.PI * freq) / RATE;
  // A driven sine (tanh) gives it the buzz; the attack is near instant and it decays fast.
  const tone = Math.tanh(3 * Math.sin(phase)) * 0.7 + Math.sin(2 * phase) * 0.3;
  const env = Math.min(1, t / 0.005) * Math.exp(-t * 4.5) * Math.min(1, (SECONDS - t) / 0.02);
  samples[i] = tone * env;
}

const peak = samples.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
const data = Buffer.alloc(n * 2);
for (let i = 0; i < n; i++) data.writeInt16LE(Math.round((samples[i] / peak) * 0.85 * 32767), i * 2);

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16); // fmt chunk size
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28); // byte rate
header.writeUInt16LE(2, 32); // block align
header.writeUInt16LE(16, 34); // bits per sample
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

const out = new URL("../assets/sounds/nudge.wav", import.meta.url);
writeFileSync(out, Buffer.concat([header, data]));
console.log(`wrote ${out.pathname} (${n} samples, ${SECONDS} s)`);
