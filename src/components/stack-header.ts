import { useColumnGutter, useTheme } from "@/theme";

/**
 * Options for a transparent stack header with a back button or text actions (Cancelar, Salvar).
 * On wide screens the buttons sit at the edges of the app column, next to the content, not at the window's edges.
 */
export function useStackHeader(backTitle: string) {
  const { colors } = useTheme();
  const gutter = useColumnGutter();
  return {
    headerShown: true,
    headerTitle: "",
    headerBackTitle: backTitle,
    headerTransparent: true,
    headerTintColor: colors.accent,
    // Read by the JS header on the web; the native header lays out its own buttons.
    headerLeftContainerStyle: { paddingLeft: gutter },
    headerRightContainerStyle: { paddingRight: gutter },
  };
}
