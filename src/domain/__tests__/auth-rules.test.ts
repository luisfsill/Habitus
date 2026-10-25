import { isValidEmail, normalizeCode, passwordChecks, passwordStrength } from "../auth-rules";

describe("isValidEmail", () => {
  it("accepts a normal address with spaces around it", () => {
    expect(isValidEmail(" voce@email.com ")).toBe(true);
  });

  it("rejects incomplete addresses", () => {
    expect(isValidEmail("voce@")).toBe(false);
    expect(isValidEmail("voce@email")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("passwordChecks", () => {
  it("reports each rule", () => {
    expect(passwordChecks("abc12345")).toEqual({ length: true, letter: true, number: true });
    expect(passwordChecks("abcdefg")).toEqual({ length: false, letter: true, number: false });
  });
});

describe("passwordStrength", () => {
  it("goes from 0 (empty) to 4 (long, mixed)", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("abc")).toBe(1);
    expect(passwordStrength("abc12345")).toBe(3);
    expect(passwordStrength("Abcdef12!xyz")).toBe(4);
  });
});

describe("normalizeCode", () => {
  it("keeps six digits and drops spaces or dashes", () => {
    expect(normalizeCode("123 456")).toBe("123456");
    expect(normalizeCode("12-34-56")).toBe("123456");
  });

  it("returns null when it is not six digits", () => {
    expect(normalizeCode("12345")).toBeNull();
    expect(normalizeCode("1234567")).toBeNull();
    expect(normalizeCode("12a456")).toBeNull();
  });
});
