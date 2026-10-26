// Gera o par de chaves VAPID do Web Push, sem dependências: node scripts/vapid-keys.mjs
// A pública vai no app (EXPO_PUBLIC_VAPID_PUBLIC_KEY); a privada só nos segredos da função push-send.
import { Buffer } from "node:buffer";
import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pub = publicKey.export({ format: "jwk" });
const priv = privateKey.export({ format: "jwk" });

// Uncompressed P-256 point: 0x04 || x || y, base64url, as browsers expect.
const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, "base64url"), Buffer.from(pub.y, "base64url")]);

console.log(`VAPID_PUBLIC_KEY=${raw.toString("base64url")}`);
console.log(`VAPID_PRIVATE_KEY=${priv.d}`);
