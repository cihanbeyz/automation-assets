// core.js — unified stage for all three god-tier models (three r160)
// Combines the best of both previous cores:
//   • Catmull-Rom track() — continuous camera choreography, no stop-go at keys
//   • Inertial, frame-rate-independent scroll smoothing
//   • Vertex-coloured sky sphere env → PMREM (soft, natural reflections)
//   • fadeTexture() soft alpha mask for floor planes
//   • Shared FX factories: spark pools, ripple rings, halo sprites, LCD panels
//   • Shared shaders: caustics, grid, pipe pulse
//   • Adaptive quality tiers (opt-in via adaptive: true)
//   • Context-loss recovery, tab-hidden pause, offscreen pause, reduced-motion
//   • setProgress() kept as a no-op so any legacy HTML still works
//   • Transparent canvas mode for HTML-image-background composites
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
export { THREE };

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Catmull-Rom through keyframe rows [p, v1, v2, ...] → [v1, v2, ...]
// Continuous acceleration across keys (no stop-go at keyframes).
export function track(p, rows) {
  const n = rows.length;
  if (p <= rows[0][0]) return rows[0].slice(1);
  if (p >= rows[n - 1][0]) return rows[n - 1].slice(1);
  let i = 0; while (p > rows[i + 1][0]) i++;
  const t = (p - rows[i][0]) / (rows[i + 1][0] - rows[i][0]);
  const r0 = rows[Math.max(0, i - 1)], r1 = rows[i], r2 = rows[i + 1], r3 = rows[Math.min(n - 1, i + 2)];
  const t2 = t * t, t3 = t2 * t;
  return r1.slice(1).map((_, k) => {
    const a = r0[k + 1], b = r1[k + 1], c = r2[k + 1], d = r3[k + 1];
    return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  });
}

// 0 = low (mobile / weak CPU), 1 = high, 2 = ultra
export function deviceTier() {
  const mobile = matchMedia("(max-width: 760px)").matches || /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (!mobile) return ((navigator.hardwareConcurrency || 8) <= 4) ? 1 : 2;
  // Mobile: distinguish flagships from budget. Pure upgrade — no desktop impact.
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const ua = navigator.userAgent;
  const appleSilicon = /iPhone|iPad/.test(ua) && cores >= 6;
  if (cores >= 6 && mem >= 6) return 1;
  if (appleSilicon) return 1;
  return 0;
}

// ---------- cached procedural textures (created once per page) ----------
function cv(s) { const c = document.createElement("canvas"); c.width = c.height = s; return [c, c.getContext("2d")]; }
function radial(s, stops) {
  const [c, x] = cv(s), g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function grain(s, lo, hi) {
  const [c, x] = cv(s), d = x.createImageData(s, s);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = lo + Math.random() * (hi - lo);
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

let _dot = null;
export function dotTexture() {
  if (_dot) return _dot;
  return (_dot = radial(64, [
    [0, "rgba(255,255,255,1)"],
    [0.35, "rgba(255,255,255,.45)"],
    [1, "rgba(255,255,255,0)"],
  ]));
}
let _spark = null;
export function sparkTexture() {
  if (_spark) return _spark;
  const s = 128, [c, x] = cv(s), cx = s / 2, cy = s / 2;
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, cx);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.65)");
  g.addColorStop(0.55, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  x.strokeStyle = "rgba(255,255,255,0.55)"; x.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    x.beginPath(); x.moveTo(cx, cy);
    x.lineTo(cx + Math.cos(a) * cx, cy + Math.sin(a) * cx); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (_spark = t);
}
let _rough = null;
export function roughTexture() { if (_rough) return _rough; return (_rough = grain(512, 150, 255)); }
let _noise = null;
export function noiseTexture() { if (_noise) return _noise; return (_noise = grain(256, 90, 255)); }

// Soft alpha mask for floor planes: fades side + front edges, keeps back edge solid.
export function fadeTexture(side = 0.28, front = 0.4) {
  const S = 256, [c, x] = cv(S), d = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / (S - 1), v = j / (S - 1);
    const a = Math.min(smooth(0, side, u), smooth(0, side, 1 - u), smooth(0, front, 1 - v)) * 255;
    const k = (j * S + i) * 4;
    d.data[k] = d.data[k + 1] = d.data[k + 2] = a; d.data[k + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return new THREE.CanvasTexture(c);
}

// ---------- geometry helpers ----------
export function roundedBox(w, h, d, r, bev = 0.04, seg = 8) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: d - bev * 2, bevelEnabled: true,
    bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: seg,
  });
  g.translate(0, 0, -(d - bev * 2) / 2);
  return g;
}
export function boltGeo(r = 0.03, h = 0.02) {
  const g = new THREE.CylinderGeometry(r, r, h, 6);
  g.rotateX(Math.PI / 2);
  return g;
}

