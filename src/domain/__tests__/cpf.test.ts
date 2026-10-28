import { cpfDigits, formatCpf, isValidCpf, maskCpf } from "../cpf";

describe("cpf", () => {
  it("validates check digits", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });

  it("keeps only digits", () => {
    expect(cpfDigits("529.982.247-25")).toBe("52998224725");
  });

  it("formats while typing", () => {
    expect(formatCpf("5299822")).toBe("529.982.2");
    expect(formatCpf("529982247")).toBe("529.982.247");
    expect(formatCpf("52998224725999")).toBe("529.982.247-25");
  });

  it("masks the edges", () => {
    expect(maskCpf("52998224725")).toBe("***.982.247-**");
  });
});
