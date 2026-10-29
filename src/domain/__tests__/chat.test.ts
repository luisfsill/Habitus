import {
  MAX_TEXT,
  groupByDay,
  mergeMessages,
  nudgeWaitMs,
  parseConversations,
  parseMessage,
  previewOf,
  seenMessageId,
  textProblem,
  unreadTotal,
  type Message,
} from "../chat";
import { STICKERS, stickerLabel } from "../stickers";

const ME = "me";
const OTHER = "ot";
const msg = (o: Partial<Message> & { id: string }): Message => ({
  sender: ME,
  recipient: OTHER,
  kind: "text",
  body: "oi",
  createdAt: "2026-10-29T14:00:00.000Z",
  ...o,
});

describe("parseMessage", () => {
  it("lê uma linha válida", () => {
    expect(parseMessage({ id: "1", sender: "a", recipient: "b", kind: "text", body: "oi", created_at: "2026-10-29T14:00:00Z" })).toEqual({
      id: "1", sender: "a", recipient: "b", kind: "text", body: "oi", createdAt: "2026-10-29T14:00:00Z",
    });
  });
  it("recusa kind desconhecido ou sem id", () => {
    const ok = { id: "1", sender: "a", recipient: "b", kind: "text", body: "oi", created_at: "x" };
    expect(parseMessage({ ...ok, kind: "foto" })).toBeNull();
    expect(parseMessage({ ...ok, id: undefined })).toBeNull();
    expect(parseMessage(null)).toBeNull();
  });
});

describe("parseConversations", () => {
  const peer = { id: "p", name: "Ana", username: "ana", level: 3, avatar_url: "preset:a1" };
  it("converte e descarta inválidos", () => {
    const out = parseConversations([
      { peer, friends: true, last: null, unread: 2, peer_read_at: null },
      { peer: { ...peer, avatar_url: "http://x" }, friends: false, last: { id: "1", sender: "p", recipient: "m", kind: "nudge", body: "", created_at: "t" }, unread: 0, peer_read_at: "t" },
      { nope: 1 },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].peer.avatarUrl).toBe("preset:a1");
    expect(out[0]).toMatchObject({ friends: true, last: null, unread: 2, peerReadAt: null });
    expect(out[1].peer.avatarUrl).toBeNull();
    expect(out[1].last?.kind).toBe("nudge");
  });
  it("não-array vira []", () => {
    expect(parseConversations({})).toEqual([]);
  });
});

describe("previewOf", () => {
  it("cobre cada tipo", () => {
    expect(previewOf(msg({ id: "1" }), ME)).toBe("Você: oi");
    expect(previewOf(msg({ id: "1", sender: OTHER }), ME)).toBe("oi");
    expect(previewOf(msg({ id: "1", kind: "sticker", body: "feliz" }), ME)).toBe("Figurinha");
    expect(previewOf(msg({ id: "1", kind: "nudge" }), ME)).toBe("Você chamou a atenção");
    expect(previewOf(msg({ id: "1", kind: "nudge", sender: OTHER }), ME)).toBe("Chamou sua atenção!");
  });
  it("quebra de linha vira uma linha", () => {
    expect(previewOf(msg({ id: "1", sender: OTHER, body: "a\n\nb" }), ME)).toBe("a b");
  });
});

describe("groupByDay", () => {
  it("rotula e ordena", () => {
    const today = new Date(2026, 9, 29, 15, 0);
    const at = (d: number, h: number) => new Date(2026, 9, d, h).toISOString();
    const g = groupByDay(
      [msg({ id: "c", createdAt: at(29, 9) }), msg({ id: "a", createdAt: at(27, 9) }), msg({ id: "b", createdAt: at(28, 9) }), msg({ id: "d", createdAt: at(29, 8) })],
      today,
    );
    expect(g.map((x) => x.label)).toEqual(["27 de outubro", "Ontem", "Hoje"]);
    expect(g[2].messages.map((m) => m.id)).toEqual(["d", "c"]);
    expect(g[0].day).toBe("2026-10-27");
  });
});

describe("seenMessageId", () => {
  const ms = [msg({ id: "1", createdAt: "2026-10-29T10:00:00Z" }), msg({ id: "2", createdAt: "2026-10-29T11:00:00Z" }), msg({ id: "3", sender: OTHER, createdAt: "2026-10-29T12:00:00Z" })];
  it("última minha lida", () => {
    expect(seenMessageId(ms, ME, "2026-10-29T10:30:00Z")).toBe("1");
    expect(seenMessageId(ms, ME, "2026-10-29T11:00:00Z")).toBe("2");
    expect(seenMessageId(ms, ME, "2026-10-29T13:00:00Z")).toBe("2");
  });
  it("null sem leitura ou sem mensagem minha", () => {
    expect(seenMessageId(ms, ME, null)).toBeNull();
    expect(seenMessageId(ms, ME, "2026-10-29T09:00:00Z")).toBeNull();
    expect(seenMessageId([ms[2]], ME, "2026-10-29T13:00:00Z")).toBeNull();
  });
});

describe("nudgeWaitMs", () => {
  const now = new Date("2026-10-29T14:00:00Z");
  const nudge = (s: number, sender = ME) => msg({ id: String(s), kind: "nudge", sender, createdAt: new Date(now.getTime() - s * 1000).toISOString() });
  it("conta só o meu", () => {
    expect(nudgeWaitMs([nudge(10)], ME, now)).toBe(20_000);
    expect(nudgeWaitMs([nudge(31)], ME, now)).toBe(0);
    expect(nudgeWaitMs([nudge(5, OTHER)], ME, now)).toBe(0);
    expect(nudgeWaitMs([], ME, now)).toBe(0);
  });
});

describe("mergeMessages", () => {
  it("RF-2: dedupe por id e ordena", () => {
    const a = msg({ id: "a", createdAt: "2026-10-29T10:00:00Z" });
    const b = msg({ id: "b", createdAt: "2026-10-29T09:00:00Z" });
    const out = mergeMessages([a], [b, a]);
    expect(out.map((m) => m.id)).toEqual(["b", "a"]);
  });
});

describe("textProblem", () => {
  it("RF-4", () => {
    expect(textProblem("a".repeat(MAX_TEXT))).toBeNull();
    expect(textProblem("a".repeat(MAX_TEXT + 1))).toBe("Mensagem muito longa (máx. 2000).");
    expect(textProblem("  \n ")).toBe("Escreva uma mensagem.");
    expect(textProblem("😀")).toBeNull();
    expect(textProblem("😀".repeat(MAX_TEXT))).toBeNull();
  });
});

describe("unreadTotal", () => {
  it("soma", () => {
    const c = parseConversations([1, 4].map((unread) => ({ peer: { id: "p", name: "A", username: "a", level: 1, avatar_url: null }, friends: true, last: null, unread, peer_read_at: null })));
    expect(unreadTotal(c)).toBe(5);
  });
});

describe("stickers", () => {
  it("ids únicos e válidos, 24", () => {
    const ids = STICKERS.map((s) => s.id);
    expect(ids).toHaveLength(24);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^[a-z0-9-]+$/));
  });
  it("rótulo", () => {
    expect(stickerLabel("x-desconhecida")).toBe("Figurinha");
    expect(stickerLabel(STICKERS[0].id)).toBe(STICKERS[0].label);
  });
});