// ---------- shared FX factories ----------
export function haloSprite(color = 0xffffff, scale = 1, opacity = 0.4) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sparkTexture(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  s.scale.set(scale, scale, 1);
  return s;
}

export function makeSparkPool(scene, { count = 140, size = 0.12, gravity = 3.5 } = {}) {
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const life = new Float32Array(count).fill(9);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size, map: sparkTexture(), vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  pts.frustumCulled = false; scene.add(pts);
  let cursor = 0;
  function spawn(p, color, n = 14, speed = 2.5) {
    for (let q = 0; q < n; q++) {
      const i = cursor = (cursor + 1) % count, j = i * 3;
      pos[j] = p.x; pos[j + 1] = p.y; pos[j + 2] = p.z;
      const a = Math.random() * 6.283, b = (Math.random() - 0.5) * Math.PI;
      const s = speed * (0.5 + Math.random());
      vel[j] = Math.cos(a) * Math.cos(b) * s;
      vel[j + 1] = Math.sin(b) * s;
      vel[j + 2] = Math.sin(a) * Math.cos(b) * s;
      col[j] = color.r; col[j + 1] = color.g; col[j + 2] = color.b;
      life[i] = 0;
    }
  }
  function update(dt) {
    const f = Math.exp(-3 * dt);
    for (let i = 0; i < count; i++) {
      if (life[i] < 1) {
        life[i] += dt;
        const j = i * 3;
        vel[j + 1] -= gravity * dt;
        pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
        col[j] *= f; col[j + 1] *= f; col[j + 2] *= f;
        if (life[i] >= 1) col[j] = col[j + 1] = col[j + 2] = 0;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }
  return { spawn, update, points: pts };
}

export function makeRingPool(scene, { count = 8, color = 0x5cd6ff, floor = false, grow = 3.2, lifeSec = 0.7, y = 0.02 } = {}) {
  const geo = floor
    ? new THREE.RingGeometry(0.3, 0.34, 32).rotateX(-Math.PI / 2)
    : new THREE.RingGeometry(0.5, 0.56, 40);
  const rings = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    }));
    m.visible = false;
    if (floor) m.position.y = y;
    scene.add(m);
    rings.push({ m, age: 9 });
  }
  function spawn(p) {
    for (const r of rings) if (r.age > lifeSec) {
      r.age = 0; r.m.visible = true; r.m.position.copy(p);
      if (floor) r.m.position.y = y;
      return;
    }
  }
  function update(dt, camera) {
    for (const r of rings) {
      if (r.age < lifeSec) {
        r.age += dt;
        const k = r.age / lifeSec;
        r.m.scale.setScalar(0.5 + k * grow);
        r.m.material.opacity = (1 - k) * 0.8;
        if (!floor && camera) r.m.lookAt(camera.position);
      } else r.m.visible = false;
    }
  }
  return { spawn, update };
}

export function makeLCD(planeW = 0.62, planeH = 0.31, resW = 256, resH = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = resW; canvas.height = resH;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), new THREE.MeshBasicMaterial({ map: tex }));
  return { mesh, ctx, tex, canvas, flush() { tex.needsUpdate = true; } };
}

