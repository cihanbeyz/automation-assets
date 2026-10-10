// plumbing-god-tier.js v2 - graded to the copper/marble background; pipes GROW on scroll, hub opens up, water fills.
// (v1 detail preserved: collars, flanges, bolts, welds, gauges, flow meter, LCD, nodes, FX, hover/click.)
// Blender-grade detail: threaded collars, flange pairs + bolt rings, weld seams,
// gauge glass domes + red-zone arcs + spring-physics needles, impeller flow meter,
// live LCD (GPM / PSI / BOOKINGS), pipe stands, hub flange.
// FX: caustics floor, mist, in-pipe bubbles, shockwave rings, spark bursts, splash ripples, halo sprites.
// Interaction: hover node = line surges | click node = force booking.
// Perf: quality tiers + adaptive resolution/particle LOD (holds 60fps).
// REQUIRES peak core v2 (exports: lerp, sparkTexture, roughTexture, noiseTexture, boltGeo, roundedBox).
import { createStage, THREE, smooth, track, dotTexture, sparkTexture, roughTexture, noiseTexture, roundedBox, boltGeo } from "./core.js?v=10";

const mulberry = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const eOB = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

export function mount(canvas) {
  // ---------- quality tiers ----------
  const IS_MOBILE = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent) || matchMedia("(max-width: 760px)").matches;
  const Q_MAX = IS_MOBILE ? 0 : ((navigator.hardwareConcurrency || 8) <= 4 ? 1 : 2); // 0 low, 1 high, 2 ultra
  let level = Q_MAX;

  // Sibling shell: bg/fog/exposure/envColors slots 0 & 2 shared with hvac-model.js
  const S = createStage(canvas, {
    cam: [0, 2.2, 9], fov: 38, transparent: true,
    envColors: [0xffd9a0, 0xa9cdf2, 0xfff1dc, 0xc9b8a4], exposure: 1.05,
  });
  const { scene, camera, renderer, mobile } = S;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rng = mulberry(11);

  // reusable temps (zero per-frame allocation)
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
  const _q = new THREE.Quaternion(), _o = new THREE.Object3D();
  const WHITE = new THREE.Color(1, 1, 1);
  const raycaster = new THREE.Raycaster();

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x8c7a66, 0.9));
  const key = new THREE.DirectionalLight(0xffe2b8, 2.6);
  key.position.set(2.5, 9, 4);
  key.castShadow = !mobile;
  if (!mobile) {
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004; key.shadow.radius = 3;
    Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 30 });
    key.shadow.camera.updateProjectionMatrix();
  }
  scene.add(key);
  const cy = new THREE.PointLight(0x9fd0ff, 30, 16); cy.position.set(-5, 3, 4); scene.add(cy);
  const vi = new THREE.PointLight(0xffb870, 35, 16); vi.position.set(5, -1, -3); scene.add(vi);
  const hubL = new THREE.PointLight(0x8fd6ff, 30, 9); scene.add(hubL);
  const orbit = new THREE.PointLight(0xffd9a0, 22, 12); scene.add(orbit); // roaming accent

  // ---------- materials ----------
  const rough = roughTexture(); rough.repeat.set(4, 4);
  const noise = noiseTexture(); noise.repeat.set(6, 6);
  const copper = new THREE.MeshStandardMaterial({ color: 0xc97c4a, metalness: 1, roughness: 0.2, roughnessMap: rough, bumpMap: noise, bumpScale: 0.002 });
  const copperPatina = new THREE.MeshStandardMaterial({ color: 0x6f8f7a, metalness: 0.85, roughness: 0.55, roughnessMap: rough });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd9ac52, metalness: 1, roughness: 0.26, roughnessMap: rough });
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xa9b6c8, metalness: 1, roughness: 0.3, anisotropy: 0.5 });
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x5c6675, metalness: 0.95, roughness: 0.42, roughnessMap: rough });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0b0d11, roughness: 0.95 });
  const glass = level === 2
    ? new THREE.MeshPhysicalMaterial({ color: 0x8fd8ff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.18, clearcoat: 1, envMapIntensity: 2, depthWrite: false, ior: 1.45, transmission: 0.45, thickness: 0.15, attenuationColor: new THREE.Color(0x2aa8dd), attenuationDistance: 2.5 })
    : new THREE.MeshPhysicalMaterial({ color: 0x8fd8ff, metalness: 0, roughness: 0.06, transparent: true, opacity: 0.2, clearcoat: 1, envMapIntensity: 1.8, depthWrite: false });
  const glassCover = new THREE.MeshPhysicalMaterial({ color: 0xdff6ff, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false });
  const coreMat = () => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    uniforms: {
      uPhase: { value: 0 }, uOff: { value: 0 }, uBoost: { value: 0 }, uSurge: { value: 0 },
      uCol: { value: new THREE.Color(0x2f9fe0) }, uCol2: { value: new THREE.Color(0xbfeeff) },
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
        col=mix(col,vec3(.9,.97,1.),clamp(tail*.45+tip,0.,1.));
        gl_FragColor=vec4(col,clamp(.45+.25*lines+g*.25,0.,.92));
      }`,
  });

  const root = new THREE.Group(); scene.add(root); root.scale.setScalar(0.7);

  // ---------- HUB: manifold flange, glass sphere, core, gyro rings, wheel ----------
  const hub = new THREE.Group(); root.add(hub);
  const hubFlange = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.14, 48), brass);
  hubFlange.position.y = -1.0; hub.add(hubFlange);
  const hubBolts = new THREE.InstancedMesh(boltGeo(0.035, 0.03), steel, 12);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    _o.position.set(Math.cos(a) * 1.0, -0.92, Math.sin(a) * 1.0);
    _o.rotation.set(-Math.PI / 2, 0, 0); _o.updateMatrix();
    hubBolts.setMatrixAt(i, _o.matrix);
  }
  hubBolts.instanceMatrix.needsUpdate = true; hub.add(hubBolts);

  hub.add(new THREE.Mesh(new THREE.SphereGeometry(0.85, level === 2 ? 64 : 40, level === 2 ? 64 : 40), glass));
  const hubCore = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 32), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.8 }));
  hub.add(hubCore);
  const hubCage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), new THREE.MeshBasicMaterial({ color: 0xffd9a0, wireframe: true, transparent: true, opacity: 0.5 }));
  hub.add(hubCage);
  const hubHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0xbfe6ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  hubHalo.scale.set(3.2, 3.2, 1); hub.add(hubHalo);
  // water inside the glass hub: clipped sphere + surface disc, level rises as the valve opens
  renderer.localClippingEnabled = true;
  const wPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const hubWater = new THREE.Mesh(new THREE.SphereGeometry(0.8, 40, 32), new THREE.MeshPhysicalMaterial({ color: 0x2a9ad6, roughness: 0.08, transparent: true, opacity: 0.5, clearcoat: 1, clippingPlanes: [wPlane], depthWrite: false }));
  const hubSurf = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.45, depthWrite: false }));
  hub.add(hubWater, hubSurf);

  const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.04, 16, 128), brass);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.03, 16, 128), brass);
  const ringC = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.02, 12, 128), copperPatina);
  ringB.rotation.x = Math.PI / 2; ringC.rotation.y = Math.PI / 2;
  hub.add(ringA, ringB, ringC);

  const wheel = new THREE.Group(); wheel.position.y = 1.5; hub.add(wheel);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 14, 64).rotateX(Math.PI / 2), copper));
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 0.04), copper);
    sp.rotation.y = (i / 3) * Math.PI; wheel.add(sp);
  }
  const knurl = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 6), brass, 24);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    _o.position.set(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
    _o.rotation.set(0, 0, 0); _o.updateMatrix();
    knurl.setMatrixAt(i, _o.matrix);
  }
  knurl.instanceMatrix.needsUpdate = true; wheel.add(knurl);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 16), copper);
  stem.position.y = 1.1; hub.add(stem);
  const packing = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.12, 20), brass);
  packing.position.y = 0.95; hub.add(packing);

  // ---------- pressure gauges: dome glass, red zone, spring needle ----------
  function makeGauge() {
    const g = new THREE.Group();
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 32), steel);
    back.rotation.x = Math.PI / 2;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshStandardMaterial({ color: 0xf3f4f0, roughness: 0.5, metalness: 0.05 }));
    face.position.z = 0.03;
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 10, 40), brass);
    bezel.position.z = 0.04;
    const redZone = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.185, 24, 1, Math.PI * 0.25, Math.PI * 0.5), new THREE.MeshBasicMaterial({ color: 0xd12a2a }));
    redZone.position.z = 0.0295;
    const tick = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.028, 0.001), new THREE.MeshBasicMaterial({ color: 0x111111 }), 12);
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI * 0.75 + i * (Math.PI * 1.5 / 11);
      _o.position.set(Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0.031);
      _o.rotation.set(0, 0, a - Math.PI / 2); _o.updateMatrix();
      tick.setMatrixAt(i, _o.matrix);
    }
    tick.instanceMatrix.needsUpdate = true;
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.17, 0.002), new THREE.MeshBasicMaterial({ color: 0xd12a2a }));
    needle.geometry.translate(0, 0.085, 0);
    needle.position.z = 0.032; needle.rotation.z = -0.6;
    const pin = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    pin.position.z = 0.033;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), glassCover);
    dome.rotation.x = Math.PI / 2; dome.position.z = 0.03; dome.renderOrder = 5;
    const snub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 12), brass);
    snub.position.y = -0.26;
    g.add(back, face, bezel, redZone, tick, needle, pin, dome, snub);
    g.userData = { needle, pos: -0.6, vel: 0 };
    return g;
  }
  const gaugeA = makeGauge(); gaugeA.position.set(-0.9, 0.15, 0.55); gaugeA.rotation.y = -0.35; hub.add(gaugeA);
  const gaugeB = makeGauge(); gaugeB.position.set(0.9, 0.15, 0.55); gaugeB.rotation.y = 0.35; hub.add(gaugeB);

  // ---------- flow meter: glass tube + impeller + live LCD ----------
  const meter = new THREE.Group(); meter.position.set(0, -1.75, 0.7); hub.add(meter);
  const meterTube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.1, level === 2 ? 32 : 20, 1, true), glass);
  meter.add(meterTube);
  const meterCap = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.19, 0.19, 0.09, 24), brass, 2);
  _o.position.set(0, 0.58, 0); _o.rotation.set(0, 0, 0); _o.updateMatrix(); meterCap.setMatrixAt(0, _o.matrix);
  _o.position.set(0, -0.58, 0); _o.updateMatrix(); meterCap.setMatrixAt(1, _o.matrix);
  meterCap.instanceMatrix.needsUpdate = true; meter.add(meterCap);
  const impeller = new THREE.Group(); meter.add(impeller);
  for (let i = 0; i < 6; i++) {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.1), steel);
    bl.position.x = 0.08;
    const hold = new THREE.Group(); hold.add(bl);
    hold.rotation.y = (i / 6) * Math.PI * 2;
    bl.rotation.x = 0.5;
    impeller.add(hold);
  }
  const feed = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, -0.8, 0.3), V(0, -1.0, 0.5), V(0, -1.15, 0.7)], false, "catmullrom", 0.3), 40, 0.06, 12, false), copper);
  hub.add(feed);

  // LCD canvas (updated 4x/sec, not per-frame)
  const lcdCanvas = document.createElement("canvas");
  lcdCanvas.width = 256; lcdCanvas.height = 128;
  const lcdCtx = lcdCanvas.getContext("2d");
  const lcdTex = new THREE.CanvasTexture(lcdCanvas);
  lcdTex.colorSpace = THREE.SRGBColorSpace;
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshBasicMaterial({ map: lcdTex }));
  lcd.position.set(0.55, 0.1, 0.17); lcd.rotation.y = 0.5; meter.add(lcd);
  const lcdBox = new THREE.Mesh(roundedBox(0.7, 0.4, 0.12, 0.03), steelDark);
  lcdBox.position.set(0.53, 0.1, 0.1); lcdBox.rotation.y = 0.5; meter.add(lcdBox);
  let bookings = 0, lcdClock = 0;
  function drawLCD(gpm, psi) {
    lcdCtx.fillStyle = "#04121a"; lcdCtx.fillRect(0, 0, 256, 128);
    lcdCtx.strokeStyle = "#0e3a4a"; lcdCtx.strokeRect(4, 4, 248, 120);
    lcdCtx.fillStyle = "#35e0ff"; lcdCtx.font = "bold 30px monospace";
    lcdCtx.fillText("GPM " + gpm.toFixed(1), 18, 44);
    lcdCtx.fillText("PSI " + psi.toFixed(0), 18, 80);
    lcdCtx.fillStyle = "#8a6bff";
    lcdCtx.fillText("BOOK " + String(bookings).padStart(4, "0"), 18, 114);
    lcdTex.needsUpdate = true;
  }
  drawLCD(0, 0);

  // ---------- BRANCHES: pipes, threads, flanges, welds, stands, nodes ----------
  const collarGeo = new THREE.TorusGeometry(0.17, 0.04, 14, 40);
  const threadGeo = new THREE.TorusGeometry(0.155, 0.012, 6, 24);
  const NB = mobile ? 5 : 7, branches = [];
  const recs = [], ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const reg = (inst, idx, mat, b, at) => { recs.push({ inst, idx, mat: mat.clone(), b, at, vis: true }); inst.setMatrixAt(idx, mat); };
  const boltInst = new THREE.InstancedMesh(boltGeo(0.02, 0.012), steel, NB * 3 * 6 + NB * 8);
  const threadInst = new THREE.InstancedMesh(threadGeo, copper, NB * 3 * 3);
  let boltIdx = 0, threadIdx = 0;

  for (let i = 0; i < NB; i++) {
    const a = (i / NB) * Math.PI * 2 + 0.4, R = 4 + rng() * 2.2, y = (rng() - 0.5) * 4;
    const d = V(Math.cos(a), 0, Math.sin(a)), sd = V(-d.z, 0, d.x), sg = i % 2 ? 1 : -1;
    const pts = [
      V(0, 0, 0),
      d.clone().multiplyScalar(1.4).setY(sg * 0.9),
      d.clone().multiplyScalar(R * 0.45).addScaledVector(sd, sg * 1.5).setY(y * 0.4 + sg * 1.3),
      d.clone().multiplyScalar(R * 0.8).addScaledVector(sd, -sg * 0.8).setY(y * 0.9),
      d.clone().multiplyScalar(R).setY(y),
    ];
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.4);
    const cm = coreMat(), off = i * 0.151; cm.uniforms.uOff.value = off; const parts = [];
    const outer = new THREE.Mesh(new THREE.TubeGeometry(curve, level === 2 ? 180 : 120, 0.14, level === 2 ? 20 : 12, false), glass);
    outer.renderOrder = 0;
    const inner = new THREE.Mesh(new THREE.TubeGeometry(curve, level === 2 ? 180 : 120, 0.075, level === 2 ? 14 : 10, false), cm);
    inner.renderOrder = 1;
    root.add(outer, inner); const oc = outer.geometry.index.count, ic = inner.geometry.index.count;

    // weld seam at mid
    const weldPt = curve.getPoint(0.5), weldTan = curve.getTangent(0.5);
    const weld = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.015, 8, 24), copperPatina);
    weld.position.copy(weldPt);
    weld.quaternion.setFromUnitVectors(V(0, 0, 1), weldTan);
    root.add(weld); parts.push({ o: weld, at: 0.5, pop: 1 });
    const hx = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.13, 6).rotateX(Math.PI / 2), brass);   // union nut
    hx.position.copy(curve.getPoint(0.16)); hx.quaternion.setFromUnitVectors(V(0, 0, 1), curve.getTangent(0.16)); root.add(hx); parts.push({ o: hx, at: 0.16, pop: 1 });

    // flange pair + bolt ring at 0.5
    const fl = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20), steelDark, 2);
    _q.setFromUnitVectors(V(0, 1, 0), weldTan);
    _v1.copy(weldPt).addScaledVector(weldTan, 0.05); _o.position.copy(_v1); _o.quaternion.copy(_q); _o.updateMatrix(); fl.setMatrixAt(0, _o.matrix);
    _v1.copy(weldPt).addScaledVector(weldTan, -0.05); _o.position.copy(_v1); _o.updateMatrix(); fl.setMatrixAt(1, _o.matrix);
    fl.instanceMatrix.needsUpdate = true; root.add(fl); parts.push({ o: fl, at: 0.5 });
    const up0 = V(0, 1, 0);
    const right = _v2.crossVectors(weldTan, up0).normalize().clone();
    const upAdj = _v3.crossVectors(right, weldTan).normalize().clone();
    for (let b = 0; b < 8; b++) {
      const ang = (b / 8) * Math.PI * 2;
      _v1.copy(right).multiplyScalar(Math.cos(ang) * 0.19).addScaledVector(upAdj, Math.sin(ang) * 0.19).add(weldPt);
      _o.position.copy(_v1);
      _o.quaternion.setFromUnitVectors(V(0, 0, 1), _v1.sub(weldPt).normalize());
      _o.updateMatrix();
      if (boltIdx < NB * 3 * 6 + NB * 8) reg(boltInst, boltIdx++, _o.matrix, i, 0.5);
    }

    // threaded collars + thread ridges + bolt rings
    [0.22, 0.5, 0.78].forEach((tPos) => {
      const c = new THREE.Mesh(collarGeo, copper);
      const point = curve.getPoint(tPos), tangent = curve.getTangent(tPos);
      c.position.copy(point);
      c.quaternion.setFromUnitVectors(V(0, 0, 1), tangent);
      root.add(c); parts.push({ o: c, at: tPos, pop: 1 });
      const rgt = _v2.crossVectors(tangent, up0).normalize().clone();
      const upA = _v3.crossVectors(rgt, tangent).normalize().clone();
      for (let b = 0; b < 6; b++) {
        const ang = (b / 6) * Math.PI * 2;
        _v1.copy(rgt).multiplyScalar(Math.cos(ang) * 0.19).addScaledVector(upA, Math.sin(ang) * 0.19).add(point);
        _o.position.copy(_v1);
        _o.quaternion.setFromUnitVectors(V(0, 0, 1), _v1.sub(point).normalize());
        _o.updateMatrix();
        if (boltIdx < NB * 3 * 6 + NB * 8) reg(boltInst, boltIdx++, _o.matrix, i, tPos);
      }
      for (let th = -1; th <= 1; th++) {
        _v1.copy(point).addScaledVector(tangent, th * 0.055);
        _o.position.copy(_v1);
        _o.quaternion.setFromUnitVectors(V(0, 0, 1), tangent);
        _o.updateMatrix();
        if (threadIdx < NB * 3 * 3) reg(threadInst, threadIdx++, _o.matrix, i, tPos);
      }
    });

    // floor stand for low pipes
    if (y < -0.6) {
      const rodH = (y + 3.6);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, rodH, 10), steelDark);
      rod.position.set(pts[4].x, -3.6 + rodH / 2, pts[4].z);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.05, 16), steelDark);
      plate.position.set(pts[4].x, -3.57, pts[4].z);
      const clampR = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 20), steelDark);
      clampR.position.copy(pts[4]);
      root.add(rod, plate, clampR); for (const o of [rod, plate, clampR]) parts.push({ o, at: 0.96 });
    }

    // node: gyro rings, core, halo, hit sphere
    const node = new THREE.Group(); node.position.copy(pts[4]);
    node.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), new THREE.MeshBasicMaterial({ color: 0x35e0ff, wireframe: true })));
    const nr1 = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.012, 8, 64), copper);
    const nr2 = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.008, 8, 64), copperPatina);
    nr2.rotation.x = Math.PI / 2;
    const nc = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 24), new THREE.MeshBasicMaterial({ color: 0x35e0ff }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0x35e0ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.set(1.4, 1.4, 1);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.branch = i;
    node.add(nc, nr1, nr2, halo, hit);
    root.add(node);

    // precomputed curve samples for in-pipe bubbles
    const SAM = 128;
    const samples = new Float32Array(SAM * 3);
    for (let sIdx = 0; sIdx < SAM; sIdx++) {
      const pp = curve.getPointAt(sIdx / (SAM - 1));
      samples[sIdx * 3] = pp.x; samples[sIdx * 3 + 1] = pp.y; samples[sIdx * 3 + 2] = pp.z;
    }
    branches.push({ outer, inner, oc, ic, parts, grow: 0, nodePop: 0, cm, off, node, nc, halo, nr1, nr2, hit, samples, flash: 0, prev: 0, hover: 0, hoverT: 0 });
  }
  boltInst.instanceMatrix.needsUpdate = true;
  threadInst.instanceMatrix.needsUpdate = true;
  root.add(boltInst, threadInst);
  const hitMeshes = branches.map((b) => b.hit);

  // ---------- environment: grids, caustics, mist, dust ----------
  function grid(w, h, nx, ny, col) {
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(col) }, uN: { value: new THREE.Vector2(nx, ny) } },
      vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 vUv;uniform float uT;uniform vec3 uC;uniform vec2 uN;
        void main(){vec2 f=abs(fract(vUv*uN)-.5);float e=min(.5-f.x,.5-f.y);
        float l=1.-smoothstep(0.,.04,e);
        float fade=1.-smoothstep(.1,.72,length(vUv-.5));
        float sc=smoothstep(.96,1.,sin(vUv.y*8.-uT*.8))*0.6;
        gl_FragColor=vec4(uC*(.35+sc),l*fade*(.55+sc));}`,
    }));
  }
  const wall = grid(44, 26, 44, 26, 0x2b6cff); wall.position.z = -12; scene.add(wall);
  const flr = grid(44, 44, 44, 44, 0x35e0ff); flr.rotation.x = -Math.PI / 2; flr.position.y = -2.52; scene.add(flr); wall.visible = flr.visible = false;

  const caustics = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(0x1e9fcc) } },
    vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec2 vUv;uniform float uT;uniform vec3 uC;
      void main(){vec2 uv=vUv*7.;float t=uT*0.4;
      float c=sin(uv.x*3.1+t)*sin(uv.y*2.7-t)+sin((uv.x+uv.y)*4.3+t*1.3)+sin(length(uv-3.5)*5.-t*2.);
      c=pow(max(0.,c*0.33),3.);
      float fade=1.-smoothstep(.2,.5,length(vUv-.5));
      gl_FragColor=vec4(uC*c,c*fade*0.55);}`,
  }));
  caustics.rotation.x = -Math.PI / 2; caustics.position.y = -3.58;
  caustics.visible = false; scene.add(caustics);

  const mist = [];
  if (level >= 1) {
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: 0xfff3e2, transparent: true, opacity: 0.09, blending: THREE.NormalBlending, depthWrite: false }));
      sp.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 8);
      sp.scale.set(6, 6, 1);
      sp.userData.seed = Math.random() * 10;
      scene.add(sp); mist.push(sp);
    }
  }

  // steam wisps rising from the valve gland and the first three node joints
  const NS = mobile ? 10 : 18, steam = [], steamTex = dotTexture(), steamSrc = [V(0, 0, 0), V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)];
  for (let i = 0; i < NS; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: 0xfff6ea, transparent: true, opacity: 0, depthWrite: false }));
    sp.userData = { u: Math.random(), e: i % 4, sp: 0.12 + Math.random() * 0.1, dx: Math.random() * 2 - 1 };
    scene.add(sp); steam.push(sp);
  }

  const ND = mobile ? 200 : 600, dp = new Float32Array(ND * 3);
  for (let i = 0; i < ND; i++) {
    dp[i * 3] = (Math.random() - 0.5) * 22;
    dp[i * 3 + 1] = (Math.random() - 0.5) * 12;
    dp[i * 3 + 2] = (Math.random() - 0.5) * 18;
  }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.05, map: dotTexture(), color: 0xfff0d6, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.frustumCulled = false; scene.add(dust);

  // ---------- in-pipe bubbles ----------
  const BPN = level === 2 ? 22 : (level === 1 ? 10 : 0);
  const NBUB = NB * BPN;
  const bubT = new Float32Array(NBUB), bubSp = new Float32Array(NBUB), bubPos = new Float32Array(NBUB * 3);
  for (let i = 0; i < NBUB; i++) { bubT[i] = Math.random(); bubSp[i] = 0.05 + Math.random() * 0.08; }
  const bubGeo = new THREE.BufferGeometry();
  bubGeo.setAttribute("position", new THREE.BufferAttribute(bubPos, 3));
  const bubbles = new THREE.Points(bubGeo, new THREE.PointsMaterial({ size: 0.06, map: dotTexture(), color: 0xe8f8ff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.NormalBlending }));
  bubbles.frustumCulled = false; bubbles.visible = NBUB > 0; scene.add(bubbles);

  // ---------- droplets + splash ripples ----------
  const NDR = mobile ? 30 : 70;
  const wpos = new Float32Array(NDR * 3), wv = new Float32Array(NDR);
  function reseed(i) {
    const a = Math.random() * 6.283, r = 3.5 + Math.random() * 2.5;
    wpos[i * 3] = Math.cos(a) * r;
    wpos[i * 3 + 1] = 1 + Math.random() * 3;
    wpos[i * 3 + 2] = Math.sin(a) * r;
    wv[i] = 0;
  }
  for (let i = 0; i < NDR; i++) reseed(i);
  const wg = new THREE.BufferGeometry(); wg.setAttribute("position", new THREE.BufferAttribute(wpos, 3));
  const waterDrops = new THREE.Points(wg, new THREE.PointsMaterial({ size: 0.09, map: dotTexture(), color: 0x8fd0f5, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.NormalBlending }));
  waterDrops.frustumCulled = false; scene.add(waterDrops);

  const RIPPLES = 8;
  const ripples = [];
  const rippleGeo = new THREE.RingGeometry(0.3, 0.34, 32);
  for (let i = 0; i < RIPPLES; i++) {
    const r = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0, blending: THREE.NormalBlending, depthWrite: false }));
    r.rotation.x = -Math.PI / 2; r.position.y = -2.49; r.visible = false;
    scene.add(r); ripples.push({ m: r, age: 9 });
  }
  function spawnRipple(x, z) {
    for (const r of ripples) if (r.age > 0.8) { r.age = 0; r.m.visible = true; r.m.position.x = x; r.m.position.z = z; return; }
  }

  // ---------- shockwaves + spark bursts ----------
  const WAVES = 10;
  const waves = [];
  const waveGeo = new THREE.RingGeometry(0.5, 0.56, 40);
  for (let i = 0; i < WAVES; i++) {
    const w = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({ color: 0xffe2b8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    w.visible = false; scene.add(w); waves.push({ m: w, age: 9 });
  }
  function spawnWave(pos) {
    for (const w of waves) if (w.age > 0.7) { w.age = 0; w.m.visible = true; w.m.position.copy(pos); return; }
  }
  const NSP = 140;
  const spPos = new Float32Array(NSP * 3), spVel = new Float32Array(NSP * 3), spLife = new Float32Array(NSP), spCol = new Float32Array(NSP * 3);
  for (let i = 0; i < NSP; i++) spLife[i] = 9;
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
  spGeo.setAttribute("color", new THREE.BufferAttribute(spCol, 3));
  const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ size: 0.12, map: sparkTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparks.frustumCulled = false; scene.add(sparks);
  let spCursor = 0;
  function spawnSparks(pos) {
    for (let n = 0; n < 14; n++) {
      const i = spCursor = (spCursor + 1) % NSP, j = i * 3;
      spPos[j] = pos.x; spPos[j + 1] = pos.y; spPos[j + 2] = pos.z;
      const a = Math.random() * 6.283, b = (Math.random() - 0.5) * Math.PI;
      const sp = 1.5 + Math.random() * 2.5;
      spVel[j] = Math.cos(a) * Math.cos(b) * sp;
      spVel[j + 1] = Math.sin(b) * sp;
      spVel[j + 2] = Math.sin(a) * Math.cos(b) * sp;
      spLife[i] = 0;
    }
  }

  // ---------- booking trigger ----------
  function triggerBooking(b) {
    b.flash = 1;
    bookings++;
    spawnWave(b.node.position);
    spawnSparks(b.node.position);
  }

  // ---------- interaction ----------
  let hovered = -1, frameNo = 0;
  canvas.addEventListener("pointerdown", () => { if (hovered >= 0) triggerBooking(branches[hovered]); });

  // ---------- adaptive performance ----------
  const perf = { acc: 0, n: 0, cool: 0 };
  function applyLevel() {
    const pr = [1, 1.5, 2][level];
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, pr));
    dust.geometry.setDrawRange(0, level === 0 ? 200 : ND);
    bubbles.visible = level >= 1;
    for (const sp of mist) sp.visible = level >= 1;
  }
  applyLevel();
  function adapt(dt) {
    perf.acc += dt; perf.n++;
    if (perf.cool > 0) perf.cool -= dt;
    if (perf.n >= 120) {
      const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
      if (perf.cool <= 0) {
        if (avg > 0.030 && level > 0) { level--; applyLevel(); perf.cool = 2.5; }
        else if (avg < 0.0155 && level < Q_MAX) { level++; applyLevel(); perf.cool = 2.5; }
      }
    }
  }

  // ---------- animation ----------
  let phase = 0, boost = 0, flow = 1;
  S.onFrame((dt, t, p, m) => {
    frameNo++;
    adapt(dt);
    const openV = smooth(0.22, 0.36, p), fill = 0.3 + 0.65 * smooth(0.2, 0.5, p);
    const hv = 1 - smooth(0.12, 0.65, Math.hypot(m.x + 0.34, m.y));
    boost += (hv - boost) * Math.min(1, dt * 3);
    flow = (0.35 + 0.65 * openV) * (1 + boost * 0.8 + p * 0.9);
    phase += dt * (0.16 + p * 0.45 + boost * 0.25) * (0.35 + 0.65 * openV);

    // hover raycast (every 2nd frame)
    if (frameNo % 2 === 0) {
      raycaster.setFromCamera(_v1.set(m.x, -m.y, 0), camera);
      const hits = raycaster.intersectObjects(hitMeshes.filter((h) => h.parent.visible), false);
      const nh = hits.length ? hits[0].object.userData.branch : -1;
      if (nh !== hovered) { hovered = nh; canvas.style.cursor = hovered >= 0 ? "pointer" : "default"; }
    }

    for (let i = 0; i < branches.length; i++) {
      const b = branches[i];
      const g0 = 0.1 + i * 0.035, g = smooth(g0, g0 + 0.3, p); b.grow = g;        // pipe grows out of the hub
      b.outer.visible = b.inner.visible = g > 0.002;
      if (g > 0.002) { b.outer.geometry.setDrawRange(0, Math.floor(b.oc * g / 6) * 6); b.inner.geometry.setDrawRange(0, Math.floor(b.ic * g / 6) * 6); }
      for (const q of b.parts) { const k = clamp01((g - q.at) / 0.06); q.o.visible = k > 0; if (q.pop) q.o.scale.setScalar(Math.max(0.001, eOB(k))); }
      b.nodePop = eOB(clamp01((g - 0.93) / 0.07)); b.node.visible = b.nodePop > 0.002;
      b.hoverT += ((hovered === i ? 1 : 0) - b.hoverT) * Math.min(1, dt * 6);
      b.cm.uniforms.uPhase.value = phase;
      b.cm.uniforms.uBoost.value = p * 1.2 + boost * 0.8 + b.hoverT * 1.5;
      b.cm.uniforms.uSurge.value = p * 0.8 + b.hoverT;
      const head = (phase + b.off) % 1;
      if (head < b.prev && b.grow > 0.95) triggerBooking(b);
      b.prev = head;
      b.flash = Math.max(0, b.flash - dt * 1.8);
      b.node.scale.setScalar(Math.max(0.001, (1 + b.flash * 0.7 + b.hoverT * 0.25) * b.nodePop));
      b.nc.material.color.set(0x35e0ff).lerp(WHITE, b.flash);
      b.halo.material.opacity = 0.3 + b.flash * 0.6 + b.hoverT * 0.35 + Math.sin(t * 3 + i) * 0.06;
      const hs = 1.4 + b.flash * 1.2 + b.hoverT * 0.6;
      b.halo.scale.set(hs, hs, 1);
      b.nr1.rotation.y += dt * (0.6 + b.hoverT * 2);
      b.nr2.rotation.z += dt * 0.45;
      b.node.rotation.y += dt * 0.6;
    }

    // bolts/threads appear as the growing pipe passes them
    let __boltDirty = false;
    for (const r of recs) { const v = branches[r.b].grow >= r.at; if (v !== r.vis) { r.vis = v; r.inst.setMatrixAt(r.idx, v ? r.mat : ZERO); __boltDirty = true; } }
    if (__boltDirty) { boltInst.instanceMatrix.needsUpdate = true; threadInst.instanceMatrix.needsUpdate = true; }
    // steam
    const stAmt = 0.35 + 0.65 * openV;
    steamSrc[0].set(0, packing.position.y, 0); hub.localToWorld(steamSrc[0]);
    for (let k = 0; k < 3; k++) branches[k].node.getWorldPosition(steamSrc[k + 1]);
    for (const sp of steam) {
      const d = sp.userData, src = steamSrc[d.e]; d.u = (d.u + dt * d.sp * (0.5 + 0.5 * stAmt)) % 1;
      sp.position.set(src.x + d.dx * 0.25 * d.u + Math.sin(t + d.dx * 5) * 0.08, src.y + d.u * 1.7, src.z + d.dx * 0.1 * d.u);
      sp.scale.setScalar(0.45 + d.u * 1.5);
      sp.material.opacity = Math.sin(Math.PI * d.u) * 0.2 * (d.e === 0 ? stAmt : (branches[d.e - 1].grow > 0.9 ? 1 : 0));
    }
    // bubbles along pipes
    if (bubbles.visible) {
      for (let i = 0; i < NBUB; i++) {
        bubT[i] += bubSp[i] * dt * flow;
        if (bubT[i] > 1) bubT[i] -= 1;
        const b = branches[i % NB], SAM = 128;
        const f = bubT[i] * b.grow * (SAM - 1), i0 = f | 0, fr = f - i0, i1 = Math.min(SAM - 1, i0 + 1), s = b.samples;
        const j = i * 3;
        bubPos[j] = s[i0 * 3] + (s[i1 * 3] - s[i0 * 3]) * fr;
        bubPos[j + 1] = s[i0 * 3 + 1] + (s[i1 * 3 + 1] - s[i0 * 3 + 1]) * fr;
        bubPos[j + 2] = s[i0 * 3 + 2] + (s[i1 * 3 + 2] - s[i0 * 3 + 2]) * fr;
      }
      bubGeo.attributes.position.needsUpdate = true;
    }

    // gauge spring needles
    const press = 0.5 + 0.4 * Math.sin(t * 1.2) + p * 0.3 + boost * 0.2;
    for (const g of [gaugeA, gaugeB]) {
      const target = -0.75 + Math.min(1.5, press * (g === gaugeA ? 1 : 0.85)) * 1.5;
      const u = g.userData;
      u.vel += (target - u.pos) * 14 * dt - u.vel * 6 * dt;
      u.pos += u.vel * dt;
      u.needle.rotation.z = u.pos;
    }

    // impeller + LCD
    impeller.rotation.y += dt * flow * 7;
    lcdClock += dt;
    if (lcdClock > 0.25) {
      lcdClock = 0;
      drawLCD(8 + flow * 6 + Math.sin(t * 2.1) * 0.6, 45 + press * 20 + Math.sin(t * 3.3) * 1.5);
    }

    ringA.rotation.y += dt * 0.5; ringB.rotation.z += dt * 0.35; ringC.rotation.x += dt * 0.22;
    // hub opens up (exploded view), then re-seats; wheel turns as the valve opens
    const ex = smooth(0.05, 0.2, p) * (1 - smooth(0.24, 0.36, p));
    wheel.rotation.y = openV * Math.PI * 5 + t * 0.15; wheel.position.y = 1.5 + 1.5 * ex; stem.position.y = 1.1 + 1.0 * ex; packing.position.y = 0.95 + 0.5 * ex;
    hubFlange.position.y = -1 - 0.6 * ex; hubBolts.position.y = -0.6 * ex;
    ringA.scale.setScalar(1 + 0.22 * ex); ringB.scale.setScalar(1 + 0.32 * ex); ringC.scale.setScalar(1 + 0.42 * ex);
    const L = -0.72 + 1.32 * fill; wPlane.constant = L * 0.7;
    hubSurf.position.y = L; hubSurf.scale.setScalar(Math.sqrt(Math.max(0.001, 0.64 - L * L)) * (1 + Math.sin(t * 2) * 0.012)); hubSurf.rotation.y = t * 0.2;
    hubCage.rotation.y -= dt * 0.4; hubCage.rotation.x += dt * 0.15;
    hubCore.scale.setScalar(1 + Math.sin(t * 3) * 0.06 + boost * 0.12);
    hubHalo.material.opacity = 0.4 + boost * 0.3 + Math.sin(t * 2.5) * 0.08;
    hubL.intensity = 35 + boost * 25 + p * 20;
    orbit.position.set(Math.cos(t * 0.35) * 6, 2 + Math.sin(t * 0.5), Math.sin(t * 0.35) * 6);
    key.color.setHex(0xffe2b8).lerp(WHITE, openV * 0.25); renderer.toneMappingExposure = 1.05 + 0.05 * openV;

    wall.material.uniforms.uT.value = t;
    flr.material.uniforms.uT.value = t;
    if (caustics.visible) caustics.material.uniforms.uT.value = t;
    dust.rotation.y = t * 0.012;
    for (const sp of mist) {
      sp.position.x += Math.sin(t * 0.1 + sp.userData.seed) * dt * 0.2;
      sp.position.y += dt * 0.05;
      if (sp.position.y > 4) sp.position.y = -4;
    }
    root.rotation.y = t * 0.04;

    // droplets + ripples
    for (let i = 0; i < NDR; i++) {
      wv[i] += 4 * dt;
      wpos[i * 3 + 1] -= wv[i] * dt;
      if (wpos[i * 3 + 1] < -2.45) { spawnRipple(wpos[i * 3], wpos[i * 3 + 2]); reseed(i); }
    }
    wg.attributes.position.needsUpdate = true;
    for (const r of ripples) {
      if (r.age < 0.8) {
        r.age += dt;
        const k = r.age / 0.8;
        r.m.scale.setScalar(0.4 + k * 2.4);
        r.m.material.opacity = (1 - k) * 0.5;
      } else r.m.visible = false;
    }
    // shockwaves + sparks
    for (const w of waves) {
      if (w.age < 0.7) {
        w.age += dt;
        const k = w.age / 0.7;
        w.m.scale.setScalar(0.5 + k * 3.2);
        w.m.material.opacity = (1 - k) * 0.8;
        w.m.lookAt(camera.position);
      } else w.m.visible = false;
    }
    for (let i = 0; i < NSP; i++) {
      if (spLife[i] < 1) {
        spLife[i] += dt;
        const j = i * 3;
        spVel[j + 1] -= 3 * dt;
        spPos[j] += spVel[j] * dt; spPos[j + 1] += spVel[j + 1] * dt; spPos[j + 2] += spVel[j + 2] * dt;
        const f = 1 - spLife[i];
        spCol[j] = 0.94 * f; spCol[j + 1] = 0.88 * f; spCol[j + 2] = 1.0 * f;
      } else { spCol[i * 3] = spCol[i * 3 + 1] = spCol[i * 3 + 2] = 0; }
    }
    spGeo.attributes.position.needsUpdate = true;
    spGeo.attributes.color.needsUpdate = true;

    // cinematic camera: orbit + push-in, model pinned to the LEFT via projection shift
    const [ang, rad, h, ty, fv] = track(p, [
      [0, 0.35, 5.4, 1.6, 0.5, 36],
      [0.14, 1.05, 4.8, 1.3, 0.8, 34],
      [0.28, 0.5, 6.4, 1.8, 0.6, 36],
      [0.5, 1.7, 9.8, 2.8, 0.3, 38],
      [0.75, 2.7, 10.5, 2.4, 0.2, 40],
      [1, 3.6, 11, 3.0, 0.4, 40],
    ]);
    const a = ang + m.x * 0.12, portrait = camera.aspect < 1, rr = portrait ? rad * 1.45 : rad;
    camera.position.set(Math.sin(a) * rr, h - m.y * 0.4, Math.cos(a) * rr);
    camera.lookAt(0, ty, 0);
    if (Math.abs(camera.fov - fv) > 0.01) { camera.fov = fv; camera.updateProjectionMatrix(); }
    camera.projectionMatrix.elements[8] = portrait ? 0 : 0.34;
    camera.projectionMatrix.elements[9] = portrait ? -0.24 : 0;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  });
  S.render();
  return S;
}