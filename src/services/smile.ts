import { log, quietLibraryStatus } from "./log";

// Sorria: the front camera and MediaPipe's face landmarker tell how much the person is smiling, on the device. No
// frame is stored or sent; only the library and its face model are downloaded (jsDelivr and Google's storage).
// Loaded at runtime instead of bundled: Metro does not handle the library's WebAssembly files.

const VERSION = "1.1.0";
const LIBRARY = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/vision_bundle.mjs`;
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

interface Category {
  categoryName: string;
  score: number;
}

interface Landmarker {
  detectForVideo: (video: HTMLVideoElement, timestamp: number) => { faceBlendshapes: { categories: Category[] }[] };
  close: () => void;
}

interface Vision {
  FilesetResolver: { forVisionTasks: (path: string) => Promise<unknown> };
  FaceLandmarker: {
    createFromOptions: (fileset: unknown, options: Record<string, unknown>) => Promise<Landmarker>;
  };
}

/** The camera can watch for a smile here: the web, with a camera API and a connection to fetch the model. */
export function canSeeSmiles(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof document !== "undefined" && navigator.onLine;
}

// A URL import Metro must not try to bundle.
const importUrl = new Function("url", "return import(url)") as (url: string) => Promise<Vision>;

/** How much the face is smiling (0…1): the stronger side of the mouth's smile. */
function smileScore(categories: Category[]): number {
  const side = (name: string) => categories.find((c) => c.categoryName === name)?.score ?? 0;
  return Math.max(side("mouthSmileLeft"), side("mouthSmileRight"));
}

/**
 * Calls `onScore` about 10 times a second with how much the person is smiling (0 when no face is seen). `onFail` is
 * called once if the camera or the model cannot be used (denied, offline). Call it from a tap.
 */
export function watchSmile(onScore: (score: number) => void, onFail: () => void): () => void {
  quietLibraryStatus();
  let stopped = false;
  let cleanup: () => void = () => undefined;
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  // iOS only plays a camera stream in a video that is on the page; it stays out of sight.
  Object.assign(video.style, { position: "fixed", width: "1px", height: "1px", opacity: "0", pointerEvents: "none" });
  document.body.appendChild(video);
  const camera = navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 }, audio: false });
  void Promise.all([camera, importUrl(LIBRARY)])
    .then(async ([stream, vision]) => {
      const stopStream = () => stream.getTracks().forEach((t) => t.stop());
      if (stopped) return stopStream();
      video.srcObject = stream;
      await video.play();
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
      const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
      });
      if (stopped) {
        landmarker.close();
        return stopStream();
      }
      const id = setInterval(() => {
        if (video.readyState < 2) return;
        const face = landmarker.detectForVideo(video, performance.now()).faceBlendshapes[0];
        onScore(face ? smileScore(face.categories) : 0);
      }, 100);
      cleanup = () => {
        clearInterval(id);
        landmarker.close();
        stopStream();
      };
    })
    .catch((error: unknown) => {
      log.warn("no camera for the smile", error);
      if (!stopped) onFail();
    });
  return () => {
    stopped = true;
    cleanup();
    video.remove();
  };
}
