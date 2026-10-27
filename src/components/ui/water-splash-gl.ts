/**
 * Full-screen water splash for the "+1 copo" button (water-splash.web.tsx): a drop falls to the middle of the
 * screen, hits a thin film of water and sends real ripples out (a height field lit like the navbar's water, see
 * liquid-glass-water.ts: specular highlights, fresnel rim and caustics). A smaller droplet bounces up and lands
 * again. As the waves spread, the screen turns into the inside of a glass of water: deep blue with light rays,
 * caustics and bubbles rising (some from the impact point), until it all fades. Drawn by fullscreen-gl.ts. Web only (WebGL).
 */

/** Seconds from the tap until the drop touches the water. */
export const FALL_S = 0.42;
/** Seconds the whole splash lasts. */
export const SPLASH_S = 4.2;

export const WATER_FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uT;uniform vec2 uC;uniform float uDark;
const float FALL=${FALL_S.toFixed(2)};const float END=${SPLASH_S.toFixed(2)};
// Expanding wave packets from an impact at time t0: a few crests under a travelling envelope, damped as they spread.
float ring(float d,float t,float amp){if(t<=0.)return 0.;float r=t*430.;float x=d-r;
 return amp*exp(-t*1.25)*sin(x*.085-t*6.)*exp(-x*x/(5200.+t*9000.))*(1./(1.+d*.004));}
// The bounced droplet: up and back down in 0.36 s after the first impact.
float bounceY(float t){float s=t-FALL-.05;if(s<0.||s>.36)return -1.;float k=s/.36;return 52.*4.*k*(1.-k);}
float H(vec2 p){float d=length(p-uC);float t=uT-FALL;
 float h=ring(d,t,9.)+ring(d,t-.13,5.)+ring(d,t-.27,2.6);
 h+=ring(d,uT-FALL-.46,3.5);
 // Crater then a small mound right at the impact point.
 if(t>0.)h+=-10.*exp(-d*d/260.)*exp(-t*7.)*cos(t*16.);
 return h;}
float dropD(vec2 p,out float r){
 r=13.;vec2 c;
 if(uT<FALL){float k=uT/FALL;c=vec2(uC.x,mix(-40.,uC.y,k*k));float st=1.+k*.55;vec2 q=p-c;q.y/=st;
  // Teardrop: a circle with a narrowing tail above it.
  q.y+=max(-q.y,0.)*.35;return length(q)-r;}
 float b=bounceY(uT);if(b<0.)return 1e4;r=6.;c=vec2(uC.x,uC.y-b);return length(p-c)-r;}
float lens(float d,float w){float t=clamp(-d/w,0.,1.);return sqrt(1.-(1.-t)*(1.-t));}
float dropH(vec2 p){float r;float d=dropD(p,r);return lens(d,r)*r*.9;}
float caus(vec2 p,float t){vec2 q=p;float c=0.;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.1+t),cos(q.x*1.3-t*.7))*.6;c+=1./(1.+16.*abs(sin(q.x)*sin(q.y)));}return c/3.;}
float hash(float n){return fract(sin(n)*43758.5453);}
// One bubble: a thin bright rim, a faint body and a highlight up and to the left. x = colour weight, y = alpha.
vec2 bubble(vec2 p,vec2 c,float r){float d=length(p-c);if(d>r+2.)return vec2(0.);
 float rim=smoothstep(r+1.,r,d)*smoothstep(r-2.4,r-.6,d);float body=smoothstep(r,r-1.,d)*.1;
 float hl=smoothstep(r*.32,0.,length(p-c+vec2(r*.35,r*.4)));return vec2(rim*.9+hl,rim*.75+body+hl*.9);}
