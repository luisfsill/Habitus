/**
 * Page backdrop of the "water glass" theme (water-backdrop.web.tsx): the page seen from under the sea. A gentle depth
 * gradient, sun shafts fanning down from above (each one brightens and fades on its own) and drifting caustics, in
 * the same language as the water splash (water-splash-gl.ts) but quiet enough to read text over. The top and bottom
 * edges fade into the flat backdrop colour (`uBase`), which also paints the status bar and the strip the installed
 * iPhone app fills below the page, so there is no seam. Drawn opaque by fullscreen-gl.ts. Web only (WebGL).
 * Optional ripples (`uDrops`: x, y, start time, strength; strength 0 = off) spread from where the mouse touched the
 * water: they bend the caustics and leave a faint bright ring.
 * A shark (`uShark`) is a soft silhouette in the depth, moved by sea-life.ts: x, y, length signed by direction
 * (0 = none) and w = depth step (0 near to 9 far) × 10 + tail beat phase (0 to 2π).
 */
export const BACKDROP_FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;uniform float uDpr;uniform float uT;uniform vec2 uC;uniform float uDark;uniform vec3 uBase;
uniform vec4 uDrops[6];uniform vec4 uShark;
float caus(vec2 p,float t){vec2 q=p;float c=0.;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.1+t),cos(q.x*1.3-t*.7))*.6;c+=1./(1.+16.*abs(sin(q.x)*sin(q.y)));}return c/3.;}
float h1(float n){return fract(sin(n*127.1)*43758.5453);}
float n1(float x){float i=floor(x);float f=fract(x);return mix(h1(i),h1(i+1.),f*f*(3.-2.*f));}
float tri(vec2 p,vec2 p0,vec2 p1,vec2 p2){
 vec2 e0=p1-p0,e1=p2-p1,e2=p0-p2,v0=p-p0,v1=p-p1,v2=p-p2;
 vec2 a=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.),b=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.),c=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);
 float s=sign(e0.x*e2.y-e0.y*e2.x);
 vec2 d=min(min(vec2(dot(a,a),s*(v0.x*e0.y-v0.y*e0.x)),vec2(dot(b,b),s*(v1.x*e1.y-v1.y*e1.x))),vec2(dot(c,c),s*(v2.x*e2.y-v2.y*e2.x)));
 return -sqrt(d.x)*sign(d.y);}
// Distance to a shark swimming towards +x, in units of its length: long body, swept dorsal and pectoral fins, tail
// with a bigger upper lobe; the tail sways with the beat phase.
float shark(vec2 q,float ph){
 q.y+=sin(q.x*4.-ph)*.03*(1.-smoothstep(-.5,.2,q.x));
 float s=clamp((q.x+.45)/.95,0.,1.);
 float d=max(abs(q.y)-.22*pow(s,1.3)*pow(1.-s,.45),abs(q.x-.025)-.475);
 d=min(d,tri(q,vec2(.13,-.05),vec2(-.03,-.2),vec2(0.,-.05)));
 d=min(d,tri(q,vec2(.22,.04),vec2(.05,.16),vec2(.12,.04)));
 d=min(d,tri(q,vec2(-.38,-.01),vec2(-.6,-.19),vec2(-.47,.01)));
 return min(d,tri(q,vec2(-.4,0.),vec2(-.54,.11),vec2(-.46,0.)));}
// Coverage of the shark (x, y, signed length, depth/phase), fainter and blurrier the deeper it swims.
float swimmer(vec2 p,vec4 f,float blur,float near,float far){
 float L=abs(f.z);vec2 l=(p-f.xy)/L;l.x*=sign(f.z);
 if(f.z==0.||dot(l,l)>.5)return 0.;
 float dep=floor(f.w/10.)/9.;float w=blur*(1.+dep*3.)/L;float ph=mod(f.w,10.);
 return (1.-smoothstep(-w,w,shark(l,ph)))*mix(near,far,dep);}
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
 // The odd shark, a dark shape against the lit water above it.
 float sil=swimmer(q,uShark,1.6,.42,.16)*edge;
 c=mix(c,mix(vec3(.2,.4,.52),vec3(0.,.03,.07),uDark),sil);
 // Sun shafts fanning down from a sun above the screen that drifts slowly from side to side.
 vec2 sd=q-vec2(uRes.x*(.5+.3*sin(uT*.011)),-uRes.y*.6);
 float a=atan(sd.x,sd.y);
 float sh=n1(a*11.+uT*.04)*n1(a*27.-uT*.07+5.)*n1(a*5.3+uT*.023+9.);
 float rays=pow(sh,1.5)*2.2*(.85+.15*sin(a*70.+uT*1.1))*pow(1.-y,1.3)*edge;
 // Caustics: the bright net that sunlight draws through a rippled surface.
 float cs=smoothstep(.5,1.,caus(q*.011+vec2(0.,uT*.015),uT*.22))*edge*(1.-sil);
 vec3 glint=mix(vec3(1.),vec3(.45,.8,1.),uDark);
 c+=glint*(rays*mix(.24,.1,uDark)+cs*mix(.3,.11,uDark)+ring*mix(.18,.1,uDark));
 gl_FragColor=vec4(c,1.);
}`;