// ---------- shared shaders ----------
export function causticsMaterial(color = 0x1e9fcc, strength = 0.5) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(color) }, uW: { value: strength } },
    vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec2 vUv;uniform float uT,uW;uniform vec3 uC;
      void main(){vec2 uv=vUv*8.;float t=uT*0.35;
      float c=sin(uv.x*3.1+t)*sin(uv.y*2.7-t)+sin((uv.x+uv.y)*4.3+t*1.3)+sin(length(uv-4.)*5.-t*2.);
      c=pow(max(0.,c*0.33),3.);
      float fade=1.-smoothstep(.25,.5,length(vUv-.5));
      gl_FragColor=vec4(uC*c,c*fade*uW);}`,
  });
}

export function gridMaterial(color = 0x35e0ff, nx = 44, ny = 44) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(color) }, uN: { value: new THREE.Vector2(nx, ny) } },
    vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec2 vUv;uniform float uT;uniform vec3 uC;uniform vec2 uN;
      void main(){vec2 f=abs(fract(vUv*uN)-.5);float e=min(.5-f.x,.5-f.y);
      float l=1.-smoothstep(0.,.04,e);
      float fade=1.-smoothstep(.1,.72,length(vUv-.5));
      float sc=smoothstep(.96,1.,sin(vUv.y*8.-uT*.8))*.6;
      gl_FragColor=vec4(uC*(.35+sc),l*fade*(.55+sc));}`,
  });
}

