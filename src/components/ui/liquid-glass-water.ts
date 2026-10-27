/**
 * Water for the liquid glass navbar (liquid-glass-navbar.tsx): a WebGL shader drawn only inside the pill, the
 * spring physics of the active drop (it stretches, splits into droplets on long jumps and merges back with a
 * ripple) and a CSS-drop fallback without WebGL. Ported from Nimbus UI "Waterline" by guglielmogiannattasio.it.
 * Web only (DOM and WebGL).
 */

/** Canvas bleed around the pill, for shadows and ripples. */
export const PAD = 14;

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uTime;uniform vec4 uPill;
uniform vec4 uBlob[6];uniform float uSy[6];uniform vec4 uRip[6];uniform vec3 uMouse;uniform float uDark;uniform float uAmb;
float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdCap(vec2 p,vec4 B,float sy){p-=B.xy;p.y/=sy;p.x=max(abs(p.x)-B.z,0.);return(length(p)-B.w)*min(1.,sy);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float dropD(vec2 p){float d=1e4;for(int i=0;i<6;i++){if(uBlob[i].w>.5){d=smin(d,sdCap(p,uBlob[i],uSy[i]),13.);}}return d;}
float pillD(vec2 p){vec2 h=uPill.zw*.5;return sdRB(p-uPill.xy-h,h,h.y);}
float lens(float d,float w){float t=clamp(-d/w,0.,1.);return sqrt(1.-(1.-t)*(1.-t));}
float waves(vec2 p){float w=0.;
 for(int i=0;i<6;i++){vec4 R=uRip[i];if(R.w>0.){float x=length(p-R.xy)-R.z*240.;w+=R.w*exp(-R.z*1.7)*sin(x*.3)*exp(-x*x/700.);}}
 vec2 m=p-uMouse.xy;w+=uMouse.z*3.6*exp(-dot(m,m)/1000.);
 w+=uAmb*(sin(p.x*.05+uTime*1.2)*.45+sin(p.x*.13-uTime*.85+p.y*.2)*.25);return w;}
float H(vec2 p){float dp=pillD(p);return lens(dp,uPill.w*.36)*2.4+lens(dropD(p),11.)*7.5+waves(p)*smoothstep(0.,7.,-dp);}
float caus(vec2 p,float t){vec2 q=p;float c=0.;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.1+t),cos(q.x*1.3-t*.7))*.6;c+=1./(1.+16.*abs(sin(q.x)*sin(q.y)));}return c/3.;}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 float dp=pillD(p);float dd=dropD(p);
 float h0=H(p);vec3 n=normalize(vec3(h0-H(p+vec2(1.,0.)),h0-H(p+vec2(0.,1.)),1.));
 vec3 V=vec3(0.,0.,1.);
 float spec=pow(max(dot(reflect(-normalize(vec3(-.45,-.8,.85)),n),V),0.),70.);
 float spec2=pow(max(dot(reflect(-normalize(vec3(.6,.75,.7)),n),V),0.),22.)*.3;
 float fres=clamp((1.-n.z)*4.,0.,1.);
 vec3 irid=.5+.5*cos(6.2831*(vec3(0.,.33,.67)+fres*.85+p.x*.0028+uTime*.035));
 float pm=smoothstep(1.,-1.,dp);float dm=smoothstep(1.,-1.,dd)*smoothstep(1.,-2.,dp);
 float sh=smoothstep(9.,-9.,dropD(p-vec2(0.,5.)))*(1.-dm)*pm*(.11+.07*uDark);
 vec3 c=vec3(0.,.14,.36)*sh;float a=sh;
 float pa=clamp(pm*(fres*.5+spec*.9+spec2),0.,1.);
 c=mix(vec3(1.),irid,.5*fres)*pa+c*(1.-pa);a=pa+a*(1.-pa);
 float th=lens(dd,11.);
 float cs=caus((p+n.xy*th*18.)*.085,uTime*.9);
 vec3 tint=mix(vec3(.80,.95,1.),vec3(.55,.82,1.),uDark);
 float rim=dm*(1.-smoothstep(0.,8.,-dd));
 float cres=dm*smoothstep(.12,.55,dot(n.xy,normalize(vec2(.55,.85))))*smoothstep(0.,3.,-dd);
 float body=.5+.5*clamp(-n.y*3.,-1.,1.);
 float da=dm*(.26+.14*body)*(1.-.35*uDark);vec3 dc=mix(tint,vec3(1.),body*.6);
 float la=rim*.22;vec3 lc=mix(vec3(0.,.42,.78),vec3(.1,.55,.95),uDark);dc=lc*la+dc*da*(1.-la);da=la+da*(1.-la);
 la=clamp(cres*.7+smoothstep(.6,1.,cs)*.28*th*dm,0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);
 la=clamp(dm*(spec*1.2+spec2*.5),0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);
 la=dm*smoothstep(-2.,0.,dd)*.4;dc=mix(vec3(1.),irid,.35)*la+dc*(1.-la);da=la+da*(1.-la);
 c=dc+c*(1.-da);a=da+a*(1.-da);
 gl_FragColor=vec4(c,a);
}`;

interface Body {
  x: number;
  v: number;
}
interface Sat {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  k: number;
}
interface Rip {
  x: number;
  y: number;
  age: number;
  amp: number;
}
interface GLContext {
  gl: WebGLRenderingContext;
  u: Record<string, WebGLUniformLocation | null>;
}

export function makeWaterState() {
  return {
    a: { x: 0, v: 0 } as Body,
    b: { x: 0, v: 0 } as Body,
    sy: { s: 1, v: 0 },
    lead: 0 as 0 | 1,
    lagFrom: 0,
    sats: [] as Sat[],
    rips: [] as Rip[],
    t: { x: 0, cy: 0, q: 0, r: 21 },
    q: 0,
    mouse: { x: 0, y: 0, s: 0, on: false },
    moving: false,
    split: false,
    ready: false,
    w: 0,
    h: 0,
    visible: true,
    reduce: false,
    dark: 0,
    raf: 0,
    last: 0,
    time: 0,
    glc: null as GLContext | null,
  };
}

export type WaterState = ReturnType<typeof makeWaterState>;

export function initGL(canvas: HTMLCanvasElement): GLContext | null {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, VERT);
  const fs = shader(gl.FRAGMENT_SHADER, FRAG);
  const p = gl.createProgram();
  if (!vs || !fs) return null;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
  gl.useProgram(p);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u: GLContext["u"] = {};
  for (const n of ["uRes", "uDpr", "uTime", "uPill", "uBlob", "uSy", "uRip", "uMouse", "uDark", "uAmb"]) u[n] = gl.getUniformLocation(p, n);
  return { gl, u };
}

/** SVG displacement inside backdrop-filter: Chromium only. */
export function supportsRefraction(): boolean {
  if (typeof CSS === "undefined") return false;
  const ua = navigator.userAgent;
  return /Chrome\/|Chromium\/|Edg\//.test(ua) && !/Firefox\//.test(ua) && CSS.supports("backdrop-filter", "url(#a)");
}

const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

/** Points the drop at the active item (centre and size, in canvas coordinates) and sizes the canvas. */
export function aimWater(s: WaterState, nav: HTMLElement, el: HTMLElement, canvas: HTMLCanvasElement | null) {
  const T = s.t;
  s.w = nav.offsetWidth;
  s.h = nav.offsetHeight;
  T.r = el.offsetHeight / 2;
  T.q = Math.max(0, el.offsetWidth / 2 - T.r);
  T.cy = PAD + el.offsetTop + el.offsetHeight / 2;
  const nx = PAD + el.offsetLeft + el.offsetWidth / 2;
  if (!s.ready) {
    s.a.x = s.b.x = nx;
    s.q = T.q;
    s.ready = true;
  } else if (Math.abs(nx - T.x) > 0.5) {
    s.lead = Math.abs(nx - s.a.x) <= Math.abs(nx - s.b.x) ? 0 : 1;
    s.lagFrom = performance.now() + 70;
    s.moving = true;
    s.split = false;
  }
  T.x = nx;
  const W = Math.round((s.w + PAD * 2) * dpr());
  const H = Math.round((s.h + PAD * 2) * dpr());
  if (!canvas || (canvas.width === W && canvas.height === H)) return;
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = `${s.w + PAD * 2}px`;
  canvas.style.height = `${s.h + PAD * 2}px`;
}

function drawGL({ gl: g, u }: GLContext, s: WaterState, thin: number) {
  g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight);
  g.uniform2f(u.uRes, s.w + PAD * 2, s.h + PAD * 2);
  g.uniform1f(u.uDpr, dpr());
  g.uniform1f(u.uTime, s.time);
  g.uniform4f(u.uPill, PAD, PAD, s.w, s.h);
  setBlobs(g, u, s, thin);
  const rips = new Float32Array(24);
  s.rips.slice(-6).forEach((p, i) => rips.set([p.x, p.y, p.age, p.amp], i * 4));
  g.uniform4fv(u.uRip, rips);
  g.uniform3f(u.uMouse, s.mouse.x, s.mouse.y, s.mouse.s);
  g.uniform1f(u.uDark, s.dark);
  g.uniform1f(u.uAmb, s.reduce ? 0 : 1);
  g.clearColor(0, 0, 0, 0);
  g.clear(g.COLOR_BUFFER_BIT);
  g.drawArrays(g.TRIANGLES, 0, 3);
}

/** Head, tail and up to four droplets, as capsules for the shader. */
function setBlobs(g: WebGLRenderingContext, u: GLContext["u"], s: WaterState, thin: number) {
  const T = s.t;
  const blobs = new Float32Array(24);
  const sy = new Float32Array(6).fill(1);
  const head = s.lead === 0 ? s.a : s.b;
  const tail = s.lead === 0 ? s.b : s.a;
  blobs.set([head.x, T.cy, s.q * (1 - 0.25 * thin), T.r * (1 - 0.12 * thin), tail.x, T.cy, s.q * (1 - 0.8 * thin), T.r * (1 - 0.5 * thin)], 0);
  sy[0] = sy[1] = s.sy.s;
  s.sats.slice(0, 4).forEach((d, i) => blobs.set([d.x, d.y, 0, d.r], 8 + i * 4));
  g.uniform4fv(u.uBlob, blobs);
  g.uniform1fv(u.uSy, sy);
}

/** One frame: the shader, or the CSS drop when WebGL is off. */
export function drawWater(s: WaterState, drop: HTMLSpanElement | null) {
  const T = s.t;
  const sep = Math.abs(s.a.x - s.b.x);
  const thin = Math.min(sep / (2 * (s.q + T.r) || 1), 1);
  if (s.glc) {
    drawGL(s.glc, s, thin);
    return;
  }
  if (!drop) return;
  const r = T.r * (1 - 0.3 * thin);
  drop.style.width = `${sep + 2 * (s.q + r)}px`;
  drop.style.transform = `translateX(${Math.min(s.a.x, s.b.x) - s.q - r - PAD}px) scaleY(${s.sy.s})`;
}

/** Head and tail springs toward the target; returns false while they still move. */
function stepBodies(s: WaterState, dt: number, now: number): boolean {
  const T = s.t;
  let still = true;
  [s.a, s.b].forEach((B, i) => {
    const lead = i === s.lead;
    const k = lead ? 210 : 72;
    const c = lead ? 25 : 13;
    const f = !lead && now < s.lagFrom ? 0.08 : 1;
    B.v += (k * (T.x - B.x) - c * B.v) * dt * f;
    B.x += B.v * dt;
    const lo = PAD + 6 + s.q + T.r - 3;
    const hi = PAD + s.w - 6 - s.q - T.r + 3;
    if (B.x < lo || B.x > hi) {
      s.sy.v -= Math.min(Math.abs(B.v), 900) * 0.0016;
      B.x = Math.max(lo, Math.min(hi, B.x));
      B.v *= -0.25;
    }
    if (Math.abs(T.x - B.x) > 0.3 || Math.abs(B.v) > 3) still = false;
  });
  const L = s.lead === 0 ? s.a : s.b;
  const syT = 1 - 0.2 * Math.min(Math.abs(L.v) / 1500, 1);
  s.sy.v += (280 * (syT - s.sy.s) - 9 * s.sy.v) * dt;
  s.sy.s += s.sy.v * dt;
  return still && Math.abs(s.sy.s - 1) <= 0.002 && Math.abs(s.sy.v) <= 0.02;
}

/** Breaks the neck into droplets on a long jump, then pulls them home; returns false while any is left. */
function stepDroplets(s: WaterState, dt: number): boolean {
  const T = s.t;
  const sep = Math.abs(s.a.x - s.b.x);
  const r = T.r * (1 - 0.3 * Math.min(sep / (2 * (T.q + T.r) || 1), 1));
  if (!s.split && s.moving && sep - 2 * T.q - 2 * r > -6) {
    s.split = true;
    const lo = s.lead === 0 ? s.b : s.a;
    const hi = s.lead === 0 ? s.a : s.b;
    [0.3, 0.5, 0.72].forEach((t, j) => {
      s.sats.push({
        x: lo.x + (hi.x - lo.x) * t + (Math.random() - 0.5) * 6,
        y: T.cy + (Math.random() - 0.5) * 10,
        vx: (lo.v + hi.v) * 0.45,
        vy: (Math.random() - 0.5) * 60,
        r: 5 + Math.random() * 3 - j * 0.5,
        k: 70 + Math.random() * 90,
      });
    });
  }
  s.sats = s.sats.filter((d) => {
    d.vx += (d.k * (T.x - d.x) - 9 * d.vx) * dt;
    d.vy += (90 * (T.cy - d.y) - 7 * d.vy) * dt;
    d.x = Math.max(PAD + 8 + d.r, Math.min(PAD + s.w - 8 - d.r, d.x + d.vx * dt));
    d.y = Math.max(T.cy - T.r + d.r, Math.min(T.cy + T.r - d.r, d.y + d.vy * dt));
    if (Math.abs(T.x - d.x) < T.q + T.r * 0.5) d.r -= dt * 26;
    return d.r > 0.6;
  });
  return s.sats.length === 0;
}

/** Advances the physics by `dt` seconds. */
export function stepWater(s: WaterState, dt: number, now: number) {
  const T = s.t;
  s.time += dt;
  s.q += (T.q - s.q) * Math.min(1, dt * 12);
  let still = true;
  if (s.reduce) {
    s.a.x = s.b.x = T.x;
    s.a.v = s.b.v = 0;
    s.sy.s = 1;
    s.sats = [];
  } else {
    const bodiesStill = stepBodies(s, dt, now);
    still = stepDroplets(s, dt) && bodiesStill;
  }
  if (s.moving && still) {
    s.moving = false;
    if (s.split || !s.reduce) s.rips.push({ x: T.x, y: T.cy, age: 0, amp: s.split ? 1.2 : 0.7 });
  }
  s.rips.forEach((p) => (p.age += dt));
  s.rips = s.rips.filter((p) => p.age < 2.4);
  s.mouse.s += ((s.mouse.on ? 1 : 0) - s.mouse.s) * Math.min(1, dt * 7);
}
