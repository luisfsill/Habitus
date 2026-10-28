import { crc16, orderCode, pixPayload } from "../pix";

describe("pix", () => {
  it("matches the Banco Central example (static, no amount)", () => {
    const code = pixPayload({ key: "123e4567-e12b-12d1-a456-426655440000", name: "Fulano de Tal", city: "BRASILIA", txid: "***" });
    expect(code).toBe(
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
    );
  });

  it("adds the amount and keeps the CRC valid", () => {
    const code = pixPayload({ key: "habitushub@gmail.com", name: "Luis Felipe", city: "Piumhi", amountCents: 7990, txid: "HAB7K2Q9" });
    expect(code).toContain("540579.90");
    expect(code).toContain("6006Piumhi");
    expect(code.slice(-4)).toBe(crc16(code.slice(0, -4)));
  });

  it("drops accents and cuts the name to 25 and the city to 15 characters", () => {
    const code = pixPayload({ key: "k", name: "Luís Felipe Silveira Vieira", city: "São João del-Rei de Minas", txid: "A" });
    expect(code).toContain("5925Luis Felipe Silveira Viei");
    expect(code).toContain("6015Sao Joao del-Re");
  });

  it("makes short order codes from letters and digits only", () => {
    const code = orderCode(() => 0.5);
    expect(code).toMatch(/^HAB[A-Z0-9]{6}$/);
    expect(orderCode()).not.toBe(orderCode());
  });
});
