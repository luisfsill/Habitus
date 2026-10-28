// Habitus: testes de isPaidOrder e qrTextOf. Rode com: deno test supabase/functions/_shared/pagbank_test.ts
import { assertEquals } from "jsr:@std/assert@1";
import { isPaidOrder, qrTextOf } from "./pagbank.ts";

const expected = { orderId: "ORDE_1", referenceId: "pay-1", cents: 1990 };
const order = (status: string, value: number, referenceId = "pay-1") => ({
  id: "ORDE_1",
  reference_id: referenceId,
  charges: [{ id: "CHAR_1", status, amount: { value, currency: "BRL" } }],
});

Deno.test("PAID charge with the right amount is paid", () => {
  assertEquals(isPaidOrder(order("PAID", 1990), expected), true);
});

Deno.test("PAID charge with another amount is not paid", () => {
  assertEquals(isPaidOrder(order("PAID", 100), expected), false);
});

Deno.test("WAITING charge is not paid", () => {
  assertEquals(isPaidOrder(order("WAITING", 1990), expected), false);
});

Deno.test("another reference_id is not paid", () => {
  assertEquals(isPaidOrder(order("PAID", 1990, "pay-2"), expected), false);
});

Deno.test("another order id is not paid", () => {
  assertEquals(isPaidOrder({ ...order("PAID", 1990), id: "ORDE_2" }, expected), false);
});

Deno.test("null or junk body is not paid", () => {
  assertEquals(isPaidOrder(null, expected), false);
  assertEquals(isPaidOrder({ id: "ORDE_1", reference_id: "pay-1", charges: "PAID" }, expected), false);
});

Deno.test("qrTextOf reads the current and the deprecated shapes", () => {
  assertEquals(qrTextOf({ charges: [{ qr_code: { text: "000201a" } }] }), "000201a");
  assertEquals(qrTextOf({ qr_codes: [{ text: "000201b" }] }), "000201b");
  assertEquals(qrTextOf({ charges: [{}] }), null);
  assertEquals(qrTextOf(null), null);
});
