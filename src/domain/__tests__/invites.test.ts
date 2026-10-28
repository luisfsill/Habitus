import { type Invite, inviteMessage, inviteStatus, licenseLabel, normalizeInviteCode, parseInvite, giftMessage } from "../invites";

const now = new Date("2026-10-27T12:00:00Z");
const row = { code: "AB12CD34EF", days: 180, created_at: "2026-10-27T12:00:00Z", expires_at: "2026-11-03T12:00:00Z", used_at: null };
const invite: Invite = { code: "AB12CD34EF", days: 180, createdAt: "2026-10-27T12:00:00Z", expiresAt: "2026-11-03T12:00:00Z", usedAt: null, usedBy: null };

describe("invites", () => {
  it("normalizes what people type or paste", () => {
    expect(normalizeInviteCode(" ab12-cd34 ef ")).toBe("AB12CD34EF");
  });

  it("names each license length", () => {
    expect([30, 180, 365, null].map(licenseLabel)).toEqual(["30 dias", "6 meses", "1 ano", "acesso ilimitado"]);
    expect(licenseLabel(730)).toBe("2 anos");
    expect(licenseLabel(45)).toBe("45 dias");
  });

  it("writes the message with license, site link, redeem steps, code and deadline", () => {
    const text = inviteMessage(invite);
    expect(text).toContain("*6 meses* de licença gratuita");
    expect(text).toContain("Abra https://habitushub.vercel.app, instale");
    expect(text).not.toContain("convite=");
    expect(text).toContain("*AB12CD34EF*");
    expect(text).toContain("*Gift Code*");
    expect(text).toContain("vale até 03/11/2026");
    expect(inviteMessage({ ...invite, days: null })).toContain("acesso *ilimitado* e gratuito");
  });

  it("tells pending, used and expired apart", () => {
    expect(inviteStatus(invite, now)).toBe("pending");
    expect(inviteStatus({ ...invite, usedAt: "2026-10-28T10:00:00Z" }, now)).toBe("used");
    expect(inviteStatus(invite, new Date("2026-11-04T00:00:00Z"))).toBe("expired");
  });

  it("tells what a redeemed code gave", () => {
    expect(giftMessage(30)).toBe("+30 dias somados ao seu plano.");
    expect(giftMessage(null)).toBe("Seu acesso agora é ilimitado.");
  });

  it("parses rows and rejects damaged ones", () => {
    expect(parseInvite(row)).toEqual(invite);
    expect(parseInvite({ ...row, days: null })?.days).toBeNull();
    expect(parseInvite({ ...row, days: 0 })).toBeNull();
    expect(parseInvite({ ...row, code: 1 })).toBeNull();
    expect(parseInvite({ ...row, used_by: "u1" })?.usedBy).toBe("u1");
  });
});
