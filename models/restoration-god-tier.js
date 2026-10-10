// v10: lighter restoration scene, neutral daylight grade, leaner particles, realistic water and wet-to-dry floor morph.
// Transparent canvas, left-aligned scene and progressive restoration story are intentionally preserved.
// Quality scales down on mobile/low-core devices; one shadow caster and restrained moving water detail.
// Left anchor (ANCHOR_X = -2.5). Camera lookAt offset → model sits left, text right.
// Story: room heals as you scroll (spray stops, puddle shrinks, floor dries, tide recedes).
// Floor morph: wood surface transforms wet → dry (real material morph).
// Features: full equipment set + extractor + rising bucket + wet footprints + redesigned camera.
// REQUIRES peak core v3.
import { createStage, THREE, smooth, track, lerp, dotTexture, sparkTexture, roughTexture, noiseTexture, roundedBox, boltGeo, fadeTexture } from "./core.js?v=10";

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const eOC = (t) => 1 - Math.pow(1 - t, 3);
const eOB = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const ANCHOR_X = -2.5;
const LOOK_OFFSET_X = 1.6;

function woodTexture(wet = false) {
  const c = document.createElement("canvas"); c.width = c.height = 1024;
  const x = c.getContext("2d"), planks = 8, h = 1024 / planks;
  const hue = wet ? 22 : 28;
  const sat = wet ? 26 : 34;
  const lum = wet ? 22 : 34;
  for (let i = 0; i < planks; i++) {
    x.fillStyle = `hsl(${hue + Math.random() * 4},${sat + Math.random() * 8}%,${lum + Math.random() * 8}%)`;
    x.fillRect(0, i * h, 1024, h);
    for (let k = 0; k < 90; k++) {
      x.strokeStyle = `rgba(25,14,8,${(Math.random() * 0.18).toFixed(3)})`;
      x.lineWidth = Math.random() * 1.6;
      const y = i * h + Math.random() * h;
      x.beginPath(); x.moveTo(0, y);
      for (let u = 0; u <= 1024; u += 32) x.lineTo(u, y + Math.sin(u * 0.01 + k) * 3);
      x.stroke();
    }
    if (Math.random() < 0.7) {
      const kx = Math.random() * 1024, ky = i * h + h / 2;
      for (let r = 2; r < 14; r += 3) {
        x.strokeStyle = "rgba(35,20,10,0.35)"; x.lineWidth = 1.4;
        x.beginPath(); x.ellipse(kx, ky, r * 1.6, r, 0.3, 0, 6.283); x.stroke();
      }
    }
    x.fillStyle = wet ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.5)";
    x.fillRect(0, i * h, 1024, 2);
    x.fillRect(Math.random() * 1024, i * h, 2, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.5, 1);
  return t;
}

