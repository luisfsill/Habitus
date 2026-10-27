import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { pinned } from "@/theme";

interface Props {
  /** A bundled video, from require(). */
  source: number;
}

/** Dark fades at the top (behind the text) and the bottom (behind the button); the middle of the video stays clear. */
function Scrims() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#04060E" stopOpacity={0.78} />
          <Stop offset="0.5" stopColor="#04060E" stopOpacity={0.45} />
          <Stop offset="0.68" stopColor="#04060E" stopOpacity={0} />
          <Stop offset="0.8" stopColor="#04060E" stopOpacity={0} />
          <Stop offset="1" stopColor="#04060E" stopOpacity={0.75} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#scrim)" />
    </Svg>
  );
}

/** Full-screen looping video behind a page, muted and without controls. Decorative. */
export function VideoBackdrop({ source }: Props) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
  });
  // After the view has mounted: on the web, play() in the setup above runs before there is a <video> and does nothing.
  useEffect(() => {
    player.play();
  }, [player]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, pinned]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
        playsInline
      />
      <Scrims />
    </View>
  );
}

const styles = StyleSheet.create({
  // Width and height too: on the web this is a bare <video>, which keeps its own size between top/left/right/bottom.
  video: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
});
