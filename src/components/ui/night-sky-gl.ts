/**
 * The night behind the gratitude sky (gratitude-sky.web.tsx): deep blue fading lighter towards a dark mountain
 * horizon with a faint airglow, and the Milky Way, which grows from nothing into
 * a bright band with dark dust lanes as the year of stars fills (uMilky, 0…1). uZoom is how much of the sky is in
 * view (domain/sky.ts skyExtent), so the band zooms out together with the stars drawn over it. Drawn by
 * fullscreen-gl.ts. Web only (WebGL).
 */
export const NIGHT_SKY_UNIFORMS = ["uMilky", "uZoom"] as const;

export const NIGHT_SKY_FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uT;uniform vec2 uC;uniform float uDark;
uniform float uMilky;uniform float uZoom;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n2(p);p=p*2.03+3.1;a*=.5;}return v;}
void main(){
 vec2 px=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 float y=px.y/uRes.y;
 // Sky coordinates, the same as the stars': centre a little above the middle, unit disc scaled by uZoom.
 vec2 q=(px-vec2(uRes.x*.5,uRes.y*.42))/min(uRes.x,uRes.y*.8)*2.*uZoom;
 // Deep night at the top, lighter blue towards the horizon.
 vec3 c=mix(vec3(.004,.008,.026),vec3(.02,.04,.1),smoothstep(.0,.8,y));
 c=mix(c,vec3(.05,.085,.17),smoothstep(.55,.88,y));
 // The Milky Way: a soft diagonal band, ragged at the edges, with a warm core and dark dust lanes along it.
 vec2 d=normalize(vec2(1.,-.42));
 float across=dot(q,vec2(-d.y,d.x))+.18*(fbm(q*1.3+4.)-.5);
 float along=dot(q,d);
 float band=exp(-across*across/.075);
 float core=exp(-across*across/.012)*smoothstep(1.4,0.,abs(along+.2));
 float cloud=fbm(q*2.6+vec2(uT*.004,0.));
 float lanes=smoothstep(.42,.72,fbm(vec2(along*3.,across*9.)+11.))*core;
 float glow=band*(.35+.9*cloud)+core*1.2*cloud;
 glow*=1.-.4*lanes;
 vec3 milk=mix(vec3(.32,.36,.62),vec3(.78,.66,.55),clamp(core*1.4,0.,1.));
 // Nothing on day one: a faint early band reads as a dark smear, so it only builds up as the year fills.
 float shown=pow(uMilky,1.2);
 c+=milk*glow*.24*shown;
 // Mountains on the horizon, black against a faint airglow.
 float hx=px.x/uRes.x;
 float ridge=uRes.y*(.865+.05*fbm(vec2(hx*2.2,1.))-.03*n2(vec2(hx*9.,3.)));
 c+=vec3(.04,.075,.14)*exp(-max(ridge-px.y,0.)/(uRes.y*.07))*.8;
 c=mix(c,vec3(.003,.005,.012),smoothstep(ridge-1.,ridge+1.,px.y));
 // Fine noise against banding in the dark gradient.
 c+=(h2(px+fract(uT))-.5)/255.;
 gl_FragColor=vec4(c,1.);
}`;
