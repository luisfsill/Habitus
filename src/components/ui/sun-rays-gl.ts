/**
 * Full-screen "raio de sol" for finishing tip 1 (Sorria): warm light pours in from the top-right corner, sun rays
 * turn slowly through the page, a few lens-flare ghosts cross the screen and dust motes sparkle inside the beams,
 * then it all fades. Drawn by fullscreen-gl.ts. Web only (WebGL).
 */

/** Seconds the whole scene lasts. */
export const SUN_S = 3.4;

export const SUN_FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uT;uniform vec2 uC;uniform float uDark;
const float END=${SUN_S.toFixed(2)};
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
// Soft disc for the lens-flare ghosts.
float ghost(vec2 p,vec2 c,float r){return smoothstep(r,r*.55,length(p-c));}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 float diag=length(uRes);
 // Comes in over half a second, holds, fades over the last second.
 float k=smoothstep(0.,.55,uT)*(1.-smoothstep(END-1.,END,uT));
 vec2 S=vec2(uRes.x*.92,-uRes.y*.06);
 vec2 v=p-S;float d=length(v);float ang=atan(v.y,v.x);
 float fall=exp(-d/(diag*.55));
 // Rays: two sets of beams at different widths, turning slowly and breathing.
 float r1=pow(.5+.5*sin(ang*22.+uT*.35+sin(ang*5.-uT*.6)*1.2),5.);
 float r2=pow(.5+.5*sin(ang*41.-uT*.5+1.7),9.)*.6;
 float rays=(r1+r2)*fall*smoothstep(0.,diag*.08,d);
 // The sun itself, just off screen, with a warm bloom.
 float bloom=exp(-d/(diag*.12))*1.1+exp(-d/(diag*.35))*.35;
 // Lens-flare ghosts along the line from the sun through the centre.
 vec2 axis=uC-S;float fl=0.;vec3 flc=vec3(0.);
 for(int i=0;i<4;i++){float fi=float(i);float at=.55+fi*.38;float r=diag*(.03+.02*hash(vec2(fi,2.)));
  float g=ghost(p,S+axis*at,r)*(.16-fi*.025);fl+=g;flc+=g*mix(vec3(1.,.75,.4),vec3(.7,.85,1.),fi/3.);}
 // Dust motes drifting down and sideways, bright only where a beam lights them.
 vec2 g=p+vec2(uT*9.,-uT*14.);vec2 cell=floor(g/38.);vec2 f=fract(g/38.)-.5;
 float hh=hash(cell);vec2 off=vec2(hash(cell+1.),hash(cell+2.))-.5;
 float mote=smoothstep(.08,0.,length(f-off*.6))*step(.55,hh)*(.6+.4*sin(uT*4.+hh*30.));
 mote*=(.25+r1*1.6)*fall*1.4;
 vec3 warm=mix(vec3(1.,.78,.42),vec3(1.,.85,.55),uDark);
 vec3 c=warm*(rays*.55+bloom)+flc+vec3(1.,.95,.85)*mote;
 float a=clamp(rays*.38+bloom*.7+fl+mote*.9+.06*fall,0.,1.);
 // A faint warm wash over the page, strongest near the sun.
 c+=warm*.05;a=max(a,.05*(1.-p.y/uRes.y));
 a*=k;
 gl_FragColor=vec4(min(c,vec3(1.))*a,a);
}`;