// Bubbles rising through the whole screen in three depths, plus a stream from the impact point.
vec2 bubbles(vec2 p,float t){vec2 acc=vec2(0.);
 for(int L=0;L<3;L++){float fl=float(L);float cw=46.+fl*38.;float id=floor(p.x/cw);
  for(int k=0;k<2;k++){float sd=id*7.13+fl*31.7+float(k)*3.1;float r=2.5+fl*2.6+hash(sd)*2.5*(fl+1.);
   float sp=70.+hash(sd+1.)*60.+fl*35.;float span=uRes.y+r*4.;
   float y=uRes.y+r*2.-mod(hash(sd+2.)*span+t*sp,span);
   float x=(id+.2+.6*hash(sd+3.))*cw+sin(t*(2.+hash(sd+4.)*2.)+sd)*(3.+fl*2.);
   acc=max(acc,bubble(p,vec2(x,y),r)*(.55+fl*.2));}}
 float s=t-FALL;if(s>0.){for(int i=0;i<10;i++){float fi=float(i);float b=s-fi*.07;if(b>0.){
  float r=2.+hash(fi+50.)*5.;vec2 c=uC+vec2((hash(fi+60.)-.5)*50.+sin(b*5.+fi)*6.,-b*(150.+hash(fi+70.)*130.)+12.);
  acc=max(acc,bubble(p,c,r));}}}
 return acc;}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 float fade=1.-smoothstep(END-.7,END,uT);
 float h0=H(p);vec3 n=normalize(vec3(h0-H(p+vec2(1.,0.)),h0-H(p+vec2(0.,1.)),1.));
 float slope=length(n.xy);
 float dr;float dd=dropD(p,dr);float th=lens(dd,dr);
 if(dd<1.){float dh=dropH(p);n=normalize(vec3(dh-dropH(p+vec2(1.,0.)),dh-dropH(p+vec2(0.,1.)),1.));}
 vec3 V=vec3(0.,0.,1.);
 float spec=pow(max(dot(reflect(-normalize(vec3(-.45,-.8,.85)),n),V),0.),60.);
 float spec2=pow(max(dot(reflect(-normalize(vec3(.6,.75,.7)),n),V),0.),18.)*.35;
 float fres=clamp((1.-n.z)*3.,0.,1.);
 vec3 irid=.5+.5*cos(6.2831*(vec3(0.,.33,.67)+fres*.85+p.x*.002+uT*.05));
 float energy=clamp(slope*6.,0.,1.);
 float cs=smoothstep(.55,1.,caus((p+n.xy*40.)*.03,uT*1.4))*energy;
 vec3 deep=mix(vec3(.05,.35,.75),vec3(.25,.6,1.),uDark);
 // Underwater: fills the screen behind the first wave front, from the impact point outwards.
 float s=uT-FALL;float under=s>0.?(1.-smoothstep(s*620.-160.,s*620.,length(p-uC)))*fade:0.;
 float yy=p.y/uRes.y;
 vec3 uw=mix(vec3(.1,.55,.85),vec3(0.,.1,.3),yy);
 float rays=pow(.5+.5*sin(p.x*.013+p.y*.005+sin(uT*.5+p.x*.004)*1.6),7.)*(1.-yy)*.55;
 float uc=smoothstep(.5,1.,caus(p*.022+vec2(0.,uT*.15),uT*.9))*(1.-yy*.7);
 uw+=vec3(.55,.85,1.)*(rays+uc*.35);
 vec2 bb=bubbles(p,uT);
 // Water film: a faint blue that darkens in troughs, white glints on crests, caustic sparkle.
 float filmA=.07*energy+.05*fade*smoothstep(0.,.25,uT-FALL);
 vec3 c=deep;float a=filmA;
 float ua=under*.62;c=mix(c,uw,ua/max(ua+a*(1.-ua),.001));a=ua+a*(1.-ua);
 float ba=bb.y*under;c=mix(c,vec3(.85,.97,1.),ba);a=ba+a*(1.-ba);
 float la=clamp(spec*1.7+spec2*1.3,0.,1.)*energy;c=mix(c,vec3(1.),la);a=la+a*(1.-la);
 la=fres*.25*energy;c=mix(c,irid,la);a=la+a*(1.-la);
 la=cs*.35;c=mix(c,vec3(.85,.95,1.),la);a=la+a*(1.-la);
 // The drop itself: tinted glass with a bright rim and highlights.
 float dm=smoothstep(1.,-1.,dd);
 vec3 dc=mix(vec3(.75,.9,1.),vec3(.45,.75,1.),uDark);float da=dm*(.35+.25*th);
 float rim=dm*(1.-smoothstep(0.,4.,-dd));dc=mix(dc,mix(vec3(0.,.42,.78),vec3(.2,.6,1.),uDark),rim*.6);da=max(da,rim*.7);
 float ds=clamp(spec*1.4+spec2,0.,1.)*dm;dc=mix(dc,vec3(1.),ds);da=ds+da*(1.-ds);
 c=dc*da+c*a*(1.-da);a=da+a*(1.-da);c/=max(a,.001);
 a*=fade;
 gl_FragColor=vec4(c*a,a);
}`;
