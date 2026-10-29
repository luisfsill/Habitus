import {
  accessStatus,
  daysLeft,
  displayName,
  endOfDaySaoPaulo,
  parseBrDate,
  extendAccess,
  firstName,
  formatPrice,
  hasAccess,
  matchesSearch,
  parseCachedProfile,
  parsePlan,
  parsePrice,
  parseProfile,
  type Profile,
  helpWhatsAppUrl,
  renewWhatsAppUrl,
  statusLabel,
  whatsAppAppUrl,
} from "../access";

const now = new Date("2026-10-25T12:00:00Z");
const hour = 3_600_000;
const day = 24 * hour;

function profile(patch: Partial<Profile>): Profile {
  return { id: "u1", name: "João Silva", email: "joao.silva@email.com", role: "user", plan: "trial", accessUntil: null, unlimited: false, createdAt: now.toISOString(), username: null, searchable: true, avatarUrl: null, freeAccess: false, ...patch };
}
const at = (ms: number) => new Date(now.getTime() + ms).toISOString();

describe("access status", () => {
  it("counts a trial with 2 days and 1 hour left as 3 days", () => {
    const p = profile({ accessUntil: at(2 * day + hour) });
    expect(daysLeft(p, now)).toBe(3);
    expect(accessStatus(p, now)).toBe("trial");
    expect(hasAccess(p, now)).toBe(true);
  });

  it("blocks an account that expired yesterday", () => {
    const p = profile({ plan: "paid", accessUntil: at(-day) });
    expect(accessStatus(p, now)).toBe("expired");
    expect(hasAccess(p, now)).toBe(false);
    expect(daysLeft(p, now)).toBe(0);
  });

  it("always lets admins and unlimited accounts in", () => {
    expect(accessStatus(profile({ role: "admin", accessUntil: at(-day) }), now)).toBe("admin");
    expect(hasAccess(profile({ role: "admin", accessUntil: null }), now)).toBe(true);
    expect(accessStatus(profile({ unlimited: true }), now)).toBe("unlimited");
  });

  it("lets an expired account in while the app is free", () => {
    const p = profile({ plan: "paid", accessUntil: at(-day), freeAccess: true });
    expect(hasAccess(p, now)).toBe(true);
    expect(accessStatus(p, now)).toBe("unlimited");
  });

  it("shows a paid account in date as active", () => {
    expect(accessStatus(profile({ plan: "paid", accessUntil: at(10 * day) }), now)).toBe("active");
  });
});

describe("extendAccess", () => {
  it("adds to a validity still in the future", () => {
    expect(extendAccess(at(5 * day), 30, now)).toBe(at(35 * day));
  });

  it("counts from now when already expired or empty", () => {
    expect(extendAccess(at(-5 * day), 30, now)).toBe(at(30 * day));
    expect(extendAccess(null, 1, now)).toBe(at(day));
  });
});

describe("endOfDaySaoPaulo", () => {
  it("ends the chosen day at 23:59:59.999 in São Paulo", () => {
    expect(endOfDaySaoPaulo("2026-11-30")).toBe("2026-12-01T02:59:59.999Z");
  });
});

describe("parseBrDate", () => {
  it("turns a Brazilian date into an ISO day", () => {
    expect(parseBrDate(" 31/12/2026 ")).toBe("2026-12-31");
  });
  it("rejects days that do not exist and other formats", () => {
    expect(parseBrDate("31/02/2026")).toBeNull();
    expect(parseBrDate("2026-12-31")).toBeNull();
    expect(parseBrDate("1/2/2026")).toBeNull();
  });
});

describe("names and search", () => {
  it("falls back to the e-mail before @", () => {
    expect(displayName({ name: "", email: "maria123@x.com" })).toBe("maria123");
    expect(displayName({ name: "  Ana Paula ", email: "a@x.com" })).toBe("Ana Paula");
    expect(firstName({ name: "Ana Paula", email: "a@x.com" })).toBe("Ana");
  });

  it("finds names without accents or case and parts of the e-mail", () => {
    expect(matchesSearch(profile({}), "joao")).toBe(true);
    expect(matchesSearch(profile({}), "SILVA@")).toBe(true);
    expect(matchesSearch(profile({}), "maria")).toBe(false);
    expect(matchesSearch(profile({}), "  ")).toBe(true);
  });
});

