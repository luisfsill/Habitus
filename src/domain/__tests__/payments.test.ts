import { formatPaymentTime, parseAdminPayment, parseCheckout, parseConfig, parseRevenue, paymentSummary, revenueBars } from "../payments";

const TODAY = new Date(2026, 9, 28);

describe("parseCheckout", () => {
  it("accepts a full automatic checkout", () => {
    const c = { mode: "automatic", paymentId: "p", qrText: "000201…", expiresAt: "2026-10-28T12:30:00Z" };
    expect(parseCheckout(c)).toEqual(c);
  });

  it("accepts manual and needs_cpf", () => {
    expect(parseCheckout({ mode: "manual" })).toEqual({ mode: "manual" });
    expect(parseCheckout({ mode: "needs_cpf" })).toEqual({ mode: "needs_cpf" });
  });

  it("falls back on anything unexpected", () => {
    expect(parseCheckout({ mode: "automatic" })).toEqual({ mode: "fallback" });
    expect(parseCheckout(null)).toEqual({ mode: "fallback" });
    expect(parseCheckout({ error: "x" })).toEqual({ mode: "fallback" });
  });
});

describe("parseConfig", () => {
  it("defaults to manual/sandbox", () => {
    expect(parseConfig({})).toEqual({ mode: "manual", env: "sandbox" });
    expect(parseConfig(null)).toEqual({ mode: "manual", env: "sandbox" });
  });
  it("reads valid values", () => {
    expect(parseConfig({ mode: "automatic", env: "production" })).toEqual({ mode: "automatic", env: "production" });
  });
});

describe("revenueBars", () => {
  it("builds 30 empty day bars ending today", () => {
    const bars = revenueBars([], "days", TODAY);
    expect(bars).toHaveLength(30);
    expect(bars.every((b) => b.cents === 0 && b.ratio === 0)).toBe(true);
    expect(bars[29].label).toBe("28/10");
    expect(bars[0].label).toBe("29/09");
  });

  it("scales against the tallest bar", () => {
    const bars = revenueBars([{ bucket: "2026-10-27", cents: 7990, count: 1 }, { bucket: "2026-10-28", cents: 3995, count: 1 }], "days", TODAY);
    expect(bars[28].ratio).toBe(1);
    expect(bars[29].ratio).toBeCloseTo(0.5, 2);
  });

  it("builds 12 month bars ending this month", () => {
    const bars = revenueBars([{ bucket: "2026-10", cents: 990, count: 1 }], "months", TODAY);
    expect(bars).toHaveLength(12);
    expect(bars[11].label).toBe("out");
    expect(bars[11].ratio).toBe(1);
    expect(bars[0].label).toBe("nov");
  });
});

describe("paymentSummary", () => {
  it("sums and averages", () => {
    const pts = [{ bucket: "a", cents: 7990, count: 1 }, { bucket: "b", cents: 990, count: 1 }];
    expect(paymentSummary(pts)).toEqual({ cents: 8980, count: 2, averageCents: 4490 });
    expect(paymentSummary([])).toEqual({ cents: 0, count: 0, averageCents: 0 });
  });
});

describe("parseRevenue", () => {
  it("keeps valid rows only", () => {
    expect(parseRevenue([{ bucket: "2026-10-27", cents: 5, count: 1 }, { bucket: "x" }, null])).toEqual([{ bucket: "2026-10-27", cents: 5, count: 1 }]);
    expect(parseRevenue("nope")).toEqual([]);
  });
});

describe("parseAdminPayment", () => {
  const row = {
    id: "i", user_id: "u", name: "Ana", username: null, email: "a@b.c", avatar_url: null, plan_name: "Mensal",
    amount_cents: 990, days: 30, method: "automatic", status: "paid", env: "sandbox",
    order_code: "O1", pagbank_order_id: null, created_at: "2026-10-28T10:00:00Z", paid_at: null, granted_until: null,
  };
  it("maps snake_case", () => {
    expect(parseAdminPayment(row)).toMatchObject({ id: "i", userId: "u", amountCents: 990, planName: "Mensal", orderCode: "O1", status: "paid" });
  });
  it("drops a row without id", () => {
    expect(parseAdminPayment({ ...row, id: undefined })).toBeNull();
  });
});

describe("formatPaymentTime", () => {
  it("shows day, month and time in Brasília", () => {
    expect(formatPaymentTime("2026-10-28T17:32:00Z")).toBe("28/10 às 14:32");
    // 01:05 UTC is still the previous evening in São Paulo.
    expect(formatPaymentTime("2026-11-01T01:05:00Z")).toBe("31/10 às 22:05");
  });
});
