/**
 * Static Pix "copia e cola" (BR Code, EMV QR) built in the app from the owner's key, with the plan's exact amount and
 * an order code. Static means the bank does not tell anyone when it is paid: the owner checks the statement and
 * grants access in Admin. shortcut: manual confirmation; switch to the bank's Pix API (dynamic QR + webhook) for
 * automatic release.
 */

export interface PixCharge {
  key: string;
  name: string;
  city: string;
  /** Omitted: the payer types the amount. */
  amountCents?: number;
  /** Order code shown in the payer's bank (letters and digits, up to 25), "***" for none. */
  txid: string;
}

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

/** No accents, only letters, digits, spaces, dots and dashes (what every bank shows), cut to `max`. */
const plain = (text: string, max: number) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^A-Za-z0-9 .-]/g, "").trim().slice(0, max).trim();

/** CRC16-CCITT (poly 0x1021, start 0xFFFF), as 4 upper-case hex digits. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function pixPayload({ key, name, city, amountCents, txid }: PixCharge): string {
  const body = [
    field("00", "01"),
    field("26", field("00", "br.gov.bcb.pix") + field("01", key)),
    field("52", "0000"),
    field("53", "986"),
    amountCents ? field("54", (amountCents / 100).toFixed(2)) : "",
    field("58", "BR"),
    field("59", plain(name, 25)),
    field("60", plain(city, 15)),
    field("62", field("05", txid)),
    "6304",
  ].join("");
  return body + crc16(body);
}

/** "HAB" and 6 letters or digits, to find this payment in the statement and in the WhatsApp message. */
export function orderCode(random: () => number = Math.random): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `HAB${Array.from({ length: 6 }, () => chars[Math.floor(random() * chars.length)]).join("")}`;
}
