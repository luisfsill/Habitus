import { useEffect } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";

/** A large phone's width: inside the frame the app lays out exactly as on a phone. */
const FRAME_WIDTH = 430;

/** The whole app in a phone-width column in the middle of a computer's window (web only). */
export function DesktopFrame({ src }: { src: string }) {
  const dark = useColorScheme() === "dark";
  useEffect(() => {
    // The frame scrolls itself; the window around it stays put.
    document.documentElement.style.overflow = "hidden";
  }, []);
  return (
    <View style={[styles.page, { backgroundColor: dark ? "#020C17" : "#C3DCEA" }]}>
      <iframe
        src={src}
        title="Habitus"
        data-frame=""
        // The fire tip listens to the microphone; sounds play from the frame.
        allow="microphone; autoplay"
        style={{ width: FRAME_WIDTH, height: "100vh", border: "none", display: "block", boxShadow: "0 0 48px rgba(0,0,0,0.35)" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center" },
});
