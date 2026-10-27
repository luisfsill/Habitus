/**
 * Page backdrop of the "water glass" theme (water-backdrop.web.tsx): the page seen from inside a glass of still
 * water. A gentle depth gradient, slow light shafts from above and drifting caustics, in the same language as the
 * water splash (water-splash-gl.ts) but quiet enough to read text over. The top and bottom edges fade into the
 * flat backdrop colour (`uBase`), which also paints the status bar and the strip the installed iPhone app fills
 * below the page, so there is no seam. Drawn opaque by fullscreen-gl.ts. Web only (WebGL).
 * Optional ripples (`uDrops`: x, y, start time, strength; strength 0 = off) spread from where the mouse touched the
 * water: they bend the caustics and leave a faint bright ring.
 */
export const BACKDROP_FRAG = `precision mediump float;
uniform vec2 uRes;uniform float uDpr;uniform float uT;uniform vec2 uC;uniform float uDark;uniform vec3 uBase;
uniform vec4 uDrops[6];
float caus(vec2 p,float t){vec2 q=p;float c=0.;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.1+t),cos(q.x*1.3-t*.7))*.6;c+=1./(1.+16.*abs(sin(q.x)*sin(q.y)));}return c/3.;}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 float y=clamp(p.y/uRes.y,0.,1.);
 vec2 off=vec2(0.);float ring=0.;
 for(int i=0;i<6;i++){vec4 d=uDrops[i];float age=uT-d.z;if(d.w<=0.||age<0.||age>3.)continue;
  vec2 v=p-d.xy;float r=length(v);float w=r-age*240.;
  float wave=sin(w*.11)*d.w*exp(-age*1.3)*exp(-w*w/1800.);
  off+=v/max(r,1.)*wave*7.;ring+=max(wave,0.);}
 vec2 q=p+off;
 float edge=smoothstep(0.,.1,y)*smoothstep(1.,.9,y);
 // Deeper water in the middle of the screen, back to the flat colour at both edges.
 vec3 deep=mix(vec3(.70,.86,.94),vec3(.01,.12,.22),uDark);
 vec3 c=mix(uBase,deep,.6*sin(3.14159*y));
 // Light shafts slanting down from the surface, swaying slowly.
 float rays=pow(.5+.5*sin(q.x*.009+q.y*.004+sin(uT*.12+q.x*.002)*1.3),8.)*(1.-y)*edge;
 // Caustics: the bright net that sunlight draws through a rippled surface.
 float cs=smoothstep(.5,1.,caus(q*.011+vec2(0.,uT*.015),uT*.22))*edge;
 vec3 glint=mix(vec3(1.),vec3(.45,.8,1.),uDark);
 c+=glint*(rays*mix(.22,.07,uDark)+cs*mix(.3,.11,uDark)+ring*mix(.18,.1,uDark));
 gl_FragColor=vec4(c,1.);
}`;
