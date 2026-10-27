/**
 * Runs one full-screen fragment shader over the page for the celebration scenes (water splash, sun rays...).
 * Every scene gets the same uniforms: uRes (CSS pixels), uDpr, uT (seconds since start), uC (screen centre)
 * and uDark (1 in dark mode). Output is premultiplied alpha. Web only (WebGL).
 */

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
const UNIFORMS = ["uRes", "uDpr", "uT", "uC", "uDark"] as const;

export interface SceneGL {
  gl: WebGLRenderingContext;
  /** The shared uniforms plus any extra ones the scene asked for. */
  u: Record<string, WebGLUniformLocation | null>;
}

function program(gl: WebGLRenderingContext, frag: string): WebGLProgram | null {
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, VERT);
  const fs = shader(gl.FRAGMENT_SHADER, frag);
  const p = gl.createProgram();
  if (!vs || !fs) return null;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}

/** `extra`: names of the scene's own uniforms, which it sets itself before each drawScene. */
export function initSceneGL(canvas: HTMLCanvasElement, frag: string, extra: readonly string[] = []): SceneGL | null {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  const p = gl && program(gl, frag);
  if (!gl || !p) return null;
  gl.useProgram(p);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const u = Object.fromEntries([...UNIFORMS, ...extra].map((n) => [n, gl.getUniformLocation(p, n)]));
  return { gl, u };
}

/** Lower than the screen's density: the scenes are soft and full-screen, so this keeps them smooth on phones. */
export const sceneDpr = () => Math.min(window.devicePixelRatio || 1, 1.25);

/** Draws the scene `t` seconds after it started, on a canvas covering `w`×`h` CSS pixels. */
export function drawScene({ gl, u }: SceneGL, t: number, size: { w: number; h: number; dark: boolean }) {
  const { w, h, dark } = size;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.uniform2f(u.uRes, w, h);
  gl.uniform1f(u.uDpr, sceneDpr());
  gl.uniform1f(u.uT, t);
  gl.uniform2f(u.uC, w / 2, h / 2);
  gl.uniform1f(u.uDark, dark ? 1 : 0);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
