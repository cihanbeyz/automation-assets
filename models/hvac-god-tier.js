// hvac-god-tier.js  v14 — graded for the sky-pavilion background
// Story (scroll 0→1): outdoor unit → opens up (exploded view) → energy burst →
// indoor head assembles → louver opens, cool air flows. Model sits LEFT via a
// projection shift, so the right half stays free for text.
import * as CORE from "./core.js?v=10";
const { createStage, THREE, smooth, track, makeLCD, sparkTexture, roundedBox, boltGeo } = CORE;

const CFG = { OD_YAW: 0.5, FAN_X: -0.3, SHIFT: 0.36 };
const lerp = (a, b, t) => a + (b - a) * t;
const eOC = (t) => 1 - Math.pow(1 - t, 3);
const eOB = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// camera rows: [p, azimuth, elevation, radius, targetY]
const CAM = [
  [0.00, -0.18, 0.14, 6.6, 0.05],
  [0.14,  0.06, 0.12, 6.1, 0.00],
  [0.27,  0.80, 0.16, 5.3, 0.05],
  [0.38,  1.00, 0.10, 4.7, 0.00],
  [0.48,  0.50, 0.06, 5.5, 0.00],
  [0.60,  0.05, -0.10, 5.6, 0.12],
  [0.78, -0.22, -0.20, 4.6, 0.22],
  [1.00, -0.10, -0.27, 4.2, 0.28],
];

// ---------- small helpers ----------
const rr = (s, w, h, r) => {
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
};
const M = (g, m, x, y, z, par) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); if (par) par.add(o); return o; };
const cvs = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; };

