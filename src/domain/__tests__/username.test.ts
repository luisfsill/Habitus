import {
  isSocialPushId,
  normalizeQuery,
  usernameCandidates,
  usernameError,
} from "../username";

describe("usernameError", () => {
  it("aceita formato válido", () => expect(usernameError("joao.silva_2", false)).toBeNull());
  it.each(["jo", "a".repeat(21), ".joao", "joao.", "jo..ao", "joão", "jo ao", "JOAO"])("recusa %s", (u) =>
    expect(usernameError(u, false)).not.toBeNull());
  it.each(["habitus", "h4bitus", "ha.bi.tus", "habitus_oficial", "meuhabitus", "admin", "4dm1n", "suporte", "fundador"])(
    "reserva %s para usuário comum", (u) => expect(usernameError(u, false)).toMatch(/reservado/i));
  it("libera reservados para admin", () => expect(usernameError("habitus", true)).toBeNull());
  it("não confunde nomes comuns", () => expect(usernameError("rootbeer", false)).toBeNull()); // só igual a "root" é reservado
});
describe("usernameCandidates", () => {
  it("usa primeiro e último nome sem acento", () => expect(usernameCandidates("João da Silva")[0]).toBe("joao.silva"));
  it("acrescenta números depois", () => expect(usernameCandidates("João Silva").slice(1, 3)).toEqual(["joao.silva2", "joao.silva3"]));
  it("corta em 20 contando o número", () => expect(usernameCandidates("Maximiliano Albuquerque").every((u) => u.length <= 20)).toBe(true));
  it("nome vazio ou curto ainda sugere", () => expect(usernameCandidates("")[0]).toBe("usuario"));
  it("pula reservados", () => expect(usernameCandidates("Habitus")[0]).not.toMatch(/habitus/));
  it("devolve 10 sugestões", () => expect(usernameCandidates("João Silva")).toHaveLength(10));
});
describe("normalizeQuery", () => {
  it("remove @ e acento", () => expect(normalizeQuery("  @João ")).toBe("joao"));
  it.each(["", "@", "ab", "@ab", "   "])("curta demais: %s", (q) => expect(normalizeQuery(q)).toBe(""));
});
it("reconhece ids de aviso social", () => {
  expect(isSocialPushId("social:request:abc")).toBe(true);
  expect(isSocialPushId("2026-10-27:trick:1")).toBe(false);
});
