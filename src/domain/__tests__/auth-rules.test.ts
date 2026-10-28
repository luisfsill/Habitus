import { authErrorMessage, isValidEmail, passwordChecks, passwordStrength } from "../auth-rules";

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

describe("authErrorMessage", () => {
  it("translates known Supabase error codes", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe("E-mail ou senha incorretos.");
    expect(authErrorMessage({ code: "otp_expired" })).toBe("Código inválido ou expirado. Peça um novo.");
    expect(authErrorMessage({ code: "user_already_exists" })).toBe("Já existe uma conta com este e-mail. Tente entrar.");
  });

  it("reports a network failure as a connection problem", () => {
    expect(authErrorMessage({ name: "AuthRetryableFetchError" })).toBe("Sem conexão. Verifique sua internet e tente de novo.");
    expect(authErrorMessage({ message: "Failed to fetch" })).toBe("Sem conexão. Verifique sua internet e tente de novo.");
  });

  it("never shows the raw English message", () => {
    expect(authErrorMessage({ code: "something_new", message: "Database error" })).toBe("Algo deu errado. Tente de novo em instantes.");
    expect(authErrorMessage(null)).toBe("Algo deu errado. Tente de novo em instantes.");
  });
});