describe("renewWhatsAppUrl", () => {
  it("opens the owner's WhatsApp with the account, plan and order code in the message", () => {
    const url = renewWhatsAppUrl("Maria", "maria@x.com", { name: "Anual", priceCents: 7990 }, "HABK7Q2ZP");
    expect(url.startsWith("https://wa.me/5537999216351?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe(
      "Olá! Sou Maria (maria@x.com). Paguei o Habitus no plano Anual (R$ 79,90) pelo Pix, pedido HABK7Q2ZP. Segue o comprovante.",
    );
  });
});

describe("helpWhatsAppUrl", () => {
  it("opens the owner's WhatsApp asking for help with the payment code", () => {
    const url = helpWhatsAppUrl("Maria", "maria@x.com", "AB12CD34");
    expect(url.startsWith("https://wa.me/5537999216351?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe("Olá! Sou Maria (maria@x.com). Preciso de ajuda com o pagamento do Habitus, pedido AB12CD34.");
  });
});

describe("whatsAppAppUrl", () => {
  it("turns wa.me links into whatsapp://send, with or without a phone", () => {
    expect(whatsAppAppUrl("https://wa.me/5537999216351?text=Ol%C3%A1")).toBe("whatsapp://send?phone=5537999216351&text=Ol%C3%A1");
    expect(whatsAppAppUrl("https://wa.me/?text=oi")).toBe("whatsapp://send?text=oi");
  });
});

describe("parsing rows", () => {
  it("reads a profile row and rejects bad roles", () => {
    const row = { id: "u1", name: "A", email: "a@x.com", role: "admin", plan: "paid", access_until: null, unlimited: true, created_at: "2026-10-25T00:00:00Z" };
    expect(parseProfile(row)).toEqual({ id: "u1", name: "A", email: "a@x.com", role: "admin", plan: "paid", accessUntil: null, unlimited: true, createdAt: "2026-10-25T00:00:00Z", username: undefined, searchable: true, avatarUrl: null, freeAccess: false });
    expect(parseProfile({ ...row, username: null })?.username).toBeNull();
    expect(parseProfile({ ...row, username: "ana", searchable: false })).toMatchObject({ username: "ana", searchable: false });
    expect(parseProfile({ ...row, role: "root" })).toBeNull();
    expect(parseProfile(null)).toBeNull();
  });

  it("reads a plan row", () => {
    const row = { id: "yearly", name: "Anual", days: 365, price_cents: 7990, highlight: true, active: true, sort: 3 };
    expect(parsePlan(row)).toEqual({ id: "yearly", name: "Anual", days: 365, priceCents: 7990, highlight: true, active: true, sort: 3 });
    expect(parsePlan({ ...row, days: 0 })).toBeNull();
  });
});

describe("parseCachedProfile", () => {
  it("reads back a saved profile and rejects junk", () => {
    const p = profile({ role: "admin", accessUntil: at(day) });
    expect(parseCachedProfile(JSON.parse(JSON.stringify(p)))).toEqual(p);
    const social = profile({ username: "ana", searchable: false });
    expect(parseCachedProfile(JSON.parse(JSON.stringify(social)))).toEqual(social);
    const absent = parseCachedProfile(JSON.parse(JSON.stringify(profile({ username: undefined }))));
    expect(absent?.username).toBeUndefined();
    expect(parseCachedProfile(JSON.parse(JSON.stringify(profile({ username: null }))))?.username).toBeNull();
    expect(parseCachedProfile({ ...p, plan: "gold" })).toBeNull();
  });
});

describe("formatPrice", () => {
  it("formats cents as reais", () => {
    expect(formatPrice(990)).toBe("R$ 9,90");
    expect(formatPrice(7990)).toBe("R$ 79,90");
  });
});

describe("parsePrice", () => {
  it("reads prices typed in reais", () => {
    expect(parsePrice("9,90")).toBe(990);
    expect(parsePrice("R$ 79,90")).toBe(7990);
    expect(parsePrice("10")).toBe(1000);
  });

  it("rejects text and negatives", () => {
    expect(parsePrice("abc")).toBeNull();
    expect(parsePrice("-1")).toBeNull();
    expect(parsePrice("")).toBeNull();
  });
});

describe("statusLabel", () => {
  it("names every status in Portuguese", () => {
    expect(statusLabel(profile({ accessUntil: at(2 * day + hour) }), now)).toBe("Teste · 3 dias");
    expect(statusLabel(profile({ accessUntil: at(hour) }), now)).toBe("Teste · 1 dia");
    expect(statusLabel(profile({ plan: "paid", accessUntil: at(-day) }), now)).toBe("Vencido");
    expect(statusLabel(profile({ plan: "paid", accessUntil: at(day) }), now)).toBe("Ativo");
    expect(statusLabel(profile({ unlimited: true }), now)).toBe("Ilimitado");
    expect(statusLabel(profile({ role: "admin" }), now)).toBe("Admin");
  });
});