export function pulseCoreMaterial(colorA = 0x35e0ff, colorB = 0x8a6bff) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uPhase: { value: 0 }, uOff: { value: 0 }, uBoost: { value: 0 }, uSurge: { value: 0 },
      uCol: { value: new THREE.Color(colorA) }, uCol2: { value: new THREE.Color(colorB) },
    },
    vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec2 vUv;uniform float uPhase,uOff,uBoost,uSurge;uniform vec3 uCol,uCol2;
      void main(){
      float s=vUv.x;
      float head=fract(uPhase+uOff);
      float d=head-s; d=d<0.?d+1.:d;
      float tail=exp(-d*7.)*step(d,.6);
      float tip=exp(-pow((s-head)*60.,2.));
      float h2=fract(uPhase+uOff+0.5);
      float d2=h2-s; d2=d2<0.?d2+1.:d2;
      float tail2=exp(-d2*9.)*step(d2,.5)*uSurge;
      float lines=.5+.5*sin(s*160.-uPhase*60.);
      float g=.16+.1*lines+tail*(1.4+uBoost)+tip*2.+tail2*1.3;
      vec3 col=mix(uCol,uCol2,clamp(tail2*1.6,0.,1.));
      gl_FragColor=vec4(col*g,clamp(g,0.,1.));}`,
  });
}

// ---------- stage ----------
export function createStage(canvas, o = {}) {
  const {
    fov = 40, cam = [0, 2, 10], bg = 0x070a10, fog = 0,
    envColors = [0xffc07a, 0x9db8d2, 0xfff2df, 0x6b6257],
    exposure = 1.15,
    adaptive = false,       // true = core runs adaptive quality
    transparent = false,    // true = transparent canvas (HTML-image background shows through)
  } = o;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = matchMedia("(max-width: 760px)").matches || /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const Q_MAX = deviceTier();
  let level = Q_MAX;
  // Desktop quality lock: if the device is clearly a desktop (wide screen + real mouse)
  // and already at max tier, prevent the adaptive sampler from ever downgrading.
  // Guarantees PC users always see full-quality output.
  const LOCK_TIER = matchMedia("(min-width: 1200px) and (pointer: fine)").matches && Q_MAX === 2;

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: !mobile, alpha: transparent, powerPreference: "high-performance",
  });
  function applyPixelRatio() {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, [1, 1.5, 2][level]));
  }
  applyPixelRatio();
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(bg, transparent ? 0 : 1);

  const scene = new THREE.Scene();
  scene.background = transparent ? null : new THREE.Color(bg);
  scene.fog = (transparent || !fog) ? null : new THREE.FogExp2(bg, fog);

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  camera.position.set(...cam);

  // Procedural sky sphere env (soft gradient) → PMREM for reflections
  const [warm, sky, hor, gnd] = envColors.map(c => new THREE.Color(c));
  const envScene = new THREE.Scene();
  const sgGeo = new THREE.SphereGeometry(30, 32, 16);
  const sgCols = [];
  const posAttr = sgGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i) / 30;
    const c = y > 0 ? hor.clone().lerp(sky, Math.pow(y, 0.7)) : hor.clone().lerp(gnd, Math.pow(-y, 0.5));
    sgCols.push(c.r, c.g, c.b);
  }
  sgGeo.setAttribute("color", new THREE.Float32BufferAttribute(sgCols, 3));
  envScene.add(new THREE.Mesh(sgGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = (c, k, w, h, p) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...p); m.lookAt(0, 0, 0); envScene.add(m);
  };
  panel(warm, 6, 10, 6, [14, 8, 10]);
  panel(sky, 5, 12, 5, [-14, 10, 4]);
  panel(hor, 3, 14, 3, [0, 18, -4]);
  const pm = new THREE.PMREMGenerator(renderer);
  const envRT = pm.fromScene(envScene, 0.04);
  scene.environment = envRT.texture;
  pm.dispose();

  // ---------- quality API ----------
  const qualityFns = [];
  function setQuality(l) {
    const nl = clamp(l | 0, 0, 2);
    if (nl === level) return;
    level = nl;
    applyPixelRatio();
    for (const f of qualityFns) f(level);
  }
  const perf = { acc: 0, n: 0, cool: 0 };
  function sample(dt) {
    perf.acc += dt; perf.n++;
    if (perf.cool > 0) perf.cool -= dt;
    if (perf.n >= 120) {
      const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
      if (LOCK_TIER) return;
      if (perf.cool <= 0) {
        if (avg > 0.030 && level > 0) { setQuality(level - 1); perf.cool = 2.5; }
        else if (avg < 0.0155 && level < Q_MAX) { setQuality(level + 1); perf.cool = 2.5; }
      }
    }
  }

  // ---------- input / loop ----------
  const m = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    m.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    m.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  addEventListener("pointermove", onMove, { passive: true });

  const fns = [];
  let raf = 0, run = false, vis = true, last = 0, t = 0, scrollP = 0, scrollTarget = 0, ext = null;

  function draw(dt) {
    t += dt;
    m.x += (m.tx - m.x) * (1 - Math.exp(-dt * 5));
    m.y += (m.ty - m.y) * (1 - Math.exp(-dt * 5));
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    scrollTarget = ext !== null ? ext : clamp(scrollY / max);
    scrollP += (scrollTarget - scrollP) * (reduce ? 1 : (1 - Math.exp(-dt * 4.5)));
    if (adaptive) sample(dt);
    for (const f of fns) f(dt, t, scrollP, m);
    renderer.render(scene, camera);
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    draw(dt);
  }
  function start() {
    if (run || reduce || !vis || document.hidden) return;
    run = true; last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() { run = false; cancelAnimationFrame(raf); }
  function size() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (reduce) draw(0);
  }
  const ro = new ResizeObserver(size); ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; vis ? start() : stop(); });
  io.observe(canvas);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVis);
  const onLost = (e) => { e.preventDefault(); stop(); };
  const onRestored = () => { size(); start(); };
  canvas.addEventListener("webglcontextlost", onLost, false);
  canvas.addEventListener("webglcontextrestored", onRestored, false);
  size();
  // Pre-compile every shader before the first visible frame.
  // Moves the 1-3s shader-compile stall from "jank on first render" to load time.
  try { renderer.compile(scene, camera); } catch (e) { /* non-fatal */ }
  start();

  function dispose() {
    stop();
    ro.disconnect(); io.disconnect();
    removeEventListener("pointermove", onMove);
    document.removeEventListener("visibilitychange", onVis);
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    const seen = new Set();
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
      mats.forEach((mt) => {
        if (seen.has(mt)) return; seen.add(mt);
        for (const k in mt) {
          const v = mt[k];
          if (v && v.isTexture && v !== _dot && v !== _spark && v !== _rough && v !== _noise) v.dispose();
        }
        mt.dispose();
      });
    });
    if (scene.environment) scene.environment.dispose();
    envRT.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
  }

  return {
    THREE, scene, camera, renderer, mouse: m, reduce, mobile,
    onFrame: (f) => fns.push(f),
    setProgress: (p) => { ext = p; },      // page-driven progress (story track), so morphs finish inside the hero
    getProgress: () => scrollP,
    render: () => draw(0),
    get quality() { return level; },
    maxQuality: Q_MAX,
    setQuality,
    onQuality: (f) => { qualityFns.push(f); },
    dispose,
  };
}