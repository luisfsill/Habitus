import { VideoBackdrop } from "./video-backdrop";

export interface FireInput {
  blow: number;
  tilt: number;
}

interface Props {
  source: number;
  input: { current: FireInput };
  out: boolean;
  playing: boolean;
}

/** Native: the campfire video plays as is (the web bends it live with WebGL). */
export function Bonfire({ source }: Props) {
  return <VideoBackdrop source={source} />;
}
