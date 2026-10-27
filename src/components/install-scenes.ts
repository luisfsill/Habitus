/**
 * Step-by-step scenes for the install sheet's mini phone. Each scene says what the phone shows
 * and which control is "hot" (the one with the pulse and the tapping hand).
 */
export type StepsKind = "ios" | "inapp" | "manual";

/** Browser chrome drawn on the phone: Safari's floating bottom bar (iOS 26), Chrome's top bar, or an in-app browser. */
export type Bar = "safari" | "chrome" | "inapp";

export interface Row {
  label: string;
  /** Material Symbol name (the sheet only shows in a phone's browser). */
  icon: string;
  hot?: boolean;
}

export type Overlay =
  /** Safari's share sheet; with rows it is opened all the way ("Ver Mais") and shows them. */
  | { kind: "share"; rows?: Row[] }
  | { kind: "menu"; rows: Row[] }
  | { kind: "add" }
  | { kind: "install" }
  | { kind: "home" };

export interface Scene {
  title: string;
  detail: string;
  /** Overrides the kind's bar (the in-app flow ends in a real browser). */
  bar?: Bar;
  overlay?: Overlay;
  /** Hot control on the page itself: the bar's menu button (≡ in Safari, ⋮ or ⋯ elsewhere), or the page's install button. */
  hot?: "more" | "install";
}

export const SCENES: Record<StepsKind, { title: string; bar: Bar; scenes: Scene[] }> = {
  ios: {
    title: "Adicione à Tela de Início",
    bar: "safari",
    scenes: [
      {
        title: "Toque nos três tracinhos",
        detail: "Ficam na barra do Safari, embaixo, do lado do endereço do site.",
        hot: "more",
      },
      {
        title: "Toque em Compartilhar",
        detail: "É a primeira opção do menu que abriu.",
        overlay: {
          kind: "menu",
          rows: [
            { label: "Compartilhar", icon: "ios_share", hot: true },
            { label: "Adicionar a Favoritos", icon: "bookmark_border" },
            { label: "Buscar na Página", icon: "find_in_page" },
            { label: "Zoom da Página", icon: "zoom_in" },
          ],
        },
      },
      {
        title: "Toque em “Ver Mais”",
        detail: "O botão redondo com a setinha para baixo, no fim da fileira de botões.",
        overlay: { kind: "share" },
      },
      {
        title: "Toque em “Adicionar à Tela de Início”",
        detail: "Fica na lista que abriu, com um quadrado e um + do lado.",
        overlay: {
          kind: "share",
          rows: [
            { label: "Adicionar Favorito a…", icon: "menu_book" },
            { label: "Preferidos", icon: "star_border" },
            { label: "Adicionar à Nota Rápida", icon: "note_alt" },
            { label: "Buscar na Página", icon: "find_in_page" },
            { label: "Adicionar à Tela de Início", icon: "add_box", hot: true },
          ],
        },
      },
      {
        title: "Toque em “Adicionar”",
        detail: "O botão azul no canto de cima, à direita. Deixe “Abrir como app web” ligado.",
        overlay: { kind: "add" },
      },
      { title: "Pronto!", detail: "O Habitus aparece na sua tela inicial. Abra por lá, como um app.", overlay: { kind: "home" } },
    ],
  },
  inapp: {
    title: "Abra no navegador",
    bar: "inapp",
    scenes: [
      {
        title: "Toque em ⋯ no canto da tela",
        detail: "Este navegador (Instagram, WhatsApp…) não instala apps.",
        hot: "more",
      },
      {
        title: "Escolha “Abrir no navegador”",
        detail: "Ou copie o link abaixo e cole no Safari (iPhone) ou no Chrome (Android).",
        overlay: {
          kind: "menu",
          rows: [
            { label: "Copiar link", icon: "link" },
            { label: "Abrir no navegador", icon: "open_in_browser", hot: true },
            { label: "Compartilhar", icon: "share" },
          ],
        },
      },
      { title: "Toque em “Instalar agora” de novo", detail: "No navegador, a instalação funciona.", bar: "chrome", hot: "install" },
    ],
  },
  manual: {
    title: "Instale pelo menu do navegador",
    bar: "chrome",
    scenes: [
      { title: "Toque em ⋮ (o menu do navegador)", detail: "Fica no canto da barra de endereço.", hot: "more" },
      {
        title: "Escolha “Instalar app” ou “Adicionar à tela inicial”",
        detail: "O nome muda um pouco de navegador para navegador.",
        overlay: {
          kind: "menu",
          rows: [
            { label: "Nova guia", icon: "add" },
            { label: "Histórico", icon: "history" },
            { label: "Compartilhar", icon: "share" },
            { label: "Instalar app", icon: "install_mobile", hot: true },
          ],
        },
      },
      { title: "Confirme", detail: "Toque em “Instalar”.", overlay: { kind: "install" } },
      { title: "Pronto!", detail: "O Habitus aparece na sua tela inicial. Abra por lá, como um app.", overlay: { kind: "home" } },
    ],
  },
};
