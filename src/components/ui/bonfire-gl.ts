/**
 * The bonfire of the Foco total screen (bonfire.web.tsx): a real campfire video drawn into WebGL and bent live.
 * Blowing (uBlow, 0…1) never moves the picture: the flame tips tear apart and go out, what is left flickers, and
 * the base burns brighter; tilting the phone (uTilt, radians, eased by
 * the caller) only nudges the tips; putting it out (uOut, 0 lit … 1 out) dims the flames to
 * glowing embers while smoke rises (uSmoke: seconds since). The video has a black sky, so bending it leaves the
 * background as it was. Drawn by fullscreen-gl.ts. Web only (WebGL).
 */
export const BONFIRE_UNIFORMS = ["uVideo", "uVid", "uBlow", "uTilt", "uOut", "uSmoke"] as const;

export const BONFIRE_FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uT;uniform vec2 uC;uniform float uDark;
uniform sampler2D uVideo;uniform vec2 uVid;
uniform float uBlow;uniform float uTilt;uniform float uOut;uniform float uSmoke;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n2(p);p=p*2.1+3.7;a*=.5;}return v;}
// Where the logs are in the video (0 top, 1 bottom): flames rise above this line.
const float BASE=.74;
vec3 tex(vec2 uv){if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)return vec3(0.);return texture2D(uVideo,uv).rgb;}
void main(){
 vec2 px=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 // Cover the screen, keeping the bottom of the video (the fire) on screen.
 float s=max(uRes.x/uVid.x,uRes.y/uVid.y);vec2 size=uVid*s;
 vec2 uv=(px-vec2((uRes.x-size.x)*.5,uRes.y-size.y))/size;
 float t=uT;
 // How far up the flames this point is: 0 at the logs, 1 at the tips.
 float h=clamp((BASE-uv.y)/.6,0.,1.);
 float lit=1.-uOut;
 float b=uBlow*lit;
 // No rigid lean: the tilt only nudges the tips, the base stays on the logs.
 float tiltLean=-uTilt*.12*h*h;
 // Blowing never moves the picture (that reads as a shaken photo): it acts on the fire itself. Only a faint shimmer,
 // like heat, wavers the flames; the real change is in how much of each flame is still burning.
 vec2 flow=vec2(uv.x*14.,uv.y*9.+t*6.);
 vec2 w=uv+vec2((fbm(flow)-.5)*.004*b*h+tiltLean,0.)*lit;
 vec3 c=tex(w);
 // The tongues tear apart and the tips go out: gaps rise fast through the flames, more of them higher up and the
 // harder the blow, so the fire looks lower and ragged without being squashed.
 float rip=fbm(vec2(uv.x*9.,uv.y*6.+t*(4.+8.*b)));
 float keep=smoothstep(h*1.15*b-.05,h*1.15*b+.25,rip+.15);
 c*=mix(1.,keep,b*smoothstep(.05,.5,h));
 // What is left flickers: quick dips in brightness, like flames fighting the wind.
 c*=1.-.35*b*h*n2(vec2(uv.x*6.,t*14.));
 // Fresh air makes the base burn brighter and a little whiter.
 float base=smoothstep(.45,0.,h)*smoothstep(BASE+.12,BASE-.02,uv.y);
 c+=c*vec3(.55,.42,.2)*b*base*(.8+.4*n2(vec2(uv.x*30.,t*9.)));
 // Going out: flames fade away above the logs, the logs keep a dull red glow that slowly cools.
 float above=smoothstep(BASE+.02,BASE-.05,uv.y);
 vec3 ember=c*vec3(1.,.35,.12)*(.55+.25*n2(vec2(uv.x*40.,t*2.)))*exp(-uSmoke*.25);
 c=mix(c,mix(ember,vec3(0.),above),uOut);
 // Smoke: grey wisps rising from the fire once it is out.
 if(uOut>.01){float rise=clamp((BASE-uv.y)/.7,0.,1.);
  float sx=uv.x-.5-sin(rise*7.-uSmoke*1.5)*.05*rise-(fbm(vec2(uv.x*4.,rise*3.-uSmoke*.6))-.5)*.25*rise;
  float sm=smoothstep(.12+rise*.2,0.,abs(sx))*smoothstep(0.,.08,rise)*smoothstep(1.,.3,rise);
  sm*=fbm(vec2(uv.x*6.,uv.y*5.+uSmoke*.8))*exp(-uSmoke*.3)*smoothstep(0.,.6,uSmoke);
  c=mix(c,vec3(.42,.42,.45),clamp(sm*.8,0.,.6)*uOut);}
 gl_FragColor=vec4(c,1.);
}`;
