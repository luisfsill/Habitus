import { MAX_POST, feedLine, hasUnseenPosts, muralTitle, parseWallPosts, postDate, postProblem, type WallPost } from "../wall";

const user = (id: string, name: string) => ({ id, name, username: name.toLowerCase(), level: 2, is_admin: false, relation: "friends", avatar_url: null });
const row = (owner: ReturnType<typeof user>, author: ReturnType<typeof user>) => ({ id: 7, body: "Pessoa incrível", created_at: "2026-10-29T14:00:00.000Z", owner, author });

describe("parseWallPosts", () => {
  it("lê linhas válidas e descarta inválidas", () => {
    const posts = parseWallPosts([row(user("a", "Ana"), user("b", "Bia")), { id: 1 }, null]);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ id: "7", body: "Pessoa incrível", owner: { id: "a", name: "Ana" }, author: { id: "b", name: "Bia" } });
  });

  it("lê a foto só quando é um link https", () => {
    const [withPhoto, bad] = parseWallPosts([
      { ...row(user("a", "Ana"), user("a", "Ana")), image_url: "https://x.supabase.co/storage/v1/object/public/wall/a/f.jpg" },
      { ...row(user("a", "Ana"), user("a", "Ana")), image_url: "javascript:alert(1)" },
    ]);
    expect(withPhoto?.imageUrl).toBe("https://x.supabase.co/storage/v1/object/public/wall/a/f.jpg");
    expect(bad?.imageUrl).toBeNull();
  });

  it("lê quando foi editada", () => {
    const [edited, never] = parseWallPosts([{ ...row(user("a", "Ana"), user("a", "Ana")), edited_at: "2026-10-29T15:00:00.000Z" }, row(user("a", "Ana"), user("a", "Ana"))]);
    expect(edited?.editedAt).toBe("2026-10-29T15:00:00.000Z");
    expect(never?.editedAt).toBeNull();
  });

  it("não lê o que não é lista", () => {
    expect(parseWallPosts({})).toEqual([]);
  });
});

describe("feedLine", () => {
  const [ana, bia] = [user("a", "Ana"), user("b", "Bia")];
  const post = (o: typeof ana, au: typeof ana) => parseWallPosts([row(o, au)])[0] as WallPost;

  it("depoimento entre outras pessoas", () => {
    expect(feedLine(post(ana, bia), "c")).toBe("Ana recebeu um depoimento de Bia");
  });

  it("depoimento para mim ou meu", () => {
    expect(feedLine(post(ana, bia), "a")).toBe("Você recebeu um depoimento de Bia");
    expect(feedLine(post(ana, bia), "b")).toBe("Ana recebeu um depoimento de você");
  });

  it("publicação no próprio mural", () => {
    expect(feedLine(post(ana, ana), "c")).toBe("Ana publicou no mural");
    expect(feedLine(post(ana, ana), "a")).toBe("Você publicou no mural");
  });
});

describe("muralTitle", () => {
  const [ana, bia] = [user("a", "Ana"), user("b", "Bia")];
  const post = (o: typeof ana, au: typeof ana) => parseWallPosts([row(o, au)])[0] as WallPost;
  it("publicação própria e depoimento", () => {
    expect(muralTitle(post(ana, ana), "c")).toBe("Ana");
    expect(muralTitle(post(ana, ana), "a")).toBe("Você");
    expect(muralTitle(post(ana, bia), "c")).toBe("Depoimento de Bia");
    expect(muralTitle(post(ana, bia), "b")).toBe("Depoimento de você");
  });
});

describe("postDate", () => {
  const now = new Date(2026, 9, 29, 15, 0);
  it("hoje, ontem, este ano e outro ano", () => {
    expect(postDate(new Date(2026, 9, 29, 9, 5).toISOString(), now)).toBe("Hoje, 09:05");
    expect(postDate(new Date(2026, 9, 28, 22, 30).toISOString(), now)).toBe("Ontem, 22:30");
    expect(postDate(new Date(2026, 9, 12, 8, 0).toISOString(), now)).toBe("12 de outubro");
    expect(postDate(new Date(2025, 0, 3, 8, 0).toISOString(), now)).toBe("3 de janeiro de 2025");
  });
});

describe("postProblem", () => {
  it("vazio, no limite e acima dele", () => {
    expect(postProblem("  \n ")).not.toBeNull();
    expect(postProblem("a".repeat(MAX_POST))).toBeNull();
    expect(postProblem("a".repeat(MAX_POST + 1))).not.toBeNull();
    expect(postProblem("", true)).toBeNull();
  });
});

describe("hasUnseenPosts", () => {
  const [ana, bia] = [user("a", "Ana"), user("b", "Bia")];
  const posts = parseWallPosts([row(ana, bia)]); // Bia, 14:00

  it("acende com publicação de outra pessoa depois da última visita", () => {
    expect(hasUnseenPosts(posts, "2026-10-29T13:59:00.000Z", "a")).toBe(true);
  });

  it("apaga quando a visita é depois da publicação", () => {
    expect(hasUnseenPosts(posts, "2026-10-29T14:00:00.000Z", "a")).toBe(false);
  });

  it("ignora o que eu mesmo publiquei", () => {
    expect(hasUnseenPosts(posts, "2026-10-29T13:00:00.000Z", "b")).toBe(false);
  });

  it("sem visita registrada, nada é novidade", () => {
    expect(hasUnseenPosts(posts, null, "a")).toBe(false);
  });
});
