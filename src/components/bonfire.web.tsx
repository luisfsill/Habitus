import { Asset } from "expo-asset";
import { useEffect, useRef } from "react";

import { BONFIRE_FRAG, BONFIRE_UNIFORMS } from "./ui/bonfire-gl";
import { drawScene, initSceneGL, sceneDpr } from "./ui/fullscreen-gl";

export interface FireInput {
  /** 0…1, how hard someone is blowing right now. */
  blow: number;
  /** Phone tilt in radians, positive to the right. */
  tilt: number;
}

interface Props {
  /** The campfire video, from require(). */
  source: number;
  /** Read every frame, so blowing and tilting never re-render the page. */
  input: { current: FireInput };
  /** True once the fire should go out (it then smokes and stays out). */
  out: boolean;
  /** False while the intro is read: the video holds its first frame. */
  playing: boolean;
}

/**
 * The looping video that feeds the WebGL texture. It is downloaded whole first (streamed, playback can catch up
 * with the download and pause until more arrives), and sits in the page (invisible, 1 px): a video outside the
 * document can be treated as background and decoded in fits and starts.
 */
function fireVideo(source: number): { video: HTMLVideoElement; release: () => void } {
  const video = document.createElement("video");
  const uri = Asset.fromModule(source).uri;
  let blobUrl = "";
  void fetch(uri)
    .then((response) => response.blob())
    .then((blob) => {
      blobUrl = URL.createObjectURL(blob);
      video.src = blobUrl;
    })
    .catch(() => (video.src = uri));
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("aria-hidden", "true");
  Object.assign(video.style, { position: "fixed", left: "0", top: "0", width: "1px", height: "1px", opacity: "0", pointerEvents: "none" });
  document.body.appendChild(video);
  const release = () => {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  };
  return { video, release };
}

interface FrameVideo {
  requestVideoFrameCallback?: (cb: () => void) => number;
}

/**
 * Copies a video frame into the texture only when the video has a new one (browsers with
 * requestVideoFrameCallback; others copy each screen frame), allocating the texture once and refilling it after.
 * Copying and reallocating on every screen frame stalls the video decoder on phones.
 */
function frameUploader(gl: WebGLRenderingContext, video: HTMLVideoElement) {
  const rvfc = (video as unknown as FrameVideo).requestVideoFrameCallback?.bind(video);
  let fresh = true;
  let size = "";
  if (rvfc) {
    const onFrame = () => {
      fresh = true;
      rvfc(onFrame);
    };
    rvfc(onFrame);
  }
  return () => {
    if (video.readyState < 2 || (rvfc && !fresh)) return;
    fresh = false;
    const now = `${video.videoWidth}x${video.videoHeight}`;
    if (now !== size) {
      size = now;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGB, gl.UNSIGNED_BYTE, video);
  };
}

/** The texture each video frame is copied into. Video sizes are not powers of two: no mipmaps, no repeat. */
function videoTexture(gl: WebGLRenderingContext) {
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

/** Keeps the canvas at the window size. */
function fit(cv: HTMLCanvasElement) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = sceneDpr();
  if (cv.width !== Math.round(w * dpr)) cv.width = Math.round(w * dpr);
  if (cv.height !== Math.round(h * dpr)) cv.height = Math.round(h * dpr);
  return { w, h };
}

/** What the flames are doing, eased frame by frame. */
function makeMotion() {
  // clock: scene time, only running while playing (a paused video with moving turbulence over it looks like it
  // trembles). tilt/swing: a damped spring, so the flames overshoot a little and settle upright.
  return { clock: 0, blow: 0, tilt: 0, swing: 0, fade: 0, outAt: 0 };
}

function stepMotion(m: ReturnType<typeof makeMotion>, f: FireInput & { dt: number; now: number; playing: boolean; out: boolean }) {
  if (f.playing) {
    m.clock += f.dt;
    m.blow += (f.blow - m.blow) * Math.min(1, f.dt * (f.blow > m.blow ? 12 : 3));
    m.swing += ((f.tilt - m.tilt) * 40 - m.swing * 6) * f.dt;
    m.tilt += m.swing * f.dt;
  } else {
    // Held still and upright, deaf to the microphone; once it runs, the spring eases the flames into the tilt.
    m.blow = 0;
    m.tilt = 0;
    m.swing = 0;
  }
  if (f.out && !m.outAt) m.outAt = f.now;
  m.fade = Math.max(0, Math.min(1, m.fade + (f.out ? f.dt * 1.5 : -f.dt * 3)));
}

/**
 * Web: the full-screen bonfire behind the Foco total page (ui/bonfire-gl.ts). The flames ease toward the blow and
 * swing back after a tilt. Without WebGL the canvas stays empty. Decorative.
 */
export function Bonfire({ source, input, out, playing }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const outRef = useRef(out);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playingRef = useRef(playing);
  useEffect(() => {
    outRef.current = out;
  }, [out]);
  useEffect(() => {
    const video = videoRef.current;
    playingRef.current = playing;
    if (!video) return;
    if (playing) void video.play().catch(() => undefined);
    else video.pause();
  }, [playing]);

  useEffect(() => {
    const cv = canvas.current;
    const glc = cv && initSceneGL(cv, BONFIRE_FRAG, BONFIRE_UNIFORMS);
    if (!cv || !glc) return;
    const { gl, u } = glc;
    const { video, release } = fireVideo(source);
    videoRef.current = video;
    // Starts as soon as the download lands, if Iniciar was already tapped.
    video.addEventListener("loadeddata", () => {
      if (playingRef.current) void video.play().catch(() => undefined);
    });
    videoTexture(gl);
    gl.uniform1i(u.uVideo, 0);
    const upload = frameUploader(gl, video);

    const motion = makeMotion();
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const { w, h } = fit(cv);
      upload();
      stepMotion(motion, { ...input.current, dt, now, playing: playingRef.current, out: outRef.current });
      gl.uniform2f(u.uVid, video.videoWidth || 480, video.videoHeight || 854);
      gl.uniform1f(u.uBlow, outRef.current ? 0 : motion.blow);
      gl.uniform1f(u.uTilt, motion.tilt);
      gl.uniform1f(u.uOut, motion.fade);
      gl.uniform1f(u.uSmoke, motion.outAt ? (now - motion.outAt) / 1000 : 0);
      drawScene(glc, motion.clock, { w, h, dark: true });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      release();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [source, input]);

  return <canvas ref={canvas} aria-hidden="true" style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none" }} />;
}