export function mount(canvas) {
  const IS_MOBILE = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || matchMedia("(max-width: 760px)").matches;
  const Q_MAX = IS_MOBILE ? 0 : ((navigator.hardwareConcurrency || 8) <= 4 ? 1 : 2);
  let level = Q_MAX;

  // 1. Transparent canvas — HTML background shows through
  const S = createStage(canvas, {
    cam: [ANCHOR_X - 2.2, 1.8, 5.6], bg: 0x000000, fog: 0,
    envColors: [0xffc07a, 0x3f9c98, 0xbfe8e2, 0x0c1f22], exposure: 1.2,
    transparent: true,
  });
  const { scene, camera, renderer, mobile } = S;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
  const _o = new THREE.Object3D();
  const UP = V(0, 1, 0);
  const raycaster = new THREE.Raycaster();
  const PC = V(ANCHOR_X - 1.4, 0, 0.6);

  // ============================================================
  // ROOT — left-aligned composition
  // ============================================================
  const jobSite = new THREE.Group();
  jobSite.position.x = ANCHOR_X;
  scene.add(jobSite);

  // Shadow catcher (transparent plane on floor catching model shadows)
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(24, 20), new THREE.ShadowMaterial({ opacity: 0.42, color: 0x011416 }));
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = 0.002;
  shadowCatcher.receiveShadow = true;
  jobSite.add(shadowCatcher);

  // ============================================================
  // LIGHTS
  // ============================================================
  const hemi = new THREE.HemisphereLight(0xc8e0e8, 0x465960, 0.85); scene.add(hemi);
  const C_WARMW = new THREE.Color(0xf0f4f5), C_GRND = new THREE.Color(0x98a8ad), C_FOG = new THREE.Color(0xe3edf2), C_WET = new THREE.Color(0x424d53);
  const windowFill = new THREE.DirectionalLight(0xdbeaf0, 1.65);
  windowFill.position.set(-6, 7, 4); windowFill.castShadow = !mobile;
  if (!mobile) {
    windowFill.shadow.mapSize.set(1024, 1024);
    windowFill.shadow.bias = -0.0004; windowFill.shadow.radius = 4;
    Object.assign(windowFill.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 28 });
    windowFill.shadow.camera.updateProjectionMatrix();
  }
  scene.add(windowFill);
  const coolRim = new THREE.PointLight(0x7bbdc9, 10, 16); coolRim.position.set(-6, 3, -4); scene.add(coolRim);
  scene.fog = new THREE.FogExp2(0xc8d9df, 0.009);
  const oculus = new THREE.SpotLight(0xe8f3f6, 85, 40, 0.5, 0.85, 1.5);
  oculus.position.set(-0.6, 14, 2); oculus.target.position.set(ANCHOR_X, 0, 0.5); scene.add(oculus, oculus.target);
  oculus.castShadow = false;   // perf: windowFill is the single shadow caster
  const shaftU = { uT: { value: 0 }, uI: { value: 1 }, uCol: { value: new THREE.Color(0.5, 1, 0.95) } };
  const godray = new THREE.Mesh(new THREE.ConeGeometry(3.2, 15, 32, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: shaftU,
    vertexShader: "varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}",
    fragmentShader: "varying vec2 vUv;varying vec3 vN;varying vec3 vV;uniform float uT,uI;uniform vec3 uCol;void main(){float e=pow(abs(dot(vN,vV)),1.7);float len=pow(vUv.y,1.15);float fl=.82+.18*sin(uT*.6+vUv.x*22.)*sin(uT*.35+vUv.x*9.);float b=e*len*fl*uI*.30;gl_FragColor=vec4(uCol,b);}",
  }));
  godray.position.set(-1.6, 7.2, 0.4); godray.rotation.z = -0.1; godray.renderOrder = 5; scene.add(godray);
  const warmFill = new THREE.PointLight(0xf0d5b5, 13, 12); warmFill.position.set(3, 2, 3); scene.add(warmFill);

  // ============================================================
  // MATERIALS
  // ============================================================
  const rough = roughTexture(); rough.repeat.set(2, 2);
  const noise = noiseTexture(); noise.repeat.set(5, 5);
  const polyYellow = new THREE.MeshPhysicalMaterial({ color: 0xc89a3a, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.4, roughnessMap: rough, side: THREE.DoubleSide });
  const polyBlue = new THREE.MeshPhysicalMaterial({ color: 0x1f5662, roughness: 0.55, clearcoat: 0.25, roughnessMap: rough });
  const plasticDark = new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.6, metalness: 0.15, roughnessMap: rough });
  const innerDark = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.9, side: THREE.BackSide });
  const steelGalv = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.9, roughness: 0.45, roughnessMap: rough });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0b0d11, roughness: 0.95 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 1, roughness: 0.26, roughnessMap: rough });
  const cordMat = new THREE.MeshStandardMaterial({ color: 0x0b0d11, roughness: 0.85 });
  const ledGreen = new THREE.MeshBasicMaterial({ color: 0x35d17a });
  const ledRed = new THREE.MeshBasicMaterial({ color: 0x3a1010 });
  const ledAmber = new THREE.MeshBasicMaterial({ color: 0xffb060 });
  const sheetPlastic = new THREE.MeshPhysicalMaterial({ color: 0xdfe4e8, transparent: true, opacity: 0.16, roughness: 0.15, clearcoat: 1, side: THREE.DoubleSide, bumpMap: noise, bumpScale: 0.02, depthWrite: false });
  const signYellow = new THREE.MeshStandardMaterial({ color: 0xd8b400, roughness: 0.6, side: THREE.DoubleSide });
  const signBlack = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
  const scrubGray = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.55, metalness: 0.2, roughnessMap: rough });
  const outletWhite = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.5 });

  // ============================================================
  // FLOOR — 2 layers: dark wet slab below, dry wood that appears with scroll
  // ============================================================
  const wetWoodTex = woodTexture(true);
  const dryWoodTex = woodTexture(false);
  const floorWetMat = new THREE.MeshStandardMaterial({ map: wetWoodTex, roughness: 0.42, metalness: 0.15, color: 0x3a2f26 });
  const floorDryMat = new THREE.MeshStandardMaterial({ map: dryWoodTex, roughness: 0.78, metalness: 0.04, color: 0x6b5540 });
  const slabGeo = new THREE.BoxGeometry(16, 0.5, 10);
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x3a342c, roughness: 0.9 });
  const wetTop = new THREE.Mesh(new THREE.PlaneGeometry(16, 11), floorWetMat);
  wetTop.rotation.x = -Math.PI / 2; wetTop.position.y = 0.01;
  const dryTop = new THREE.Mesh(new THREE.PlaneGeometry(16, 11), floorDryMat);
  dryTop.rotation.x = -Math.PI / 2; dryTop.position.y = 0.011;
  dryTop.material.transparent = true; dryTop.material.opacity = 0;
  const slab = new THREE.Mesh(slabGeo, [sideMat, sideMat, sideMat, sideMat, sideMat, sideMat]);
  slab.visible = false; wetTop.visible = dryTop.visible = false;
  const floorFade = fadeTexture();
  [floorWetMat, floorDryMat].forEach(mt => { mt.transparent = true; mt.alphaMap = floorFade; });
  wetTop.position.z = dryTop.position.z = -0.5;
  wetTop.receiveShadow = dryTop.receiveShadow = true; jobSite.add(wetTop, dryTop);

  // ============================================================
  // WET DRYWALL WALL — tide-line recedes with scroll
  // ============================================================
  const wallU = { uTime: { value: 0 }, uWet: { value: 1 } };
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(15, 7.4), new THREE.ShaderMaterial({
    transparent: true, uniforms: wallU,
    vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec2 vUv;uniform float uTime,uWet;
      float n(vec2 p){return sin(p.x*9.1)*sin(p.y*7.3)+.5*sin(p.x*17.7+p.y*13.1);}
      void main(){
        float e=uWet*.42+n(vUv*9.)*.025;
        float body=1.-smoothstep(e-.02,e+.05,vUv.y);
        float tide=smoothstep(.012,0.,abs(vUv.y-e));
        vec3 dry=vec3(.58,.68,.66);
        vec3 wetC=vec3(.16,.27,.26);
        vec3 col=mix(dry,wetC,body*.85);
        col=mix(col,vec3(.10,.19,.17),tide*.8);
        float drips=sin(vUv.x*50.+uTime)*sin(vUv.y*20.-uTime*2.);
        drips=smoothstep(.8,1.,drips)*.1;
        col+=vec3(drips*.5,drips*.6,drips*.8);
        float ea=smoothstep(0.,.1,vUv.x)*smoothstep(1.,.9,vUv.x)*smoothstep(1.,.78,vUv.y);gl_FragColor=vec4(col,ea*.96);}`,
  }));
  backWall.position.set(0, 3.7, -5.95); jobSite.add(backWall);
  const baseboard = new THREE.Mesh(new THREE.BoxGeometry(15, 0.28, 0.06), new THREE.MeshStandardMaterial({ color: 0xd8d5cf, roughness: 0.55 }));
  baseboard.position.set(0, 0.14, -5.92); jobSite.add(baseboard);

  // ============================================================
  // BURST PIPE + CRACK + CLAMPS
  // ============================================================
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 7, 20).rotateZ(Math.PI / 2), copper);
  pipe.position.set(-3.9, 1.75, -5.82); pipe.rotation.z = Math.PI / 2; pipe.scale.x = 0.5; jobSite.add(pipe);
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.09, 28), steelGalv); flange.position.set(-3.9, 0.045, -5.82); jobSite.add(flange);
  const pcap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), copper); pcap.position.set(-3.9, 3.5, -5.82); jobSite.add(pcap);
  const CRACK = V(ANCHOR_X - 1.4, 2.2, -5.75);
  const crack = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 8), copper);
  crack.position.copy(CRACK); crack.rotation.x = Math.PI / 2; jobSite.add(crack);
  for (let i = 0; i < 3; i++) {
    const clampR = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 20), steelGalv);
    clampR.position.set(-3.9, 0.7 + i * 1.2, -5.82);
    clampR.rotation.x = Math.PI / 2; jobSite.add(clampR);
  }

  // ============================================================
  // MURKY PUDDLE (shader)
  // ============================================================
  const pu = { uTime: { value: 0 }, uWet: { value: 1 }, uHeal: { value: 0 }, uSun: { value: new THREE.Vector3(0.15, 0.5, -0.85) } };
  const puddle = new THREE.Mesh(new THREE.PlaneGeometry(6, 6, mobile ? 24 : (Q_MAX >= 2 ? 48 : 36), mobile ? 24 : (Q_MAX >= 2 ? 48 : 36)),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: pu,
      vertexShader: "uniform float uTime,uWet;varying vec3 vP;varying vec2 vUv;float h(vec2 p){return (sin(p.x*3.+uTime*1.6)+sin(p.y*4.2-uTime*1.3)+sin((p.x+p.y)*5.+uTime*2.1)*.6)*.012;}void main(){vUv=uv;vec3 p=position;p.z+=h(position.xy)*uWet;vec4 w=modelMatrix*vec4(p,1.);vP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
      fragmentShader: "uniform float uTime,uWet;varying vec3 vP;varying vec2 vUv;float n(vec2 p){return sin(p.x*2.1+1.3)*sin(p.y*2.7)+.5*sin(p.x*5.3+p.y*4.1);}void main(){vec2 c=vUv-.5;float r=length(c)*2.;float e=(.78*uWet+.04)+n(c*6.)*.06*uWet;float a=1.-smoothstep(e-.08,e,r);if(a<.01||uWet<.02)discard;vec3 N=normalize(cross(dFdx(vP),dFdy(vP)));if(N.y<0.)N=-N;vec3 Vv=normalize(cameraPosition-vP);float f=pow(1.-max(dot(N,Vv),0.),3.);vec3 Hh=normalize(normalize(vec3(.4,1.,.3))+Vv);float sp=pow(max(dot(N,Hh),0.),90.);vec3 col=mix(vec3(.02,.12,.13),vec3(.22,.62,.60),f)+vec3(.8,1.,1.)*sp*.9;gl_FragColor=vec4(col,a*(.5+f*.4));}",
    }));
  puddle.rotation.x = -Math.PI / 2; puddle.position.set(PC.x, 0.018, PC.z);
  puddle.scale.set(1.35, 1.35, 1.35); puddle.userData.key = "puddle"; jobSite.add(puddle);
  // flood water: 3 analytic waves (vertex) + fbm micro-normals, Fresnel sky reflection, sun glints, depth tint, bed caustics, shoreline foam
  puddle.material.vertexShader = `uniform float uTime,uWet;varying vec3 vP;varying vec2 vUv;varying vec3 vN;
    float wv(vec2 p,vec2 d,float k,float sp,float a,inout vec2 g){float ph=dot(p,d)*k+uTime*sp;g+=d*k*a*cos(ph);return a*sin(ph);}
    void main(){vUv=uv;vec3 p=position;vec2 g=vec2(0.);float h=0.;
      h+=wv(position.xy,normalize(vec2(1.,.4)),3.2,1.5,.016,g);h+=wv(position.xy,normalize(vec2(-.5,1.)),4.6,1.9,.011,g);h+=wv(position.xy,normalize(vec2(.7,-.9)),7.5,2.6,.006,g);
      p.z+=h*uWet;vec4 w=modelMatrix*vec4(p,1.);vP=w.xyz;
      vN=normalize(mat3(modelMatrix)*normalize(vec3(-g.x*uWet,-g.y*uWet,1.)));gl_Position=projectionMatrix*viewMatrix*w;}`;
  puddle.material.fragmentShader = `uniform float uTime,uWet,uHeal;uniform vec3 uSun;varying vec3 vP;varying vec2 vUv;varying vec3 vN;
    float n(vec2 p){return sin(p.x*2.1+1.3)*sin(p.y*2.7)+.5*sin(p.x*5.3+p.y*4.1);}
    float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*sin(p.x*1.7+p.y*1.3+uTime*.25*float(i+1))*sin(p.y*2.1-p.x*.9-uTime*.2);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return s;}
    void main(){
      vec2 c=vUv-.5;float r=length(c)*2.;float e=(.78*uWet+.04)+n(c*6.)*.06*uWet;
      float a=1.-smoothstep(e-.08,e,r);if(a<.01||uWet<.02)discard;
      vec2 q=vP.xz*2.2;float h0=fbm(q),hx=fbm(q+vec2(.05,0.)),hz=fbm(q+vec2(0.,.05));
      vec3 N=normalize(vN+vec3(h0-hx,0.,h0-hz)*7.*uWet);if(N.y<0.)N=-N;
      vec3 V=normalize(cameraPosition-vP);float F=.02+.98*pow(1.-max(dot(N,V),0.),5.);
      vec3 R=reflect(-V,N);vec3 S=normalize(uSun);
      vec3 sky=mix(vec3(.12,.20,.24),vec3(.54,.72,.78),smoothstep(-.1,.9,R.y));sky=mix(sky,vec3(.90,.94,.95),uHeal*.5);
      float sp=pow(max(dot(R,S),0.),220.)*1.6+pow(max(dot(R,S),0.),24.)*.15;
      float depth=1.-smoothstep(0.,.9,r/e);
      vec3 body=mix(vec3(.19,.34,.40),vec3(.04,.09,.13),depth*.9);
      float cs=pow(max(0.,sin(vP.x*5.+uTime*.65+fbm(q*.5)*3.)*sin(vP.z*5.-uTime*.55)+.2),4.)*(1.-depth)*.32;
      body+=vec3(.30,.52,.58)*cs;
      vec3 col=mix(body,sky,F)+vec3(1.,.97,.9)*sp;
      float edge=1.-smoothstep(0.,.07,e-r);float foam=smoothstep(.15,.6,fbm(q*3.+uTime*.3)+.5)*edge;
      col=mix(col,vec3(.92,.97,.96),foam*.85);
      gl_FragColor=vec4(col,a*(.62+F*.3+foam*.3));}`;
  puddle.material.needsUpdate = true;

  // ============================================================
  // THERMAL OVERLAY (shader)
  // ============================================================
  const th = { uTime: { value: 0 }, uWet: { value: 1 }, uShow: { value: 0.3 }, uC: { value: new THREE.Vector2(PC.x, PC.z) } };
  const thermal = new THREE.Mesh(new THREE.PlaneGeometry(16, 11), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: th,
    vertexShader: "varying vec3 vP;varying vec2 vUv;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
    fragmentShader: "uniform float uTime,uWet,uShow;uniform vec2 uC;varying vec3 vP;varying vec2 vUv;float n(vec2 p){return sin(p.x*2.1+1.3)*sin(p.y*2.7)+.5*sin(p.x*5.3+p.y*4.1+uTime*.4);}void main(){float d=length((vP.xz-uC)/3.2);float w=clamp((1.-smoothstep(.2,1.25,d+n(vP.xz*.7)*.12))*uWet,0.,1.);vec3 c=mix(vec3(.02,.01,.15),vec3(.45,.05,.35),smoothstep(0.,.35,w));c=mix(c,vec3(.85,.12,.08),smoothstep(.35,.6,w));c=mix(c,vec3(1.,.55,.10),smoothstep(.6,.85,w));c=mix(c,vec3(1.,.92,.55),smoothstep(.85,1.,w));vec2 g=abs(fract(vP.xz*1.2)-.5);float ln=1.-smoothstep(0.,.03,min(.5-g.x,.5-g.y));float scan=smoothstep(.02,0.,abs(vUv.x-fract(uTime*.12)))*.35;float cr=smoothstep(.015,0.,abs(length(vP.xz-uC)-.6))*.5;float a=(w*.75+ln*(.12+w*.35)+scan+cr)*uShow;gl_FragColor=vec4(c*(.6+w+scan),a);}",
  }));
  thermal.rotation.x = -Math.PI / 2; thermal.position.y = 0.028; thermal.visible = false; jobSite.add(thermal);

  // ============================================================
  // CAUSTICS
  // ============================================================
  const caustics = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(0x66e6dc) }, uW: { value: 1 } },
    vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: "varying vec2 vUv;uniform float uT,uW;uniform vec3 uC;void main(){vec2 uv=vUv*7.;float t=uT*0.4;float c=sin(uv.x*3.1+t)*sin(uv.y*2.7-t)+sin((uv.x+uv.y)*4.3+t*1.3)+sin(length(uv-3.5)*5.-t*2.);c=pow(max(0.,c*0.33),3.);float fade=1.-smoothstep(.2,.5,length(vUv-.5));gl_FragColor=vec4(uC*c,c*fade*.3*uW);}",
  }));
  caustics.rotation.x = -Math.PI / 2; caustics.position.set(PC.x, 0.008, PC.z);
  caustics.visible = level >= 1; jobSite.add(caustics);

  // ============================================================
  // AIR MOVER
  // ============================================================
  const mover = new THREE.Group(); mover.scale.setScalar(0.85); mover.rotation.y = -0.12; jobSite.add(mover);
  const CY = 1.45;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.95, 72, 1, true).rotateX(Math.PI / 2), polyYellow);
  drum.position.y = CY;
  const lining = new THREE.Mesh(new THREE.CylinderGeometry(0.97, 0.97, 0.9, 48, 1, true).rotateX(Math.PI / 2), innerDark);
  lining.position.y = CY;
  const back = new THREE.Mesh(new THREE.CircleGeometry(0.98, 64), plasticDark);
  back.position.set(0, CY, -0.4);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.045, 16, 96), plasticDark);
  bezel.position.set(0, CY, 0.475);
  mover.add(drum, lining, back, bezel);
  const bezelHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0xffa64d, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  bezelHalo.scale.set(3, 3, 1); bezelHalo.position.set(0, CY, 0.5); mover.add(bezelHalo);
  const rivets = new THREE.InstancedMesh(boltGeo(0.022, 0.015), steelGalv, 48);
  for (let i = 0; i < 48; i++) {
    const a = (i % 24 / 24) * Math.PI * 2, z = i < 24 ? 0.46 : -0.46;
    _o.position.set(Math.cos(a) * 0.99, CY + Math.sin(a) * 0.99, z);
    _o.rotation.set(0, 0, 0); _o.updateMatrix();
    rivets.setMatrixAt(i, _o.matrix);
  }
  rivets.instanceMatrix.needsUpdate = true; mover.add(rivets);
  const weld = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.012, 8, 72), plasticDark);
  weld.position.set(0, CY, 0); mover.add(weld);
  const rotor = new THREE.Group(); rotor.position.set(0, CY, 0.05); mover.add(rotor);
  const bs = new THREE.Shape();
  bs.moveTo(0.06, -0.03); bs.bezierCurveTo(0.18, -0.1, 0.32, -0.09, 0.36, 0.02);
  bs.bezierCurveTo(0.32, 0.1, 0.18, 0.1, 0.06, 0.05); bs.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(bs, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.004, bevelSegments: 2 });
  for (let i = 0; i < 9; i++) {
    const hold = new THREE.Group();
    const b = new THREE.Mesh(bladeGeo, steelGalv);
    b.rotation.x = 0.55; hold.add(b);
    hold.rotation.z = (i / 9) * Math.PI * 2; rotor.add(hold);
  }
  rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.45, 24).rotateX(Math.PI / 2), plasticDark));
  rotor.add(new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.2, 20).rotateX(Math.PI / 2), steelGalv));
  [-0.25, 0.25].forEach((z) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.03, 8, 64), steelGalv);
    r.position.z = z; rotor.add(r);
  });
  [0.3, 0.55, 0.8].forEach((r) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 64), plasticDark);
    t.position.set(0, CY, 0.5); mover.add(t);
  });
  const sp = new THREE.InstancedMesh(new THREE.BoxGeometry(0.82, 0.012, 0.02), plasticDark, 18);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    _o.position.set(Math.cos(a) * 0.41, CY + Math.sin(a) * 0.41, 0.5);
    _o.rotation.set(0, 0, a); _o.updateMatrix();
    sp.setMatrixAt(i, _o.matrix);
  }
  sp.instanceMatrix.needsUpdate = true; mover.add(sp);
  const outlet = new THREE.Mesh(roundedBox(0.95, 0.8, 1.0, 0.2), polyYellow);
  outlet.position.set(-1.2, 1.5, 0); outlet.rotation.z = 0.4;
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.9), plasticDark);
  slit.position.set(-1.62, 1.35, 0); slit.rotation.z = 0.4;
  const louv = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.16, 0.86), steelGalv, 3);
  for (let i = 0; i < 3; i++) {
    _o.position.set(-1.66, 1.15 + i * 0.2, 0); _o.rotation.set(0, 0, 0.7); _o.updateMatrix();
    louv.setMatrixAt(i, _o.matrix);
  }
  louv.instanceMatrix.needsUpdate = true;
  mover.add(outlet, slit, louv);
  const mouthAnchor = new THREE.Object3D(); mouthAnchor.position.set(-1.85, 1.28, 0); mover.add(mouthAnchor);
  const panel = new THREE.Mesh(roundedBox(0.5, 0.14, 0.32, 0.03), plasticDark);
  panel.position.set(0.4, CY + 1.02, -0.1); mover.add(panel);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.06, 20), steelGalv);
  knob.position.set(0.28, CY + 1.11, -0.1); mover.add(knob);
  const panelLed = new THREE.Mesh(new THREE.CircleGeometry(0.025, 12).rotateX(-Math.PI / 2), ledGreen);
  panelLed.position.set(0.5, CY + 1.095, -0.1); mover.add(panelLed);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.004),
    new THREE.MeshStandardMaterial({ color: 0xdadfe6, metalness: 0.4, roughness: 0.5 }));
  plate.position.set(0.55, CY + 0.55, 0.47); mover.add(plate);
  for (let i = 0; i < 4; i++) {
    const ln = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.008), new THREE.MeshBasicMaterial({ color: 0x2c3542 }));
    ln.position.set(0.55, CY + 0.6 - i * 0.028, 0.474); mover.add(ln);
  }
  const stand = new THREE.Mesh(roundedBox(2.0, 0.34, 1.15, 0.12), plasticDark);
  stand.position.y = 0.45;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 10, 32, Math.PI), polyYellow);
  handle.position.set(0, 2.45, 0);
  const grips = new THREE.InstancedMesh(new THREE.TorusGeometry(0.055, 0.012, 6, 12), rubber, 5);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.25 + i * 0.125);
    _o.position.set(Math.cos(a) * 0.55, 2.45 + Math.sin(a) * 0.55, 0);
    _o.rotation.set(0, Math.PI / 2, 0); _o.updateMatrix();
    grips.setMatrixAt(i, _o.matrix);
  }
  grips.instanceMatrix.needsUpdate = true;
  mover.add(stand, handle, grips);
  function caster(x, z, parent, sy) {
    const g = new THREE.Group(); g.position.set(x, sy, z);
    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.14), plasticDark);
    fork.position.y = -0.08;
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 20).rotateZ(Math.PI / 2), rubber);
    wh.position.y = -0.16;
    const cap = new THREE.Mesh(boltGeo(0.03, 0.1), steelGalv);
    cap.rotation.y = Math.PI / 2; cap.position.set(0.05, -0.16, 0);
    g.add(fork, wh, cap); parent.add(g);
  }
  [-0.8, 0.8].forEach((x) => [-0.45, 0.45].forEach((z) => caster(x, z, mover, 0.28)));
  const moverHit = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3, 2.4), new THREE.MeshBasicMaterial({ visible: false }));
  moverHit.position.y = 1.4; moverHit.userData.key = "mover"; mover.add(moverHit);
  mover.traverse((mm) => { if (mm.isMesh) mm.castShadow = true; });

  // ============================================================
  // NEW: EXTRACTOR MACHINE (second piece of equipment)
  // ============================================================
  const extractor = new THREE.Group(); extractor.position.set(-1.2, 0, 3.5); extractor.rotation.y = 0.35; jobSite.add(extractor);
  const exBody = new THREE.Mesh(roundedBox(1.3, 1.0, 1.0, 0.1), polyBlue);
  exBody.position.y = 0.55; exBody.castShadow = true; extractor.add(exBody);
  const exTop = new THREE.Mesh(roundedBox(1.2, 0.15, 0.9, 0.06), polyYellow);
  exTop.position.y = 1.1; extractor.add(exTop);
  const exLid = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 32), steelGalv);
  exLid.position.set(0, 1.17, 0); extractor.add(exLid);
  const exHandle = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 8, 24, Math.PI), plasticDark);
  exHandle.position.set(0, 1.2, 0); exHandle.rotation.x = Math.PI / 2; extractor.add(exHandle);
  const exGauge = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshStandardMaterial({ color: 0xf3f4f0, roughness: 0.5 }));
  exGauge.position.set(-0.35, 1.2, 0.4); exGauge.rotation.x = -0.4; extractor.add(exGauge);
  const exGaugeNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.07, 0.002), new THREE.MeshBasicMaterial({ color: 0xd12a2a }));
  exGaugeNeedle.geometry.translate(0, 0.035, 0);
  exGaugeNeedle.position.set(-0.35, 1.2, 0.42); exGaugeNeedle.rotation.z = -0.5; extractor.add(exGaugeNeedle);
  const exHose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    V(0.6, 0.7, 0.4), V(1.0, 0.4, 0.7), V(1.4, 0.15, 1.4), V(1.8, 0.08, 2.6),
  ], false, "catmullrom", 0.3), 40, 0.045, 8, false), cordMat);
  extractor.add(exHose);
  const exNozzle = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 12).rotateX(Math.PI / 2), steelGalv);
  exNozzle.position.set(1.8, 0.08, 2.75); extractor.add(exNozzle);
  const exWand = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 12).rotateX(Math.PI / 2), steelGalv);
  exWand.position.set(1.8, 0.08, 3.4); extractor.add(exWand);
  const exWandHead = new THREE.Mesh(roundedBox(0.35, 0.04, 0.12, 0.02), steelGalv);
  exWandHead.position.set(1.8, 0.05, 4.1); extractor.add(exWandHead);
  const exLed = new THREE.Mesh(new THREE.CircleGeometry(0.02, 10), ledGreen);
  exLed.position.set(0.5, 0.9, 0.5); extractor.add(exLed);
  const exHit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.3), new THREE.MeshBasicMaterial({ visible: false }));
  exHit.position.y = 0.7; exHit.userData.key = "extractor"; extractor.add(exHit);
  extractor.traverse((mm) => { if (mm.isMesh) mm.castShadow = true; });

  // ============================================================
  // DEHUMIDIFIER + RISING BUCKET + DRIP TUBE
  // ============================================================
  const dehu = new THREE.Group(); dehu.position.set(4.6, 0, -2.8); dehu.rotation.y = -0.5; jobSite.add(dehu);
  const dBody = new THREE.Mesh(roundedBox(1.1, 1.5, 0.8, 0.1), polyBlue);
  dBody.position.y = 0.99; dBody.castShadow = true; dehu.add(dBody);
  const dTop = new THREE.Mesh(roundedBox(1.05, 0.1, 0.75, 0.06), polyYellow);
  dTop.position.y = 1.78; dehu.add(dTop);
  const dFace = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.9 }));
  dFace.position.set(0, 1.45, 0.41); dehu.add(dFace);
  const dLou = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.02, 0.01), steelGalv, 10);
  for (let i = 0; i < 10; i++) {
    _o.position.set(0, 1.05 - i * 0.045, 0.405); _o.rotation.set(0.5, 0, 0); _o.updateMatrix();
    dLou.setMatrixAt(i, _o.matrix);
  }
  dLou.instanceMatrix.needsUpdate = true; dehu.add(dLou);
  const dLed = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), ledGreen);
  dLed.position.set(-0.3, 1.6, 0.41); dehu.add(dLed);
  const alertLed = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), ledRed);
  alertLed.position.set(-0.18, 1.6, 0.41); dehu.add(alertLed);
  const alertHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0xd12a2a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  alertHalo.scale.set(0.5, 0.5, 1); alertHalo.position.set(-0.18, 1.6, 0.5); dehu.add(alertHalo);
  const dCanvas = document.createElement("canvas"); dCanvas.width = 256; dCanvas.height = 128;
  const dCtx = dCanvas.getContext("2d");
  const dTex = new THREE.CanvasTexture(dCanvas); dTex.colorSpace = THREE.SRGBColorSpace;
  const dLcd = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: dTex }));
  dLcd.position.set(0.12, 1.6, 0.415); dehu.add(dLcd);
  const dHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0xffb060, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  dHalo.scale.set(1.2, 1.2, 1); dHalo.position.set(0.12, 1.6, 0.5); dehu.add(dHalo);
  [-0.4, 0.4].forEach((x) => [-0.3, 0.3].forEach((z) => caster(x, z, dehu, 0.24)));
  const dehuHit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.9, 1.1), new THREE.MeshBasicMaterial({ visible: false }));
  dehuHit.position.y = 1; dehuHit.userData.key = "dehu"; dehu.add(dehuHit);
  dehu.traverse((mm) => { if (mm.isMesh) mm.castShadow = true; });
  const bucketPos = V(3.5, 0, -1.5);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    V(4.1, 0.6, -2.6), V(3.85, 0.35, -2.2), V(3.65, 0.3, -1.8), V(3.5, 0.55, -1.5),
  ], false, "catmullrom", 0.3), 60, 0.03, 8, false), cordMat);
  jobSite.add(hose);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.55, 24, 1, true), plasticDark);
  bucket.position.set(bucketPos.x, 0.275, bucketPos.z); jobSite.add(bucket);
  const bWater = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24).rotateX(-Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0x5a4a38, roughness: 0.12, transparent: true, opacity: 0.8 }));
  bWater.position.set(bucketPos.x, 0.06, bucketPos.z); jobSite.add(bWater);
  // NEW: drip particles from hose into bucket
  const NDP = mobile ? 0 : 14;
  const dpPos = new Float32Array(NDP * 3), dpVel = new Float32Array(NDP);
  function dpSpawn(i) {
    dpPos[i * 3]     = bucketPos.x + (Math.random() - 0.5) * 0.05;
    dpPos[i * 3 + 1] = 0.55;
    dpPos[i * 3 + 2] = bucketPos.z + (Math.random() - 0.5) * 0.05;
    dpVel[i] = 0;
  }
  for (let i = 0; i < NDP; i++) dpSpawn(i);
  const dpGeo = new THREE.BufferGeometry(); dpGeo.setAttribute("position", new THREE.BufferAttribute(dpPos, 3));
  const bucketDrips = new THREE.Points(dpGeo, new THREE.PointsMaterial({ size: 0.03, map: dotTexture(), color: 0xb8f0ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  bucketDrips.frustumCulled = false; bucketDrips.visible = NDP > 0; jobSite.add(bucketDrips);

  // ============================================================
  // MOISTURE METER
  // ============================================================
  const meter = new THREE.Group(); meter.position.set(-3.4, 0.06, 1.4); meter.rotation.y = 0.4; jobSite.add(meter);
  const mBody = new THREE.Mesh(roundedBox(0.62, 0.1, 0.36, 0.03), polyYellow);
  const mCanvas = document.createElement("canvas"); mCanvas.width = 256; mCanvas.height = 128;
  const mCtx = mCanvas.getContext("2d");
  const mTex = new THREE.CanvasTexture(mCanvas); mTex.colorSpace = THREE.SRGBColorSpace;
  const mScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: mTex }));
  mScreen.position.set(0, 0.052, 0);
  const mHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0x7dffb0, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
  mHalo.scale.set(1, 1, 1); mHalo.position.set(0, 0.2, 0);
  const pins = new THREE.InstancedMesh(new THREE.ConeGeometry(0.012, 0.12, 8), steelGalv, 2);
  _o.position.set(-0.06, -0.08, 0.2); _o.rotation.set(Math.PI, 0, 0); _o.updateMatrix(); pins.setMatrixAt(0, _o.matrix);
  _o.position.set(0.06, -0.08, 0.2); _o.updateMatrix(); pins.setMatrixAt(1, _o.matrix);
  pins.instanceMatrix.needsUpdate = true;
  const btns = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), rubber, 3);
  for (let i = 0; i < 3; i++) {
    _o.position.set(-0.12 + i * 0.12, 0.055, -0.13); _o.rotation.set(0, 0, 0); _o.updateMatrix();
    btns.setMatrixAt(i, _o.matrix);
  }
  btns.instanceMatrix.needsUpdate = true;
  meter.add(mBody, mScreen, mHalo, pins, btns);
  const mCable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    V(-3.7, 0.08, 1.25), V(-4.1, 0.05, 1.0), V(-4.4, 0.05, 0.6), V(-4.2, 0.05, 0.2),
  ], false, "catmullrom", 0.3), 40, 0.015, 6, false), cordMat);
  jobSite.add(mCable);
  const meterHit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
  meterHit.position.y = 0.1; meterHit.userData.key = "meter"; meter.add(meterHit);

  // ============================================================
  // SENSOR TRIPOD
  // ============================================================
  const tripod = new THREE.Group(); tripod.position.set(2.3, 0, 2.7); jobSite.add(tripod);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.15, 8), plasticDark);
    leg.position.set(Math.cos(a) * 0.18, 0.55, Math.sin(a) * 0.18);
    leg.rotation.set(Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28);
    tripod.add(leg);
  }
  const tHead = new THREE.Mesh(roundedBox(0.22, 0.3, 0.14, 0.03), scrubGray);
  tHead.position.y = 1.2;
  const tLed = new THREE.Mesh(new THREE.CircleGeometry(0.02, 10), ledAmber);
  tLed.position.set(0, 1.26, 0.075);
  const tAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 6), steelGalv);
  tAnt.position.set(0.07, 1.5, 0);
  const tHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0xffb060, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  tHalo.scale.set(0.7, 0.7, 1); tHalo.position.set(0, 1.26, 0.1);
  tripod.add(tHead, tLed, tAnt, tHalo);

  // ============================================================
  // WET-FLOOR SIGN
  // ============================================================
  const sign = new THREE.Group(); sign.position.set(0.8, 0, 2.1); sign.rotation.y = 0.5; jobSite.add(sign);
  const signA = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.62), signYellow);
  signA.position.set(0, 0.31, 0.12); signA.rotation.x = -0.25; sign.add(signA);
  const signB = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.62), signYellow);
  signB.position.set(0, 0.31, -0.12); signB.rotation.x = 0.25; sign.add(signB);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.08), signBlack);
  stripe.position.set(0, 0.34, 0.145); stripe.rotation.x = -0.25; sign.add(stripe);
  const stripe2 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.05), signBlack);
  stripe2.position.set(0, 0.22, 0.155); stripe2.rotation.x = -0.25; sign.add(stripe2);
  sign.traverse((mm) => { if (mm.isMesh) mm.castShadow = true; });

  // ============================================================
  // CONTAINMENT SHEETING
  // ============================================================
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3.2), sheetPlastic);
  sheet.position.set(5.4, 1.6, -3.4); sheet.rotation.y = -0.55; jobSite.add(sheet);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 0.02), new THREE.MeshStandardMaterial({ color: 0x3a6ea5, roughness: 0.6 }));
  tape.position.set(5.4, 3.18, -3.4); tape.rotation.y = -0.55; jobSite.add(tape);

  // ============================================================
  // NEGATIVE-AIR SCRUBBER
  // ============================================================
  const scrubber = new THREE.Group(); scrubber.position.set(-4.4, 0, -1.8); scrubber.rotation.y = 0.7; jobSite.add(scrubber);
  const sBody = new THREE.Mesh(roundedBox(0.85, 1.0, 0.75, 0.06), scrubGray);
  sBody.position.y = 0.55; sBody.castShadow = true; scrubber.add(sBody);
  for (let r = 0.12; r <= 0.32; r += 0.07) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 40), plasticDark);
    ring.position.set(0, 0.6, 0.38); scrubber.add(ring);
  }
  const sSpokes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.012, 0.012), plasticDark, 4);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    _o.position.set(Math.cos(a) * 0.16, 0.6 + Math.sin(a) * 0.16, 0.38);
    _o.rotation.set(0, 0, a); _o.updateMatrix();
    sSpokes.setMatrixAt(i, _o.matrix);
  }
  sSpokes.instanceMatrix.needsUpdate = true; scrubber.add(sSpokes);
  const sHandle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24, Math.PI), plasticDark);
  sHandle.position.set(0, 1.08, 0); scrubber.add(sHandle);
  const sLed = new THREE.Mesh(new THREE.CircleGeometry(0.02, 10), ledGreen);
  sLed.position.set(0.3, 0.95, 0.38); scrubber.add(sLed);
  const scrubHit = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
  scrubHit.position.y = 0.6; scrubHit.userData.key = "scrub"; scrubber.add(scrubHit);
  const scrubFront = scrubber.localToWorld(V(0, 0.6, 0.45));
  const scrubDir = scrubber.localToWorld(V(0, 0.6, 0.0)).sub(scrubFront).normalize();
  const NSC = mobile ? 0 : [0, 34, 54][Q_MAX];
  const scPos = new Float32Array(NSC * 3), scVel = new Float32Array(NSC * 3);
  function scSpawn(i, init) {
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 0.7;
    scPos[i * 3] = scrubFront.x + Math.cos(a) * r + (init ? scrubDir.x * Math.random() * 1.2 : 0);
    scPos[i * 3 + 1] = scrubFront.y + Math.sin(a) * r * 0.7 + (init ? Math.random() * 0.6 : 0);
    scPos[i * 3 + 2] = scrubFront.z + Math.sin(a) * r + (init ? scrubDir.z * Math.random() * 1.2 : 0);
    const s = 0.7 + Math.random() * 0.6;
    scVel[i * 3] = scrubDir.x * s; scVel[i * 3 + 1] = scrubDir.y * s; scVel[i * 3 + 2] = scrubDir.z * s;
  }
  for (let i = 0; i < NSC; i++) scSpawn(i, true);
  const scGeo = new THREE.BufferGeometry(); scGeo.setAttribute("position", new THREE.BufferAttribute(scPos, 3));
  const scrubAir = new THREE.Points(scGeo, new THREE.PointsMaterial({ size: 0.06, map: dotTexture(), color: 0xbdf4ee, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
  scrubAir.frustumCulled = false; scrubAir.visible = NSC > 0; jobSite.add(scrubAir);

  // ============================================================
  // WALL OUTLET + CORD
  // ============================================================
  const outletBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.05), outletWhite);
  outletBox.position.set(4.6, 0.4, -5.93); jobSite.add(outletBox);
  [-0.04, 0.04].forEach((sy) => {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.01), signBlack);
    slot.position.set(4.6, 0.4 + sy, -5.9); jobSite.add(slot);
  });
  const cord2 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    V(4.6, 0.32, -5.9), V(4.7, 0.2, -5.2), V(4.6, 0.18, -4.2), V(4.45, 0.3, -3.3),
  ], false, "catmullrom", 0.3), 40, 0.025, 8, false), cordMat);
  jobSite.add(cord2);

  // ============================================================
  // WORK LIGHT TRIPOD
  // ============================================================
  const workTripod = new THREE.Group(); workTripod.position.set(2.6, 0, 2.2); jobSite.add(workTripod);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.7, 8), new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.6, metalness: 0.4 }));
    leg.position.set(Math.cos(a) * 0.22, 0.82, Math.sin(a) * 0.22);
    leg.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22);
    workTripod.add(leg);
  }
  const lightHead = new THREE.Mesh(roundedBox(0.34, 0.26, 0.12, 0.03), new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.55, metalness: 0.3 }));
  lightHead.position.y = 1.72; workTripod.add(lightHead);
  const lightFace = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.2), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
  lightFace.position.set(0, 1.72, 0.065); workTripod.add(lightFace);
  const lightHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0xffc07a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  lightHalo.scale.set(1.6, 1.6, 1); lightHalo.position.set(0, 1.72, 0.12); workTripod.add(lightHalo);
  const workSpot = new THREE.SpotLight(0xffc07a, 55, 20, 0.75, 0.55, 1.3);
  workSpot.position.set(2.6, 1.72, 2.2);
  workSpot.castShadow = false;
  if (!mobile) {
    workSpot.shadow.mapSize.set(1024, 1024);
    workSpot.shadow.bias = -0.0004; workSpot.shadow.radius = 4;
  }
  const workTarget = new THREE.Object3D(); workTarget.position.set(ANCHOR_X - 1.2, 0.2, 0.4);
  jobSite.add(workSpot, workTarget); workSpot.target = workTarget;
  let lightOn = 1, workI = 55;
  const moverGlow = new THREE.PointLight(0xffa64d, 18, 10); jobSite.add(moverGlow);
  const lightHit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
  lightHit.position.y = 1.72; lightHit.userData.key = "light"; workTripod.add(lightHit);

  // ============================================================
  // NEW: WET FOOTPRINT TRAIL (appears on floor, dries with scroll)
  // ============================================================
  const NF = mobile ? 0 : 8;
  const footprintGeo = new THREE.PlaneGeometry(0.22, 0.34);
  const footprintMat = new THREE.MeshBasicMaterial({ color: 0x1a1410, transparent: true, opacity: 0.55, depthWrite: false });
  const footprints = [];
  for (let i = 0; i < NF; i++) {
    const f = new THREE.Mesh(footprintGeo, footprintMat.clone());
    f.rotation.x = -Math.PI / 2;
    const t = i / (NF - 1);
    f.position.set(-1 + t * 2.5 + (Math.random() - 0.5) * 0.15, 0.013, -1 + t * 1.5 + (Math.random() - 0.5) * 0.15);
    f.rotation.z = Math.random() * 0.5 - 0.25;
    jobSite.add(f); footprints.push(f);
  }

  // ============================================================
  // PARTICLES: spray, mist, vapor, jet, dust, ripples, waves, bursts
  // ============================================================
  const NSP = mobile ? 48 : 116;
  const spPos = new Float32Array(NSP * 3), spVel = new Float32Array(NSP * 3), spLife = new Float32Array(NSP);
  function spraySeed(i) {
    const j = i * 3;
    spPos[j] = CRACK.x; spPos[j + 1] = CRACK.y; spPos[j + 2] = CRACK.z;
    _v1.set(PC.x - CRACK.x, -1.6, PC.z - CRACK.z).normalize().multiplyScalar(3.4 + Math.random() * 1.4);
    spVel[j] = _v1.x + (Math.random() - 0.5) * 0.8;
    spVel[j + 1] = _v1.y + Math.random() * 1.2;
    spVel[j + 2] = _v1.z + (Math.random() - 0.5) * 0.8;
    spLife[i] = Math.random();
  }
  for (let i = 0; i < NSP; i++) spraySeed(i);
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
  const spray = new THREE.Points(spGeo, new THREE.PointsMaterial({ size: 0.09, map: dotTexture(), color: 0xd2fbf6, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  spray.frustumCulled = false; jobSite.add(spray);

  const NM = mobile ? 88 : 168;
  const mp = new Float32Array(NM * 3), ms = new Float32Array(NM);
  const mistSeed = (i, wet) => {
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 2.4 * (0.3 + 0.7 * wet);
    mp[i * 3] = PC.x + Math.cos(a) * r;
    mp[i * 3 + 1] = Math.random() * 2.2;
    mp[i * 3 + 2] = PC.z + Math.sin(a) * r;
    ms[i] = 0.25 + Math.random() * 0.45;
  };
  for (let i = 0; i < NM; i++) mistSeed(i, 1);
  const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  const mist = new THREE.Points(mg, new THREE.PointsMaterial({ size: 0.16, map: dotTexture(), color: 0x8fd8d2, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
  mist.frustumCulled = false; jobSite.add(mist);

  const NV = mobile ? 0 : 96;
  const vp = new Float32Array(NV * 3), vs = new Float32Array(NV);
  const vapSeed = (i, wet) => {
    const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 2.2 * (0.3 + 0.7 * wet);
    vp[i * 3] = PC.x + Math.cos(a) * r; vp[i * 3 + 1] = 0.05; vp[i * 3 + 2] = PC.z + Math.sin(a) * r;
    vs[i] = 0.4 + Math.random() * 0.6;
  };
  for (let i = 0; i < NV; i++) vapSeed(i, 1);
  const vg = new THREE.BufferGeometry(); vg.setAttribute("position", new THREE.BufferAttribute(vp, 3));
  const vapor = new THREE.Points(vg, new THREE.PointsMaterial({ size: 0.22, map: dotTexture(), color: 0xd8d2c8, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
  vapor.frustumCulled = false; vapor.visible = false; jobSite.add(vapor);

  const NJ = level === 2 ? 150 : (level === 1 ? 64 : 0);
  const jp = new Float32Array(NJ * 3), jv = new Float32Array(NJ * 3), jl = new Float32Array(NJ);
  const jg = new THREE.BufferGeometry(); jg.setAttribute("position", new THREE.BufferAttribute(jp, 3));
  const jet = new THREE.Points(jg, new THREE.PointsMaterial({ size: 0.07, map: dotTexture(), color: 0xbdf4ee, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  jet.frustumCulled = false; jet.visible = NJ > 0; jobSite.add(jet);

  const ND = mobile ? 96 : 192, dp = new Float32Array(ND * 3);
  for (let i = 0; i < ND; i++) {
    dp[i * 3] = (Math.random() - 0.5) * 16;
    dp[i * 3 + 1] = Math.random() * 5;
    dp[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.05, map: dotTexture(), color: 0xd8cbb8, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.frustumCulled = false; jobSite.add(dust);

  const ripples = [];
  const ripGeo = new THREE.RingGeometry(0.3, 0.34, 32).rotateX(-Math.PI / 2);
  for (let i = 0; i < 10; i++) {
    const r = new THREE.Mesh(ripGeo, new THREE.MeshBasicMaterial({ color: 0xf0ede6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    r.position.y = 0.02; r.visible = false; jobSite.add(r); ripples.push({ m: r, age: 9 });
  }
  function spawnRipple(x, z) {
    for (const r of ripples) if (r.age > 0.9) { r.age = 0; r.m.visible = true; r.m.position.x = x; r.m.position.z = z; return; }
  }

  const waves = [];
  const waveGeo = new THREE.RingGeometry(0.5, 0.56, 40);
  for (let i = 0; i < 8; i++) {
    const w = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({ color: 0xffc07a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    w.visible = false; jobSite.add(w); waves.push({ m: w, age: 9 });
  }
  function spawnWave(pos) {
    for (const w of waves) if (w.age > 0.7) { w.age = 0; w.m.visible = true; w.m.position.copy(pos); return; }
  }

  const NB2 = mobile ? 48 : 84;
  const bPos = new Float32Array(NB2 * 3), bVel = new Float32Array(NB2 * 3), bLife = new Float32Array(NB2), bCol = new Float32Array(NB2 * 3);
  for (let i = 0; i < NB2; i++) bLife[i] = 9;
  const bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
  bGeo.setAttribute("color", new THREE.BufferAttribute(bCol, 3));
  const burst = new THREE.Points(bGeo, new THREE.PointsMaterial({ size: 0.11, map: sparkTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  burst.frustumCulled = false; jobSite.add(burst);
  let bCur = 0;
  function spawnBurst(pos, col, n, speed) {
    for (let k = 0; k < n; k++) {
      const i = bCur = (bCur + 1) % NB2, j = i * 3;
      bPos[j] = pos.x; bPos[j + 1] = pos.y; bPos[j + 2] = pos.z;
      const a = Math.random() * 6.283, b2 = Math.random() * Math.PI * 0.5;
      const s = speed * (0.5 + Math.random());
      bVel[j] = Math.cos(a) * Math.cos(b2) * s;
      bVel[j + 1] = Math.sin(b2) * s;
      bVel[j + 2] = Math.sin(a) * Math.cos(b2) * s;
      bCol[j] = col.r; bCol[j + 1] = col.g; bCol[j + 2] = col.b;
      bLife[i] = 0;
    }
  }
  const SPLASH = new THREE.Color(0.85, 0.88, 0.9), DUSTW = new THREE.Color(1.0, 0.72, 0.38);

  // Air mover jet spot + shaft + pulse rings
  const jetSpotM = new THREE.SpotLight(0xffe6c0, 0, 14, 0.55, 0.65, 1.2);
  const jetTarget = new THREE.Object3D();
  jobSite.add(jetSpotM, jetTarget); jetSpotM.target = jetTarget;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 1.5, 6, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe6c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  jobSite.add(shaft);
  const pulseRings = [];
  for (let i = 0; i < 5; i++) {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 56).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    r.position.y = 0.06; jobSite.add(r); pulseRings.push(r);
  }

// ============================================================
// DETAIL BLOCK — new props, wall damage, additional equipment
// ============================================================
var __c1=jobSite.children.length;
// 1. Wall electrical panel with breakers
const panelBox = new THREE.Mesh(roundedBox(0.55, 0.75, 0.12, 0.03), steelGalv);
panelBox.position.set(5.8, 3.2, -5.9); jobSite.add(panelBox);
const panelDoor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.015), new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.55, metalness: 0.5 }));
panelDoor.position.set(5.8, 3.2, -5.83); jobSite.add(panelDoor);
const panelHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.02), plasticDark);
panelHandle.position.set(5.96, 3.2, -5.82); jobSite.add(panelHandle);
const breakers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), plasticDark, 8);
for (let i = 0; i < 8; i++) {
  const col = i % 2, row = Math.floor(i / 2);
  _o.position.set(5.68 + col * 0.08, 3.44 - row * 0.06, -5.82);
  _o.rotation.set(0, 0, 0); _o.updateMatrix();
  breakers.setMatrixAt(i, _o.matrix);
}
breakers.instanceMatrix.needsUpdate = true; jobSite.add(breakers);

jobSite.children.slice(__c1).forEach(o=>o.visible=false);
// 2. Second work light tripod (smaller, aimed at pipe)
const tripod2 = new THREE.Group(); tripod2.position.set(-3.8, 0, -2.2); tripod2.rotation.y = -0.6; jobSite.add(tripod2);
for (let i = 0; i < 3; i++) {
  const a = (i / 3) * Math.PI * 2 + 0.4;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1.4, 8), plasticDark);
  leg.position.set(Math.cos(a) * 0.18, 0.68, Math.sin(a) * 0.18);
  leg.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2);
  tripod2.add(leg);
}
const head2 = new THREE.Mesh(roundedBox(0.28, 0.22, 0.1, 0.03), plasticDark);
head2.position.y = 1.42; tripod2.add(head2);
const face2 = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.16), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
face2.position.set(0, 1.42, 0.055); tripod2.add(face2);
const halo2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0xffc07a, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
halo2.scale.set(1.2, 1.2, 1); halo2.position.set(0, 1.42, 0.1); tripod2.add(halo2);

var __c3=jobSite.children.length;
// 3. Push broom leaning against wall
const broom = new THREE.Group(); broom.position.set(-5.2, 0, -4.2); broom.rotation.z = 0.22; broom.rotation.y = 0.4; jobSite.add(broom);
const broomHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.5, 10), new THREE.MeshStandardMaterial({ color: 0xa87848, roughness: 0.75 }));
broomHandle.position.y = 0.75; broom.add(broomHandle);
const broomHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.14), plasticDark);
broomHead.position.y = 0.04; broom.add(broomHead);
const broomBristles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.09, 0.02), new THREE.MeshStandardMaterial({ color: 0xd8b878, roughness: 0.9 }), 16);
for (let i = 0; i < 16; i++) {
  _o.position.set(-0.22 + i * 0.03, -0.05, 0);
  _o.rotation.set(0, 0, 0); _o.updateMatrix();
  broomBristles.setMatrixAt(i, _o.matrix);
}
broomBristles.instanceMatrix.needsUpdate = true; broom.add(broomBristles);

jobSite.children.slice(__c3).forEach(o=>o.visible=false);
var __c4=jobSite.children.length;
// 4. Floor register (HVAC vent) with wet stain ring
const registerBase = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.28), steelGalv);
registerBase.position.set(3.8, 0.012, 2.5); jobSite.add(registerBase);
const registerSlats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.36, 0.005, 0.02), plasticDark, 6);
for (let i = 0; i < 6; i++) {
  _o.position.set(3.8, 0.026, 2.4 + i * 0.04);
  _o.rotation.set(0.4, 0, 0); _o.updateMatrix();
  registerSlats.setMatrixAt(i, _o.matrix);
}
registerSlats.instanceMatrix.needsUpdate = true; jobSite.add(registerSlats);
const registerStain = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.36, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x1a1008, transparent: true, opacity: 0.4, depthWrite: false }));
registerStain.position.set(3.8, 0.016, 2.5); jobSite.add(registerStain);

jobSite.children.slice(__c4).forEach(o=>o.visible=false);
var __c5=jobSite.children.length;
// 5. Wall clock (broken, hanging crooked)
const clockBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 32), plasticDark);
clockBody.rotation.x = Math.PI / 2; clockBody.position.set(-4.6, 5.2, -5.92); jobSite.add(clockBody);
const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshBasicMaterial({ color: 0xf0ede6 }));
clockFace.position.set(-4.6, 5.2, -5.89); jobSite.add(clockFace);
const clockTick = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.02, 0.001), new THREE.MeshBasicMaterial({ color: 0x111111 }), 12);
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2;
  _o.position.set(-4.6 + Math.cos(a) * 0.15, 5.2 + Math.sin(a) * 0.15, -5.888);
  _o.rotation.set(0, 0, a - Math.PI / 2); _o.updateMatrix();
  clockTick.setMatrixAt(i, _o.matrix);
}
clockTick.instanceMatrix.needsUpdate = true; jobSite.add(clockTick);
const clockHand = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.13, 0.001), new THREE.MeshBasicMaterial({ color: 0xd12a2a }));
clockHand.geometry.translate(0, 0.06, 0); clockHand.position.set(-4.6, 5.2, -5.887); clockHand.rotation.z = -0.8; jobSite.add(clockHand);

jobSite.children.slice(__c5).forEach(o=>o.visible=false);
var __c6=jobSite.children.length;
// 6. Insurance claim paperwork on floor
const paperMat = new THREE.MeshStandardMaterial({ color: 0xf2ede0, roughness: 0.85, side: THREE.DoubleSide });
for (let i = 0; i < 3; i++) {
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.55), paperMat);
  paper.rotation.x = -Math.PI / 2;
  paper.rotation.z = 0.1 + i * 0.3;
  paper.position.set(1.8 + i * 0.35, 0.014 + i * 0.001, -3.6 + i * 0.2);
  jobSite.add(paper);
  // Red stamp mark
  const stamp = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.08, 16), new THREE.MeshBasicMaterial({ color: 0xc23a3a, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  stamp.rotation.x = -Math.PI / 2;
  stamp.position.set(1.8 + i * 0.35 + 0.08, 0.015 + i * 0.001, -3.6 + i * 0.2 + 0.1);
  jobSite.add(stamp);
}

jobSite.children.slice(__c6).forEach(o=>o.visible=false);
var __c7=jobSite.children.length;
// 7. Ceiling water stain (soft dark patch above puddle)
const ceilingStain = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32).rotateX(Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x2a1e10, transparent: true, opacity: 0.4, depthWrite: false }));
ceilingStain.position.set(PC.x, 6.5, PC.z); jobSite.add(ceilingStain);
const ceilingRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 32).rotateX(Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x150c05, transparent: true, opacity: 0.55, depthWrite: false }));
ceilingRing.position.set(PC.x, 6.5, PC.z); jobSite.add(ceilingRing);

jobSite.children.slice(__c7).forEach(o=>o.visible=false);
var __c8=jobSite.children.length;
// 8. Hanging ceiling drip cord (slow drip from ceiling)
const dripCord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.4, 6), new THREE.MeshBasicMaterial({ color: 0x1a1208, transparent: true, opacity: 0.6 }));
dripCord.position.set(PC.x + 0.15, 6.3, PC.z - 0.1); jobSite.add(dripCord);

jobSite.children.slice(__c8).forEach(o=>o.visible=false);
var __c9=jobSite.children.length;
// 9. HVAC register deflector (angled metal plate)
const deflector = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.3), steelGalv);
deflector.position.set(-2.2, 0.6, 4.2); deflector.rotation.x = 0.3; jobSite.add(deflector);

jobSite.children.slice(__c9).forEach(o=>o.visible=false);
var __c10=jobSite.children.length;
// 10. Peeling paint patch on wall (irregular plane)
const peelGeo = new THREE.PlaneGeometry(0.9, 0.5);
const peel = new THREE.Mesh(peelGeo, new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.85, side: THREE.DoubleSide }));
peel.position.set(-3.2, 3.5, -5.94); peel.rotation.z = 0.15; jobSite.add(peel);
const peelEdge = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.5, 12), new THREE.MeshBasicMaterial({ color: 0x3a2a1a, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
peelEdge.scale.set(1.3, 0.6, 1); peelEdge.position.set(-3.2, 3.5, -5.935); jobSite.add(peelEdge);

jobSite.children.slice(__c10).forEach(o=>o.visible=false);
var __c11=jobSite.children.length;
// 11. Wall-mounted moisture sensor (small white box with green readout)
const sensorBox = new THREE.Mesh(roundedBox(0.28, 0.18, 0.06, 0.02), outletWhite);
sensorBox.position.set(2.4, 2.2, -5.92); jobSite.add(sensorBox);
const sensorScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.11), new THREE.MeshBasicMaterial({ color: 0x1a3a2a }));
sensorScreen.position.set(2.4, 2.2, -5.885); jobSite.add(sensorScreen);
const sensorLed = new THREE.Mesh(new THREE.CircleGeometry(0.012, 10), ledGreen);
sensorLed.position.set(2.52, 2.26, -5.884); jobSite.add(sensorLed);
const sensorHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0x35d17a, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
sensorHalo.scale.set(0.35, 0.35, 1); sensorHalo.position.set(2.52, 2.26, -5.8); jobSite.add(sensorHalo);

jobSite.children.slice(__c11).forEach(o=>o.visible=false);
// 12. Contractor's clipboard on the extractor lid
const clipboard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.012), new THREE.MeshStandardMaterial({ color: 0xa87848, roughness: 0.7 }));
clipboard.position.set(-0.2, 1.32, 0.15); clipboard.rotation.x = -0.15; extractor.add(clipboard);
const clipboardPaper = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.26), paperMat);
clipboardPaper.position.set(-0.2, 1.33, 0.16); clipboardPaper.rotation.x = -0.15; extractor.add(clipboardPaper);
const clipboardClip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.02), steelGalv);
clipboardClip.position.set(-0.2, 1.47, 0.15); extractor.add(clipboardClip);

// 13. Small portable fan on floor (secondary)
const fanBody = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.15, 32, 1, true).rotateX(Math.PI / 2), polyBlue);
fanBody.position.set(-3.6, 0.35, 3.2); jobSite.add(fanBody);
const fanBlades2 = new THREE.Group(); fanBlades2.position.set(-3.6, 0.35, 3.2); jobSite.add(fanBlades2);
for (let i = 0; i < 4; i++) {
  const bl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.005), steelGalv);
  bl.rotation.z = (i / 4) * Math.PI * 2; fanBlades2.add(bl);
}
const fanStand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), plasticDark);
fanStand.position.set(-3.6, 0.15, 3.2); jobSite.add(fanStand);
const fanFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 16), plasticDark);
fanFoot.position.set(-3.6, 0.01, 3.2); jobSite.add(fanFoot);

var __c14=jobSite.children.length;
// 14. Cable run along wall (drip loop)
const dripCable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
  V(-5.8, 1.8, -5.9), V(-5.4, 1.2, -5.85), V(-5.0, 0.6, -5.88), V(-4.6, 0.8, -5.85), V(-4.2, 1.5, -5.88),
], false, "catmullrom", 0.3), 40, 0.02, 6, false), cordMat);
jobSite.add(dripCable);

jobSite.children.slice(__c14).forEach(o=>o.visible=false);
var __c15=jobSite.children.length;
// 15. Corner wall crack (short diagonal line of small dark boxes)
for (let i = 0; i < 8; i++) {
  const ck = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.008), new THREE.MeshBasicMaterial({ color: 0x1a1208 }));
  ck.position.set(-6.5 + i * 0.08, 4.6 - i * 0.12, -5.94);
  ck.rotation.z = 0.9; jobSite.add(ck);
}

jobSite.children.slice(__c15).forEach(o=>o.visible=false);
// Fan housing parts must hide at start so they appear with the blades (REV at 0.68)
[fanBody, fanStand, fanFoot].forEach(o => o.visible = false);
jobSite.traverse((mm) => { if (!mm.isMesh || !mm.material) return; const mt = mm.material; if (mt.transparent || mt.isShaderMaterial || mt.isShadowMaterial || mt.isMeshBasicMaterial || mm.geometry.type === 'PlaneGeometry' || mm.geometry.type === 'RingGeometry') return; mm.geometry.computeBoundingSphere(); if (mm.geometry.boundingSphere.radius < 0.05) return; mm.castShadow = true; });

  // ============================================================
  // INTERACTION
  // ============================================================
  const hitMeshes = [moverHit, dehuHit, meterHit, puddle, scrubHit, lightHit, exHit];
  const lastHitPoint = new THREE.Vector3();
  let hovered = null, frameNo = 0, boost = 0, boostKick = 0, meterSpike = 0, dehuFlash = 0, scrubHover = 0, exHover = 0;
  let pints = 0;
  canvas.addEventListener("pointerdown", () => {
    if (!hovered) return;
    if (hovered === "mover") {
      boostKick = 1;
      _v1.setFromMatrixPosition(mouthAnchor.matrixWorld);
      spawnWave(_v1); spawnBurst(_v1, DUSTW, 14, 2.5);
    } else if (hovered === "puddle") {
      spawnBurst(lastHitPoint, SPLASH, 18, 2.2);
      spawnRipple(lastHitPoint.x, lastHitPoint.z);
      meterSpike = 1;
    } else if (hovered === "dehu") {
      pints += 3; dehuFlash = 1;
      spawnWave(dehu.position.clone().setY(1.2));
    } else if (hovered === "meter") {
      meterSpike = 1;
    } else if (hovered === "scrub") {
      boostKick = 0.6;
      spawnWave(scrubFront);
    } else if (hovered === "light") {
      lightOn = lightOn ? 0 : 1;
    } else if (hovered === "extractor") {
      boostKick = 0.8;
      spawnWave(extractor.position.clone().setY(0.6));
      spawnBurst(extractor.position.clone().setY(0.6), SPLASH, 12, 2.0);
    }
  });

  // ============================================================
  // LCD DRAWS
  // ============================================================
  let lcdClock = 0;
  function drawMeter(moist) {
    mCtx.fillStyle = "#0b3d2e"; mCtx.fillRect(0, 0, 256, 128);
    mCtx.fillStyle = "#7dffb0"; mCtx.font = "bold 40px monospace";
    mCtx.fillText("MOIST " + Math.round(moist).toString().padStart(2, "0") + "%", 14, 56);
    mCtx.strokeStyle = "#1d6b4a"; mCtx.strokeRect(14, 76, 228, 26);
    const w2 = Math.max(0, Math.min(1, moist / 100)) * 224;
    mCtx.fillStyle = moist > 60 ? "#ff5d5d" : moist > 30 ? "#ffd166" : "#7dffb0";
    mCtx.fillRect(16, 78, w2, 22);
    mTex.needsUpdate = true;
  }
  function drawDehu(rh, pt) {
    dCtx.fillStyle = "#1a1408"; dCtx.fillRect(0, 0, 256, 128);
    dCtx.fillStyle = "#ffb060"; dCtx.font = "bold 34px monospace";
    dCtx.fillText("RH " + Math.round(rh) + "%", 16, 50);
    dCtx.fillText("PINT " + pt.toFixed(1), 16, 96);
    dTex.needsUpdate = true;
  }
  drawMeter(87); drawDehu(75, 0);

  // ============================================================
  // ADAPTIVE
  // ============================================================
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; let _sf = 0;
  S.onFrame(() => { renderer.shadowMap.needsUpdate = (++_sf & 1) === 0; });   // shadows refresh every 2nd frame
  const perf = { acc: 0, n: 0, cool: 0 };
  function applyLevel() {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, [1, 1.25, 1.5][level]));
    caustics.visible = level === 2;
    vapor.visible = NV > 0 && level >= 1;
    jet.visible = NJ > 0 && level >= 1;
    shaft.visible = level >= 1;
    scrubAir.visible = NSC > 0 && level >= 1;
    dust.visible = level >= 1;
    mist.geometry.setDrawRange(0, level === 0 ? 140 : NM);
    scGeo.setDrawRange(0, level === 0 ? 40 : NSC);
    if (!mobile && workSpot.shadow.map) {
      const sm = 1024;
      if (workSpot.shadow.map.width !== sm) {
        workSpot.shadow.mapSize.set(sm, sm);
        workSpot.shadow.map.dispose(); workSpot.shadow.map = null;
      }
    }
  }
  applyLevel();
  function adapt(dt) {
    perf.acc += dt; perf.n++;
    if (perf.cool > 0) perf.cool -= dt;
    if (perf.n >= 120) {
      const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
      if (perf.cool <= 0) {
        if (avg > 0.022 && level > 0) { level--; applyLevel(); perf.cool = 2.5; }
        else if (avg < 0.0155 && level < Q_MAX) { level++; applyLevel(); perf.cool = 2.5; }
      }
    }
  }

  // ============================================================
  // ANIMATION LOOP
  // ============================================================
  // ---------- progressive reveal: the site fills with equipment one piece at a time ----------
  const REV = [[sign, 0.0], [meter, 0.05], [extractor, 0.12], [mover, 0.18], [tripod, 0.26], [dehu, 0.33], [sheet, 0.4], [scrubber, 0.47], [workTripod, 0.54], [tripod2, 0.6], [broom, 0.64], [fanBody, 0.68], [fanBlades2, 0.68], [fanStand, 0.68], [fanFoot, 0.68]]
    .map(([o, at]) => ({ o, at, y0: o.position.y, s0: o.scale.x, landed: false }));
  const visChain = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  // ---------- WOW: golden "dry front" sweeps across the floor as the hall heals ----------
  const dryRing = [0, 1].map((i) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: i ? 0xffffff : 0xa7dbe1, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(PC.x, 0.035, PC.z); m.visible = false; jobSite.add(m); return m;
  });
  let healBurst = false;
  S.onFrame((dt, t, p, m) => {
    frameNo++; adapt(dt);
    const wet = 1 - smooth(0.15, 0.9, p);
    const leakOn = 1 - smooth(0.02, 0.18, p);
    const dryOn = smooth(0.08, 0.35, p);
    const floorDry = smooth(0.55, 0.95, p);          // floor morph
    boostKick = Math.max(0, boostKick - dt * 1.4);
    meterSpike = Math.max(0, meterSpike - dt * 1.6);
    dehuFlash = Math.max(0, dehuFlash - dt * 2);

    for (const r of REV) {
      const k = clamp01((p - r.at) / 0.07), o = r.o;
      o.visible = k > 0.001; o.scale.setScalar(Math.max(0.001, r.s0 * eOB(k)));
      o.position.y = r.y0 + (1 - eOC(k)) * 2.6;
      if (k >= 1 && !r.landed) { r.landed = true; _v3.set(o.position.x, 0.05, o.position.z); spawnWave(_v3); spawnRipple(o.position.x, o.position.z); spawnBurst(_v3.setY(0.2), SPLASH, 16, 2.4); }
      if (k <= 0) r.landed = false;
      if (r.o === dehu) r.o.userData.baseY = r.o.position.y;
    }

    if (frameNo % 2 === 0) {
      raycaster.setFromCamera(_v2.set(m.x, -m.y, 0), camera);
      const hits = raycaster.intersectObjects(hitMeshes.filter(visChain), false);
      const nh = hits.length ? hits[0].object.userData.key : null;
      if (hits.length) lastHitPoint.copy(hits[0].point);
      if (nh !== hovered) { hovered = nh; canvas.style.cursor = hovered ? "pointer" : "default"; }
    }
    const hoverBoost = hovered === "mover" ? 1 : 0;
    scrubHover += ((hovered === "scrub" ? 1 : 0) - scrubHover) * Math.min(1, dt * 4);
    exHover += ((hovered === "extractor" ? 1 : 0) - exHover) * Math.min(1, dt * 4);
    boost += ((hoverBoost + boostKick) - boost) * Math.min(1, dt * 4);

    // Uniforms
    pu.uWet.value = wet; pu.uTime.value = t; shaftU.uT.value = t; shaftU.uI.value = 0.85 + 0.15 * Math.sin(t * 0.5);
    th.uWet.value = wet; th.uTime.value = t;
    th.uShow.value = 0.3 + 0.7 * smooth(0.08, 0.4, p) + (hovered === "puddle" ? 0.3 : 0);
    wallU.uTime.value = t; wallU.uWet.value = wet;
    // realistic grade: cold teal flood -> warm bright restored hall (matches the background crossfade in the page)
    const heal = smooth(0.5, 0.92, p); pu.uHeal.value = heal;
    hemi.color.setHex(0xc8e0e8).lerp(C_WARMW, heal); hemi.groundColor.setHex(0x465960).lerp(C_GRND, heal); hemi.intensity = 0.85 + 0.18 * heal;
    windowFill.color.setHex(0xdbeaf0).lerp(C_WARMW, heal); windowFill.intensity = 1.65 + 0.4 * heal;
    oculus.color.setHex(0xe8f3f6).lerp(C_WARMW, heal); coolRim.intensity = 10 * (1 - heal * 0.5);
    scene.fog.color.setHex(0xc8d9df).lerp(C_FOG, heal); scene.fog.density = 0.009 - 0.006 * heal;
    shaftU.uCol.value.setRGB(0.55, 0.78, 0.84).lerp(C_WARMW, heal); renderer.toneMappingExposure = 1.1 - 0.06 * heal;
    const rk = smooth(0.52, 0.88, p);
    dryRing.forEach((r, i) => { const k = clamp01(rk * 1.2 - i * 0.12); r.visible = k > 0 && k < 1; r.scale.setScalar(0.5 + k * 11); r.material.opacity = Math.sin(Math.PI * k) * (i ? 0.5 : 0.8); });
    if (p > 0.52 && !healBurst) { healBurst = true; _v3.set(PC.x, 0.3, PC.z); spawnBurst(_v3, DUSTW, 60, 3.2); spawnWave(_v3.setY(0.05)); }
    if (p < 0.5) healBurst = false;
    if (caustics.visible) { caustics.material.uniforms.uT.value = t; caustics.material.uniforms.uW.value = wet; }

    // FLOOR MORPH — dry wood crossfades in
    dryTop.material.opacity = floorDry;
    floorWetMat.color.setRGB(0.23, 0.185, 0.15).lerp(C_WET, 1 - floorDry);
    floorWetMat.roughness = 0.16 + floorDry * 0.54;

    // WORK LIGHT
    workI += ((lightOn ? 55 : 0) - workI) * Math.min(1, dt * 6);
    workSpot.intensity = workI * (0.92 + 0.05 * Math.sin(t * 13.7) + 0.03 * Math.sin(t * 31.1)) * (workTripod.visible ? 1 : 0);
    lightFace.material.color.setHSL(0.09, 0.6, 0.2 + 0.55 * (workI / 55));
    lightHalo.material.opacity = 0.55 * (workI / 55);

    // AIR MOVER
    mover.position.set(lerp(5.4, 2.2, smooth(0.1, 0.75, p)), mover.position.y, 0.9);
    moverGlow.position.set(mover.position.x - 1.6, 1.4, 1.4);
    moverGlow.intensity = (18 + boost * 26) * (mover.visible ? 1 : 0);
    const rotorSpeed = (5 + 22 * smooth(0, 0.35, p)) * (1 + boost * 1.3);
    rotor.rotation.z -= rotorSpeed * dt;
    knob.rotation.y += rotorSpeed * dt * 0.05;
    mover.updateWorldMatrix(true, false);
    _v1.setFromMatrixPosition(mouthAnchor.matrixWorld);
    _v2.set(-1, 0.16, 0).applyQuaternion(mover.quaternion).normalize();
    const jetStrength = smooth(0, 0.3, p) * (1 + boost) * (mover.visible ? 1 : 0);
    jetSpotM.position.copy(_v1);
    jetTarget.position.copy(_v1).addScaledVector(_v2, 7);
    jetSpotM.intensity = 50 * jetStrength;
    if (shaft.visible) {
      shaft.position.copy(_v1).addScaledVector(_v2, 3);
      shaft.quaternion.setFromUnitVectors(UP, _v2);
      shaft.material.opacity = 0.06 * jetStrength + Math.sin(t * 3) * 0.012;
    }
    panelLed.material.color.setHSL(0.38, 0.8, 0.35 + 0.2 * Math.sin(t * (4 + boost * 8)));
    bezelHalo.material.opacity = 0.15 + 0.2 * jetStrength + Math.sin(t * 2.5) * 0.05;
    pulseRings.forEach((r, i) => {
      const k = (t * 0.45 + i / pulseRings.length) % 1;
      _v3.copy(_v1).addScaledVector(_v2, k * 6); _v3.y = 0.06;
      r.position.copy(_v3);
      const s = 0.4 + k * 5;
      r.scale.set(s, 1, s);
      r.material.opacity = (1 - k) * (1 - k) * 0.4 * jetStrength;
    });

    // AIR MOVER JET PARTICLES
    if (jet.visible) {
      for (let i = 0; i < NJ; i++) {
        const j = i * 3;
        jl[i] += dt;
        if (jl[i] > 1.6) {
          jl[i] = 0;
          jp[j] = _v1.x + (Math.random() - 0.5) * 0.3;
          jp[j + 1] = _v1.y + (Math.random() - 0.5) * 0.3;
          jp[j + 2] = _v1.z + (Math.random() - 0.5) * 0.3;
          const s = 3.5 + Math.random() * 2.5 + boost * 2;
          jv[j] = _v2.x * s; jv[j + 1] = _v2.y * s - 0.3; jv[j + 2] = _v2.z * s;
        }
        jv[j + 1] -= 0.6 * dt;
        jp[j] += jv[j] * dt + Math.sin(t * 6 + i) * 0.004;
        jp[j + 1] += jv[j + 1] * dt;
        jp[j + 2] += jv[j + 2] * dt;
        if (jp[j + 1] < 0.03) jl[i] = 99;
      }
      jg.attributes.position.needsUpdate = true;
    }

    // SCRUBBER AIR
    if (scrubAir.visible) {
      const sFlow = 0.8 + scrubHover * 1.6;
      for (let i = 0; i < NSC; i++) {
        const j = i * 3;
        scPos[j] += scVel[j] * dt * sFlow;
        scPos[j + 1] += scVel[j + 1] * dt * sFlow;
        scPos[j + 2] += scVel[j + 2] * dt * sFlow;
        const d = Math.hypot(scPos[j] - scrubFront.x, scPos[j + 2] - scrubFront.z);
        if (d < 0.15) scSpawn(i, false);
      }
      scGeo.attributes.position.needsUpdate = true;
      scrubAir.material.opacity = 0.25 + scrubHover * 0.2;
    }
    sLed.material.color.setHSL(0.38, 0.9, 0.35 + scrubHover * 0.25 + 0.08 * Math.sin(t * 5));

    // EXTRACTOR IDLE
    exLed.material.color.setHSL(0.38, 0.9, 0.35 + exHover * 0.3 + 0.08 * Math.sin(t * 3));
    exGaugeNeedle.rotation.z = -0.5 + (0.3 + exHover * 0.4) * Math.sin(t * 1.8);

    // SPRAY
    spray.visible = leakOn > 0.01;
    spray.material.opacity = 0.7 * leakOn;
    if (spray.visible) {
      for (let i = 0; i < NSP; i++) {
        const j = i * 3;
        spVel[j + 1] -= 6 * dt;
        spPos[j] += spVel[j] * dt;
        spPos[j + 1] += spVel[j + 1] * dt;
        spPos[j + 2] += spVel[j + 2] * dt;
        if (spPos[j + 1] < 0.03) {
          if (Math.random() < 0.12) spawnRipple(spPos[j], spPos[j + 2]);
          spraySeed(i);
        }
      }
      spGeo.attributes.position.needsUpdate = true;
    }

    // MIST
    for (let i = 0; i < NM; i++) {
      mp[i * 3 + 1] += ms[i] * dt;
      mp[i * 3] += Math.sin(t + i) * 0.003 + _v2.x * jetStrength * dt * 0.5;
      mp[i * 3 + 2] += _v2.z * jetStrength * dt * 0.5;
      if (mp[i * 3 + 1] > 2.4) mistSeed(i, wet);
    }
    mg.attributes.position.needsUpdate = true;
    mist.material.opacity = 0.12 * wet;

    // VAPOR
    if (vapor.visible) {
      const evap = 0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, Math.max(0, wet)));
      for (let i = 0; i < NV; i++) {
        vp[i * 3 + 1] += vs[i] * dt;
        vp[i * 3] += Math.sin(t * 0.7 + i * 1.7) * 0.004;
        if (vp[i * 3 + 1] > 2.6) vapSeed(i, wet);
      }
      vg.attributes.position.needsUpdate = true;
      vapor.material.opacity = 0.25 * evap * wet;
    }

    // DUST
    dust.rotation.y = t * 0.01;

    // RIPPLES
    for (const r of ripples) {
      if (r.age < 0.9) {
        r.age += dt;
        const k = r.age / 0.9;
        r.m.scale.setScalar(0.4 + k * 2.6);
        r.m.material.opacity = (1 - k) * 0.45;
      } else r.m.visible = false;
    }

    // WAVES
    for (const w of waves) {
      if (w.age < 0.7) {
        w.age += dt;
        const k = w.age / 0.7;
        w.m.scale.setScalar(0.5 + k * 3);
        w.m.material.opacity = (1 - k) * 0.7;
        w.m.lookAt(camera.position);
      } else w.m.visible = false;
    }

    // BURSTS
    for (let i = 0; i < NB2; i++) {
      if (bLife[i] < 1) {
        bLife[i] += dt;
        const j = i * 3;
        bVel[j + 1] -= 4 * dt;
        bPos[j] += bVel[j] * dt; bPos[j + 1] += bVel[j + 1] * dt; bPos[j + 2] += bVel[j + 2] * dt;
        bCol[j] *= 0.98; bCol[j + 1] *= 0.98; bCol[j + 2] *= 0.98;
        if (bLife[i] > 0.99) { bCol[j] = 0; bCol[j + 1] = 0; bCol[j + 2] = 0; }
      }
    }
    bGeo.attributes.position.needsUpdate = true;
    bGeo.attributes.color.needsUpdate = true;

    // BUCKET DRIPS
    if (bucketDrips.visible) {
      for (let i = 0; i < NDP; i++) {
        dpVel[i] += 3.5 * dt;
        dpPos[i * 3 + 1] -= dpVel[i] * dt;
        if (dpPos[i * 3 + 1] < bWater.position.y) dpSpawn(i);
      }
      dpGeo.attributes.position.needsUpdate = true;
    }

    // BUCKET WATER RISING
    pints += dt * (0.5 + wet * 1.5) * dryOn;
    const level01 = Math.min(1, pints / 40);
    bWater.position.y = 0.08 + level01 * 0.4;

    // DEHU IDLE — vibration adds on top of the REV drop-in position
    dehu.position.y = (dehu.userData.baseY || 0) + Math.sin(t * 38) * 0.0015 * dryOn;
    const alertOn = level01 > 0.8;
    ledRed.color.setHSL(0.0, 0.9, alertOn ? (0.4 + 0.2 * Math.sin(t * 6)) : 0.08);
    alertHalo.material.opacity = alertOn ? (0.25 + 0.2 * Math.sin(t * 6)) : 0;
    dLed.material.color.setHSL(0.38, 0.8, 0.3 + 0.15 * Math.sin(t * 3) + dehuFlash * 0.3);
    dHalo.material.opacity = 0.15 + dehuFlash * 0.4 + dryOn * 0.12;

    // TRIPOD LED
    tLed.material.color.setHSL(0.08, 0.9, 0.4 + 0.25 * (Math.sin(t * 5) > 0.6 ? 1 : 0));
    tHalo.material.opacity = 0.2 + (Math.sin(t * 5) > 0.6 ? 0.25 : 0);

    // METER HALO
    mHalo.material.opacity = 0.2 + meterSpike * 0.45;

    // WET FOOTPRINTS — fade as floor dries
    for (const f of footprints) {
      f.material.opacity = 0.55 * (1 - floorDry);
    }

    // LCDs (4Hz)
    lcdClock += dt;
    if (lcdClock > 0.25) {
      lcdClock = 0;
      const moist = Math.min(99, wet * 87 + meterSpike * 8 + Math.sin(t * 1.7) * 1.5);
      drawMeter(moist);
      drawDehu(40 + wet * 35 - dryOn * 8, pints);
    }

    // ============================================================
    // CAMERA — left-aligned with LOOK_OFFSET, redesigned choreography
    // 0.00 wide establishing → 0.22 toward pipe → 0.45 over equipment
    // → 0.68 close on dehumidifier/meter → 0.85 pulling back → 1.00 hero
    // ============================================================
    const [ang, rad, h, fv, lookY, lx, roll] = track(p, [
      [0.00, -0.55, 13.0, 2.4, 48, 1.6, 2.3,  0.035],  // low wide dutch-angle reveal
      [0.20,  0.05,  9.8, 3.4, 40, 1.8, 2.0,  0.010],  // sweep toward the burst pipe
      [0.42,  0.80,  6.8, 2.8, 34, 1.3, 1.7, -0.020],  // push in over the equipment
      [0.65,  1.40,  5.4, 1.9, 29, 0.9, 1.5,  0.020],  // close low hero move
      [0.85,  1.05,  8.2, 4.6, 36, 1.4, 1.8,  0.000],  // rise and pull back
      [1.00,  0.30, 11.5, 4.2, 42, 1.6, 2.2,  0.000],  // restored hero frame
    ]);
    const a = ang + m.x * 0.12 + Math.sin(t * 0.3) * 0.006;
    camera.position.set(Math.sin(a) * rad, h - m.y * 0.3 + Math.sin(t * 0.45) * 0.04, Math.cos(a) * rad);
    camera.lookAt(ANCHOR_X + lx * Math.min(1, camera.aspect / 1.6), lookY, 0.2);   // keeps the model on the LEFT
    camera.rotateZ(roll);
    const fvx = fv + 7 * Math.exp(-Math.pow((p - 0.52) / 0.035, 2));   // dolly-zoom kick when the room heals
    if (Math.abs(camera.fov - fvx) > 0.01) { camera.fov = fvx; camera.updateProjectionMatrix(); }
  });

  S.render();
  return S;
}