function coilTexture() {
  const [c, x] = cvs(128, 128);
  x.fillStyle = "#b8703a"; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 4) { x.fillStyle = "rgba(40,20,8,.55)"; x.fillRect(0, i, 128, 1.5); x.fillStyle = "rgba(255,210,150,.35)"; x.fillRect(0, i + 2, 128, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3); return t;
}
function blobTexture() {
  const [c, x] = cvs(128, 128), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(30,28,40,.55)"); g.addColorStop(1, "rgba(30,28,40,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}

// streak + sparkle air pool (alpha per vertex, zero allocation per frame)
function pool(par, n, hex, size) {
  const sd = new Float32Array(n * 4).map(Math.random);
  const hp = new Float32Array(n * 3), hc = new Float32Array(n * 4), lp = new Float32Array(n * 6), lc = new Float32Array(n * 8);
  const c = new THREE.Color(hex);
  for (let i = 0; i < n; i++) { hc.set([c.r, c.g, c.b, 0], i * 4); lc.set([c.r, c.g, c.b, 0, c.r, c.g, c.b, 0], i * 8); }
  const mk = (a, b) => { const G = new THREE.BufferGeometry(); G.setAttribute("position", new THREE.BufferAttribute(a, 3)); G.setAttribute("color", new THREE.BufferAttribute(b, 4)); return G; };
  const gp = mk(hp, hc), gl = mk(lp, lc);
  const pts = new THREE.Points(gp, new THREE.PointsMaterial({ size, map: sparkTexture(), vertexColors: true, transparent: true, depthWrite: false }));
  const ln = new THREE.LineSegments(gl, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
  pts.frustumCulled = ln.frustumCulled = false; par.add(pts, ln);
  const P1 = new THREE.Vector3(1, 0, 0), P2 = new THREE.Vector3();
  return {
    update(t, o, d, len, spread, speed, alpha, lift) {
      pts.visible = ln.visible = alpha > 0.01;
      if (!pts.visible) return;
      P2.crossVectors(d, P1).normalize();
      let cx = 0, cy = 0, aw = 0;
      const put = (arr, j, u) => {
        const w = Math.sin(u * 9 + aw * 3 + t * 2) * 0.05 * u, L = u * len, yy = cy + w;
        arr[j] = o.x + d.x * L + P1.x * cx + P2.x * yy;
        arr[j + 1] = o.y + d.y * L + P1.y * cx + P2.y * yy + lift * u * u;
        arr[j + 2] = o.z + d.z * L + P1.z * cx + P2.z * yy;
      };
      for (let i = 0; i < n; i++) {
        const k = i * 4, u = (sd[k] + t * speed * (0.6 + 0.8 * sd[k + 1])) % 1;
        aw = sd[k + 2] * 6.283; const rad = Math.sqrt(sd[k + 3]) * (0.12 + spread * u);
        cx = Math.cos(aw) * rad; cy = Math.sin(aw) * rad;
        put(hp, i * 3, u); put(lp, i * 6, u); put(lp, i * 6 + 3, Math.max(0, u - 0.05));
        const e = Math.pow(Math.sin(Math.PI * u), 0.8) * alpha;
        hc[i * 4 + 3] = e; lc[i * 8 + 3] = e;
      }
      gp.attributes.position.needsUpdate = gp.attributes.color.needsUpdate = true;
      gl.attributes.position.needsUpdate = gl.attributes.color.needsUpdate = true;
    },
  };
}

export function mount(canvas) {
  const S = createStage(canvas, {
    cam: [0, 1, 6.6], fov: 38, transparent: true, exposure: 1.0,
    // [sun-warm, sky, horizon, ground] sampled from hvac-bg.jpg
    envColors: [0xffdfa8, 0xa8cdf5, 0xeef3f9, 0xc9bcad],
  });
  const { scene, camera, mobile } = S;
  const _o = new THREE.Object3D();

  // ---------- light rig graded to the background ----------
  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0xd8cdbd, 0.85));
  const key = new THREE.DirectionalLight(0xfff0d6, 2.1); key.position.set(1.5, 9, 3.5);
  key.castShadow = !mobile;
  if (!mobile) { key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 6; Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 22 }); }
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xaad4ff, 0.9); rim.position.set(-6, 3, -4); scene.add(rim);
  const bounce = new THREE.DirectionalLight(0xffddb0, 0.45); bounce.position.set(0, -2, 3); scene.add(bounce);
  const WARM = new THREE.Color(0xfff0d6), COOL = new THREE.Color(0xdcecff);

  // ---------- materials ----------
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xebeff3, roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.3 });
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0xf4f7fa, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
  const wire = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.4, metalness: 0.7 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xc8793f, roughness: 0.3, metalness: 1 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb4bcc5, roughness: 0.28, metalness: 1 });
  const coilTex = coilTexture();
  const coilMat = new THREE.MeshStandardMaterial({ map: coilTex, color: 0x9a6a48, roughness: 0.5, metalness: 0.8 });

  // =====================================================================
  // OUTDOOR UNIT — hollow casing, front plate with ONE circular opening.
  // No inner square plate anywhere: the fan sits straight in the shroud.
  // =====================================================================
  const od = new THREE.Group(); scene.add(od);
  const cas = new THREE.Group(), inner = new THREE.Group(), front = new THREE.Group(), fanG = new THREE.Group();
  od.add(cas, inner, front, fanG);
  const FX = CFG.FAN_X;

  const cs = rr(new THREE.Shape(), 2.2, 1.6, 0.14); cs.holes.push(rr(new THREE.Path(), 2.08, 1.48, 0.1));
  const cg = new THREE.ExtrudeGeometry(cs, { depth: 0.8, bevelEnabled: false, curveSegments: 10 }); cg.translate(0, 0, -0.4);
  M(cg, shell, 0, 0, 0, cas);
  M(roundedBox(2.14, 1.54, 0.05, 0.12, 0.01), shell, 0, 0, -0.4, cas);
  M(new THREE.BoxGeometry(1.1, 0.03, 0.1), shell, 0, 0.81, -0.05, cas);            // top handle rib

  // side louvers + copper coil glint (both sides, so every orbit angle is covered)
  const slat = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.03, 0.72), shell, 32);
  let si = 0;
  for (const sd of [-1, 1]) {
    const cp = M(new THREE.PlaneGeometry(0.74, 1.24), coilMat, sd * 1.102, 0, -0.1, cas); cp.rotation.y = sd * Math.PI / 2;
    for (let i = 0; i < 16; i++) { _o.position.set(sd * 1.115, -0.58 + i * 0.077, -0.1); _o.updateMatrix(); slat.setMatrixAt(si++, _o.matrix); }
  }
  cas.add(slat);

  // interior revealed by the exploded view
  M(new THREE.BoxGeometry(2.0, 1.4, 0.1), coilMat, 0, 0, -0.3, inner);
  M(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 24), new THREE.MeshStandardMaterial({ color: 0x23272d, roughness: 0.45, metalness: 0.6 }), 0.62, -0.4, -0.12, inner);
  M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.62, -0.1, -0.12), V(0.62, 0.3, -0.1), V(0.2, 0.6, -0.2), V(-0.5, 0.62, -0.26)]), 24, 0.025, 8), copper, 0, 0, 0, inner);
  function V(x, y, z) { return new THREE.Vector3(x, y, z); }

  // front plate with a single round opening
  const ps = rr(new THREE.Shape(), 2.16, 1.56, 0.13); const hole = new THREE.Path(); hole.absarc(FX, 0, 0.66, 0, Math.PI * 2, true); ps.holes.push(hole);
  M(new THREE.ExtrudeGeometry(ps, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 48 }), shell, 0, 0, 0.385, front);
  M(new THREE.TorusGeometry(0.67, 0.03, 12, 64), shell, FX, 0, 0.43, front);                                   // bell-mouth lip
  M(new THREE.CylinderGeometry(0.665, 0.6, 0.34, 48, 1, true).rotateX(Math.PI / 2), dark, FX, 0, 0.25, front); // dark shroud
  M(new THREE.CircleGeometry(0.66, 48), dark, FX, 0, 0.06, front);                                             // back disc
  for (const r of [0.13, 0.23, 0.33, 0.43, 0.53, 0.63]) M(new THREE.TorusGeometry(r, 0.009, 6, 72), wire, FX, 0, 0.47, front);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, w = M(new THREE.BoxGeometry(0.56, 0.011, 0.011), wire, FX + Math.cos(a) * 0.37, Math.sin(a) * 0.37, 0.47, front); w.rotation.z = a; }
  M(new THREE.CylinderGeometry(0.095, 0.095, 0.03, 32).rotateX(Math.PI / 2), shell, FX, 0, 0.482, front);
  M(new THREE.TorusGeometry(0.095, 0.008, 6, 32), wire, FX, 0, 0.5, front);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; M(boltGeo(0.016, 0.016), metal, FX + Math.cos(a) * 0.76, Math.sin(a) * 0.76, 0.436, front); }
  const slots = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.012, 0.01), dark, 9);
  for (let i = 0; i < 9; i++) { _o.position.set(0.8, 0.4 - i * 0.085, 0.436); _o.updateMatrix(); slots.setMatrixAt(i, _o.matrix); }
  front.add(slots);
  M(roundedBox(0.34, 0.09, 0.03, 0.03, 0.008), metal, -0.65, 0.71, 0.43, front);                            // badge
  const led = M(new THREE.SphereGeometry(0.018, 12, 8), new THREE.MeshBasicMaterial({ color: 0x6fffa0 }), 0.97, 0.72, 0.435, front);
  const ledHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0x6fffa0, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); ledHalo.scale.set(0.14, 0.14, 1); ledHalo.position.copy(led.position); front.add(ledHalo);

  // fan: 5 pitched airfoil blades + hub + motor + motion-blur disc
  fanG.position.set(FX, 0, 0.16);
  const spin = new THREE.Group(); fanG.add(spin);
  const bs = new THREE.Shape(); bs.moveTo(0.08, -0.05); bs.bezierCurveTo(0.2, -0.12, 0.45, -0.17, 0.62, -0.09); bs.quadraticCurveTo(0.66, 0, 0.6, 0.1); bs.bezierCurveTo(0.42, 0.2, 0.2, 0.15, 0.08, 0.06); bs.closePath();
  const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.012, bevelEnabled: false }); bg.rotateX(0.45);
  const fanMat = new THREE.MeshStandardMaterial({ color: 0x14171b, roughness: 0.5, metalness: 0.3 });
  for (let i = 0; i < 5; i++) { const b = M(bg, fanMat, 0, 0, 0, spin); b.rotation.z = i / 5 * Math.PI * 2; }
  M(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 28).rotateX(Math.PI / 2), fanMat, 0, 0, 0.02, spin);
  M(new THREE.CylinderGeometry(0.15, 0.15, 0.26, 24).rotateX(Math.PI / 2), wire, 0, 0, -0.12, fanG);
  const blur = M(new THREE.CircleGeometry(0.64, 48), new THREE.MeshBasicMaterial({ color: 0x0c0e12, transparent: true, opacity: 0.15, depthWrite: false }), 0, 0, 0.05, fanG);

  // ---- outdoor extras: dual pressure gauges, live LCD, nameplate, corner guards, drain + drips ----
  let book = 0;
  const gauge = (x, y) => {
    const [c, g] = cvs(128, 128);
    g.fillStyle = "#f4f6f8"; g.beginPath(); g.arc(64, 64, 62, 0, 6.283); g.fill();
    const a0 = 0.75 * Math.PI, sw = 1.5 * Math.PI;
    g.strokeStyle = "#d33"; g.lineWidth = 8; g.beginPath(); g.arc(64, 64, 50, a0 + sw * 0.8, a0 + sw); g.stroke();
    g.strokeStyle = "#222"; g.lineWidth = 2;
    for (let i = 0; i <= 10; i++) { const a = a0 + sw * i / 10; g.beginPath(); g.moveTo(64 + Math.cos(a) * 42, 64 + Math.sin(a) * 42); g.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); g.stroke(); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    M(new THREE.CircleGeometry(0.12, 40), new THREE.MeshBasicMaterial({ map: tx }), x, y, 0.437, front);
    M(new THREE.TorusGeometry(0.12, 0.012, 8, 40), metal, x, y, 0.44, front);
    M(new THREE.SphereGeometry(0.12, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.22), new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.16, roughness: 0, clearcoat: 1 }), x, y, 0.442, front);
    const n = new THREE.Group(); n.position.set(x, y, 0.445); front.add(n);
    M(new THREE.BoxGeometry(0.008, 0.1, 0.004), new THREE.MeshBasicMaterial({ color: 0xd22 }), 0, 0.05, 0, n);
    M(new THREE.SphereGeometry(0.014, 10, 6), metal, 0, 0, 0, n);
    n.rotation.z = 2.356; return n;
  };
  const g1 = gauge(0.55, -0.46), g2 = gauge(0.88, -0.46);
  const lcdO = makeLCD(0.4, 0.14, 256, 90); lcdO.mesh.position.set(0.66, 0.62, 0.4355); front.add(lcdO.mesh);
  let lastO = "";
  const drawO = (psi, sh, load) => {
    const k = psi + ":" + sh + ":" + Math.round(load * 20) + ":" + book; if (k === lastO) return; lastO = k;
    const x = lcdO.ctx; x.fillStyle = "#04121c"; x.fillRect(0, 0, 256, 90); x.fillStyle = "#7fe6ff"; x.textBaseline = "middle";
    x.font = "700 22px ui-monospace,monospace"; x.fillText("PSI " + psi, 10, 20); x.fillText("SH " + sh, 140, 20);
    x.font = "600 16px ui-monospace,monospace"; x.fillText("BOOK " + book, 10, 46); x.fillRect(10, 66, 236 * load, 8);
    x.strokeStyle = "rgba(127,230,255,.4)"; x.strokeRect(10, 66, 236, 8); lcdO.flush();
  };
  M(new THREE.BoxGeometry(0.56, 0.09, 0.004), new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.6 }), 0.7, -0.69, 0.435, front);
  for (let i = 0; i < 3; i++) M(new THREE.BoxGeometry(0.46 - i * 0.08, 0.008, 0.002), dark, 0.7 - i * 0.04, -0.665 - i * 0.025, 0.4375, front);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) M(new THREE.BoxGeometry(0.09, 0.09, 0.09), dark, sx * 1.07, sy * 0.77, 0.37, cas);
  M(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 10).rotateZ(Math.PI / 2), wire, -1.17, -0.62, 0.25, od);
  M(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 10), wire, -1.24, -0.67, 0.25, od);
  const rippleMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const drips = [0, 1, 2].map((i) => ({
    t0: i / 3, m: M(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.85 }), -1.24, -0.72, 0.25, od),
    r: M(new THREE.RingGeometry(0.03, 0.04, 24).rotateX(-Math.PI / 2), rippleMat(), -1.24, -0.823, 0.25, od),
  }));

  // pad, feet, service valves (all pipes land inside sleeves — nothing floats)
  M(new THREE.BoxGeometry(2.5, 0.08, 1.15), new THREE.MeshStandardMaterial({ color: 0xc4c0b8, roughness: 0.92 }), 0, -0.865, 0, od);
  for (const [x, z] of [[-0.9, -0.3], [0.9, -0.3], [-0.9, 0.3], [0.9, 0.3]]) M(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 12), wire, x, -0.81, z, od);
  M(new THREE.BoxGeometry(0.08, 0.14, 0.2), new THREE.MeshStandardMaterial({ color: 0xd2a24a, roughness: 0.3, metalness: 1 }), -1.13, -0.55, -0.2, od);
  for (const z of [-0.12, -0.28]) { M(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 12), wire, -1.18, -0.66, z, od); M(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), metal, -1.18, -0.82, z, od); }
  M(new THREE.PlaneGeometry(4.2, 2.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }), 0, -0.9, 0, od);
  od.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.22 }));
  catcher.position.y = -0.93; catcher.receiveShadow = true; if (!mobile) scene.add(catcher);

  // =====================================================================
  // INDOOR HEAD — same exploded-view logic, played in reverse
  // =====================================================================
  const ind = new THREE.Group(); ind.visible = false; scene.add(ind);
  const ib = new THREE.Group(), ifx = new THREE.Group(), idp = new THREE.Group(); ind.add(ib, ifx, idp);
  M(roundedBox(2.1, 0.64, 0.32, 0.13, 0.05), gloss, 0, 0, 0, ib);
  M(new THREE.BoxGeometry(2.0, 0.54, 0.04), shell, 0, 0, -0.17, ib);
  M(new THREE.BoxGeometry(1.94, 0.004, 0.004), dark, 0, -0.21, 0.163, ib);
  for (let i = 0; i < 7; i++) M(new THREE.BoxGeometry(1.7, 0.003, 0.012), dark, 0, 0.322, -0.03 + i * 0.03, ib);
  M(roundedBox(0.22, 0.04, 0.012, 0.015, 0.004), metal, -0.8, 0.1, 0.162, ib);

  M(new THREE.PlaneGeometry(1.8, 0.2).rotateX(Math.PI / 2), dark, 0, -0.322, 0.02, ifx);        // outlet ceiling
  M(new THREE.BoxGeometry(1.8, 0.06, 0.012), dark, 0, -0.35, -0.08, ifx);                         // outlet back wall
  for (const sx of [-0.9, 0.9]) M(new THREE.BoxGeometry(0.012, 0.06, 0.2), dark, sx, -0.35, 0.02, ifx);
  const blow = new THREE.Group(); blow.position.set(0, -0.35, -0.03); ifx.add(blow);
  const bl = new THREE.InstancedMesh(new THREE.BoxGeometry(1.76, 0.004, 0.045), new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.5, metalness: 0.5 }), 16);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; _o.position.set(0, Math.cos(a) * 0.04, Math.sin(a) * 0.04); _o.rotation.set(a, 0, 0); _o.updateMatrix(); bl.setMatrixAt(i, _o.matrix); }
  _o.rotation.set(0, 0, 0); blow.add(bl);
  const flap = new THREE.Group(); flap.position.set(0, -0.382, -0.08); ifx.add(flap); M(new THREE.BoxGeometry(1.82, 0.012, 0.2), shell, 0, 0, 0.1, flap);
  const vanes = []; for (let i = 0; i < 9; i++) vanes.push(M(new THREE.BoxGeometry(0.008, 0.04, 0.1), wire, -0.8 + i * 0.2, -0.352, 0.04, ifx));

  const lcd = makeLCD(0.34, 0.115, 256, 86);
  M(new THREE.BoxGeometry(0.38, 0.14, 0.004), new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.15, metalness: 0.5 }), 0.74, 0.02, 0.161, idp);
  lcd.mesh.position.set(0.74, 0.02, 0.1635); idp.add(lcd.mesh);
  M(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: 0x7fe6ff }), 0.95, -0.15, 0.162, idp);
  let lastLcd = "";
  const drawLCD = (temp, open) => {
    const key = temp + ":" + Math.round(open * 20) + ":" + book; if (key === lastLcd) return; lastLcd = key;
    const x = lcd.ctx; x.fillStyle = "#04121c"; x.fillRect(0, 0, 256, 86);
    x.fillStyle = "#7fe6ff"; x.textBaseline = "middle"; x.font = "700 52px ui-monospace,monospace"; x.fillText(temp + "°", 14, 44);
    x.font = "600 16px ui-monospace,monospace"; x.fillText(book ? "BOOK " + book : "COOL", 150, 28); x.fillRect(150, 52, 90 * open, 8);
    x.strokeStyle = "rgba(127,230,255,.4)"; x.strokeRect(150, 52, 90, 8); lcd.flush();
  };

  // ---- indoor extras: sensor dot, filter door line, display glow ----
  M(new THREE.SphereGeometry(0.008, 8, 6), wire, -0.55, -0.05, 0.162, idp);
  M(new THREE.BoxGeometry(1.7, 0.003, 0.003), dark, 0, 0.19, 0.163, ib);
  const dHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0x7fe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  dHalo.scale.set(0.6, 0.4, 1); dHalo.position.set(0.74, 0.02, 0.2); idp.add(dHalo);

  // ---------- FX: morph flash, shockwave rings, air streaks, petals ----------
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0xe6f7ff, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(flash);
  const rings = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.54, 64), new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); scene.add(m); return m; });
  const airOut = pool(od, mobile ? 120 : 220, 0xffc58a, 0.09);
  const airIn = pool(ind, mobile ? 120 : 220, 0x86d6ff, 0.09);
  const oOrg = V(FX, 0, 0.55), oDir = V(0, 0, 1), iOrg = V(0, -0.38, 0.1), iDir = V(0, -0.33, 0.94).normalize();

  const NP = mobile ? 40 : 80;
  const pet = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.055, 0.09), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }), NP);
  pet.frustumCulled = false; scene.add(pet);
  const R = Math.random, pp = [];
  for (let i = 0; i < NP; i++) pp.push({ x: R() * 16 - 8, y: R() * 7.5 - 3.5, z: R() * 7 - 4, a: R() * 6, b: R() * 6, s: 0.6 + R() * 0.9, w: R() * 6.28 });

  // ---------- interaction: hover = surge, click = burst + booking counter ----------
  const rc = new THREE.Raycaster(), ptr = new THREE.Vector2(), hov = { od: 0, id: 0, tod: 0, tid: 0 };
  let pulse = 0;
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
    rc.setFromCamera(ptr, camera);
    hov.tod = od.visible && rc.intersectObject(od, true).length ? 1 : 0;
    hov.tid = ind.visible && rc.intersectObject(ind, true).length ? 1 : 0;
    canvas.style.cursor = hov.tod || hov.tid ? "pointer" : "";
  }, { passive: true });
  canvas.addEventListener("click", () => { if (hov.tod || hov.tid) { book++; pulse = 1; } });
  const orb = new THREE.PointLight(0x9fd8ff, 25, 14, 2); scene.add(orb);

  // ---------- frame loop ----------
  let lastP = 0, boost = 0;
  S.onFrame((dt, t, p, m) => {
    const dp = Math.abs(p - lastP) / Math.max(dt, 1e-3); lastP = p;
    boost += (Math.min(dp * 18, 14) - boost) * (1 - Math.exp(-dt * 6));          // scroll speed spins the fan up

    const e = smooth(0.16, 0.36, p) * (1 - smooth(0.40, 0.50, p));              // exploded amount (outdoor)
    const outS = 1 - smooth(0.43, 0.55, p);
    const inT = smooth(0.45, 0.66, p), ex = 1 - eOC(inT);
    const cool = smooth(0.45, 0.7, p), open = smooth(0.64, 0.78, p);

    // outdoor
    od.visible = outS > 0.01; od.scale.setScalar(Math.max(0.01, outS));
    od.rotation.y = CFG.OD_YAW + (1 - outS) * 1.4; od.position.y = (1 - outS) * 0.3;
    front.position.set(0, 0.06 * e, 1.15 * e); fanG.position.z = 0.16 + 0.62 * e; inner.position.z = -0.05 * e;
    const om = (7 + boost + hov.od * 9 + pulse * 12) * outS; spin.rotation.z -= om * dt;
    blur.material.opacity = 0.08 + 0.3 * clamp01(om / 20);
    led.material.color.setHex(Math.sin(t * 3) > -0.2 ? 0x6fffa0 : 0x2a6a40);
    airOut.update(t, oOrg, oDir, 3.4, 0.55, 0.22 + om * 0.012, outS * (1 - e) * 0.5, 0.35);
    catcher.material.opacity = 0.22 * outS;

    // indoor
    ind.visible = inT > 0.01; ind.scale.setScalar(Math.max(0.01, lerp(0.55, 1, eOB(inT))));
    ind.rotation.y = -0.2 + ex * 0.9;
    ib.position.z = -0.7 * ex; ifx.position.y = -0.9 * ex; idp.position.z = 0.8 * ex;
    flap.rotation.x = (0.85 + hov.id * 0.3) * open + Math.sin(t * 0.9) * 0.08 * open;
    blow.rotation.x += ((14 + hov.id * 10) * open + boost * 0.5 + pulse * 8) * dt;
    vanes.forEach((v, i) => { v.rotation.y = Math.sin(t * 0.8 + i * 0.4) * 0.35 * open; });
    airIn.update(t, iOrg, iDir, 3.2, 0.7, 0.2 + boost * 0.01, open * inT * 0.55, -0.15);
    drawLCD(Math.round(lerp(31, 24, smooth(0.64, 0.95, p))), open);

    // morph burst
    const f = Math.exp(-Math.pow((p - 0.5) / 0.035, 2));
    flash.scale.setScalar(1 + f * 5 + pulse * 3); flash.material.opacity = Math.min(1, f * 0.95 + pulse * 0.6);
    const rk = smooth(0.46, 0.64, p), live = p > 0.46 && p < 0.64;
    rings.forEach((r, i) => { const k = clamp01(rk * 1.25 - i * 0.2); r.visible = live && k > 0 && k < 1; r.scale.setScalar(0.5 + k * 5); r.material.opacity = (1 - k) * 0.7; r.lookAt(camera.position); });

    // petals: blown by the fan jet (outdoor) and by the cold stream (indoor)
    const wx = 0.35 + om * 0.03 * outS * 0.48, wy = -0.05 - open * 0.25, wz = 0.1 + om * 0.03 * outS * 0.88 + open * inT * 0.8;
    for (let i = 0; i < NP; i++) {
      const q = pp[i];
      q.x += (wx + Math.sin(t * 0.6 + q.w) * 0.12) * dt * q.s; q.y += (wy + Math.sin(t * 0.8 + q.w * 2) * 0.1) * dt; q.z += (wz + Math.cos(t * 0.5 + q.w) * 0.1) * dt * q.s;
      if (q.x > 8) q.x = -8; if (q.y < -3.5) q.y = 4; if (q.z > 3) q.z = -4;
      _o.position.set(q.x, q.y, q.z); _o.rotation.set(q.a + t * q.s, q.b + t * 0.7, 0); _o.scale.setScalar(q.s); _o.updateMatrix(); pet.setMatrixAt(i, _o.matrix);
    }
    pet.instanceMatrix.needsUpdate = true;

    // extras: hover easing, gauges, outdoor LCD, drips, glows, orbiting accent light
    const hk = 1 - Math.exp(-dt * 5); hov.od += (hov.tod - hov.od) * hk; hov.id += (hov.tid - hov.id) * hk; pulse *= Math.exp(-dt * 2.5);
    const load = clamp01(om / 16), gk = 1 - Math.exp(-dt * 6);
    g1.rotation.z += (2.356 - (0.42 + 0.3 * load + 0.02 * Math.sin(t * 7)) * 4.712 - g1.rotation.z) * gk;
    g2.rotation.z += (2.356 - (0.3 + 0.25 * load + 0.02 * Math.sin(t * 5.3)) * 4.712 - g2.rotation.z) * gk;
    drawO(Math.round(110 + load * 40), Math.round(8 + load * 3), load);
    drips.forEach((d) => {
      const u = (d.t0 + t * 0.7) % 1;
      d.m.visible = u < 0.88; d.m.position.y = -0.72 - 0.1 * u * u;
      const k = clamp01((u - 0.88) * 8); d.r.scale.setScalar(1 + k * 3); d.r.material.opacity = u > 0.88 ? (1 - k) * 0.5 : 0;
    });
    ledHalo.material.opacity = 0.35 + 0.25 * Math.sin(t * 3);
    dHalo.material.opacity = 0.3 * open * inT;
    orb.position.set(Math.cos(t * 0.5) * 3.2, 1.2 + Math.sin(t * 0.7), Math.sin(t * 0.5) * 3.2);

    // light grade: warm sun-beam → cool sky as the system comes online
    key.color.copy(WARM).lerp(COOL, cool * 0.6);
    S.renderer.toneMappingExposure = lerp(1.0, 1.06, cool);

    // camera orbit + shift model to the LEFT of the canvas
    const [az, el, rad, ty] = track(p, CAM), portrait = camera.aspect < 1, r = portrait ? rad * 1.45 : rad;
    const A = az + m.x * 0.07, E = el - m.y * 0.035;
    camera.position.set(Math.sin(A) * Math.cos(E) * r, ty + Math.sin(E) * r, Math.cos(A) * Math.cos(E) * r);
    camera.lookAt(0, ty, 0);
    camera.projectionMatrix.elements[8] = portrait ? 0 : CFG.SHIFT;
    camera.projectionMatrix.elements[9] = portrait ? -0.24 : 0;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  });

  return S;
}
