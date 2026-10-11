
import{createStage,THREE,smooth,track,lerp,dotTexture,sparkTexture,roughTexture,noiseTexture,roundedBox,boltGeo,fadeTexture,deviceTier}from "./core.js?v=16";
const T=THREE;
const clamp01=(x)=>Math.min(1,Math.max(0,x));
const eOC=(t)=>1 - Math.pow(1 - t,3);
const eOB=(t)=>{const c=1.70158;return 1 +(c + 1)*Math.pow(t - 1,3)+ c*Math.pow(t - 1,2);};
const ANCHOR_X=-2.5;
const LOOK_OFFSET_X=1.6;
export function mount(canvas){
const IS_MOBILE=/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||matchMedia("(max-width: 760px)").matches;
const Q_MAX=deviceTier();
let level=Q_MAX;
const S=createStage(canvas,{
cam:[ANCHOR_X - 2.2,1.8,5.6],bg:0x000000,fog:0,
envColors:[0xffc07a,0x3f9c98,0xbfe8e2,0x0c1f22],exposure:1.2,
transparent:true,
});
const{scene,camera,renderer,mobile}=S;
const V=(x,y,z)=>new T.Vector3(x,y,z);
const _v1=new T.Vector3(),_v2=new T.Vector3(),_v3=new T.Vector3();
const _o=new T.Object3D();
const UP=V(0,1,0);
const raycaster=new T.Raycaster();
const PC=V(ANCHOR_X - 1.4,0,.6);
const jobSite=new T.Group();
jobSite.position.x=ANCHOR_X;
scene.add(jobSite);
const shadowCatcher=new T.Mesh(new T.PlaneGeometry(24,20),new T.ShadowMaterial({opacity:.42,color:0x011416}));
shadowCatcher.rotation.x=-Math.PI / 2;
shadowCatcher.position.y=.002;
shadowCatcher.receiveShadow=true;
jobSite.add(shadowCatcher);
const hemi=new T.HemisphereLight(0xc8e0e8,0x465960,.85);scene.add(hemi);
const C_WARMW=new T.Color(0xf0f4f5),C_GRND=new T.Color(0x98a8ad),C_FOG=new T.Color(0xe3edf2),C_WET=new T.Color(0x424d53);
const windowFill=new T.DirectionalLight(0xdbeaf0,1.65);
windowFill.position.set(-6,7,4);windowFill.castShadow=!mobile;
if(!mobile){
windowFill.shadow.mapSize.set(1024,1024);
windowFill.shadow.bias=-.0004;windowFill.shadow.radius=4;
Object.assign(windowFill.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:1,far:28});
windowFill.shadow.camera.updateProjectionMatrix();
}
scene.add(windowFill);
const coolRim=new T.PointLight(0x7bbdc9,10,16);coolRim.position.set(-6,3,-4);scene.add(coolRim);
scene.fog=new T.FogExp2(0xc8d9df,.009);
const oculus=new T.SpotLight(0xe8f3f6,85,40,.5,.85,1.5);
oculus.position.set(-.6,14,2);oculus.target.position.set(ANCHOR_X,0,.5);scene.add(oculus,oculus.target);
oculus.castShadow=false;
const shaftU={uT:{value:0},uI:{value:1},uCol:{value:new T.Color(.5,1,.95)}};
const godray=new T.Mesh(new T.ConeGeometry(3.2,15,32,1,true),new T.ShaderMaterial({
transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false,uniforms:shaftU,
vertexShader:"varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}",
fragmentShader:"varying vec2 vUv;varying vec3 vN;varying vec3 vV;uniform float uT,uI;uniform vec3 uCol;void main(){float e=pow(abs(dot(vN,vV)),1.7);float len=pow(vUv.y,1.15);float fl=.82+.18*sin(uT*.6+vUv.x*22.)*sin(uT*.35+vUv.x*9.);float b=e*len*fl*uI*.30;gl_FragColor=vec4(uCol,b);}",
}));
godray.position.set(-1.6,7.2,.4);godray.rotation.z=-.1;godray.renderOrder=5;scene.add(godray);
const warmFill=new T.PointLight(0xf0d5b5,13,12);warmFill.position.set(3,2,3);scene.add(warmFill);
const rough=roughTexture();rough.repeat.set(2,2);
const noise=noiseTexture();noise.repeat.set(5,5);
const polyYellow=new T.MeshPhysicalMaterial({color:0xc89a3a,roughness:.42,clearcoat:.3,clearcoatRoughness:.4,roughnessMap:rough,side:T.DoubleSide});
const polyBlue=new T.MeshPhysicalMaterial({color:0x1f5662,roughness:.55,clearcoat:.25,roughnessMap:rough});
const plasticDark=new T.MeshStandardMaterial({color:0x2f3338,roughness:.6,metalness:.15,roughnessMap:rough});
const innerDark=new T.MeshStandardMaterial({color:0x141210,roughness:.9,side:T.BackSide});
const steelGalv=new T.MeshStandardMaterial({color:0x9aa0a6,metalness:.9,roughness:.45,roughnessMap:rough});
const rubber=new T.MeshStandardMaterial({color:0x0b0d11,roughness:.95});
const copper=new T.MeshStandardMaterial({color:0xb87333,metalness:1,roughness:.26,roughnessMap:rough});
const cordMat=new T.MeshStandardMaterial({color:0x0b0d11,roughness:.85});
const ledGreen=new T.MeshBasicMaterial({color:0x35d17a});
const ledRed=new T.MeshBasicMaterial({color:0x3a1010});
const ledAmber=new T.MeshBasicMaterial({color:0xffb060});
const sheetPlastic=new T.MeshPhysicalMaterial({color:0xdfe4e8,transparent:true,opacity:.16,roughness:.15,clearcoat:1,side:T.DoubleSide,bumpMap:noise,bumpScale:.02,depthWrite:false});
const signYellow=new T.MeshStandardMaterial({color:0xd8b400,roughness:.6,side:T.DoubleSide});
const signBlack=new T.MeshBasicMaterial({color:0x111111,side:T.DoubleSide});
const scrubGray=new T.MeshStandardMaterial({color:0x6b7280,roughness:.55,metalness:.2,roughnessMap:rough});
const outletWhite=new T.MeshStandardMaterial({color:0xe8e4dc,roughness:.5});
const pipe=new T.Mesh(new T.CylinderGeometry(.09,.09,7,20).rotateZ(Math.PI / 2),copper);
pipe.position.set(-3.9,1.75,-5.82);pipe.rotation.z=Math.PI / 2;pipe.scale.x=.5;jobSite.add(pipe);
const flange=new T.Mesh(new T.CylinderGeometry(.24,.3,.09,28),steelGalv);flange.position.set(-3.9,.045,-5.82);jobSite.add(flange);
const pcap=new T.Mesh(new T.SphereGeometry(.1,16,12),copper);pcap.position.set(-3.9,3.5,-5.82);jobSite.add(pcap);
const CRACK=V(ANCHOR_X - 1.4,2.2,-5.75);
const crack=new T.Mesh(new T.ConeGeometry(.07,.2,8),copper);
crack.position.copy(CRACK);crack.rotation.x=Math.PI / 2;jobSite.add(crack);
for(let i=0;i<3;i++){
const clampR=new T.Mesh(new T.TorusGeometry(.1,.02,8,20),steelGalv);
clampR.position.set(-3.9,.7 + i*1.2,-5.82);
clampR.rotation.x=Math.PI / 2;jobSite.add(clampR);
}
const pu={uTime:{value:0},uWet:{value:1},uHeal:{value:0},uSun:{value:new T.Vector3(.15,.5,-.85)}};
const puddle=new T.Mesh(new T.PlaneGeometry(6,6,mobile?24:(Q_MAX>=2?48:36),mobile?24:(Q_MAX>=2?48:36)),
new T.ShaderMaterial({
transparent:true,depthWrite:false,uniforms:pu,
vertexShader:"uniform float uTime,uWet;varying vec3 vP;varying vec2 vUv;float h(vec2 p){return (sin(p.x*3.+uTime*1.6)+sin(p.y*4.2-uTime*1.3)+sin((p.x+p.y)*5.+uTime*2.1)*.6)*.012;}void main(){vUv=uv;vec3 p=position;p.z+=h(position.xy)*uWet;vec4 w=modelMatrix*vec4(p,1.);vP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
fragmentShader:"uniform float uTime,uWet;varying vec3 vP;varying vec2 vUv;float n(vec2 p){return sin(p.x*2.1+1.3)*sin(p.y*2.7)+.5*sin(p.x*5.3+p.y*4.1);}void main(){vec2 c=vUv-.5;float r=length(c)*2.;float e=(.78*uWet+.04)+n(c*6.)*.06*uWet;float a=1.-smoothstep(e-.08,e,r);if(a<.01||uWet<.02)discard;vec3 N=normalize(cross(dFdx(vP),dFdy(vP)));if(N.y<0.)N=-N;vec3 Vv=normalize(cameraPosition-vP);float f=pow(1.-max(dot(N,Vv),0.),3.);vec3 Hh=normalize(normalize(vec3(.4,1.,.3))+Vv);float sp=pow(max(dot(N,Hh),0.),90.);vec3 col=mix(vec3(.02,.12,.13),vec3(.22,.62,.60),f)+vec3(.8,1.,1.)*sp*.9;gl_FragColor=vec4(col,a*(.5+f*.4));}",
}));
puddle.rotation.x=-Math.PI / 2;puddle.position.set(PC.x,.018,PC.z);
puddle.scale.set(1.35,1.35,1.35);puddle.userData.key="puddle";jobSite.add(puddle);
puddle.material.vertexShader=`uniform float uTime,uWet;varying vec3 vP;varying vec2 vUv;varying vec3 vN;
    float wv(vec2 p,vec2 d,float k,float sp,float a,inout vec2 g){float ph=dot(p,d)*k+uTime*sp;g+=d*k*a*cos(ph);return a*sin(ph);}
    void main(){vUv=uv;vec3 p=position;vec2 g=vec2(0.);float h=0.;
      h+=wv(position.xy,normalize(vec2(1.,.4)),3.2,1.5,.016,g);h+=wv(position.xy,normalize(vec2(-.5,1.)),4.6,1.9,.011,g);h+=wv(position.xy,normalize(vec2(.7,-.9)),7.5,2.6,.006,g);
      p.z+=h*uWet;vec4 w=modelMatrix*vec4(p,1.);vP=w.xyz;
      vN=normalize(mat3(modelMatrix)*normalize(vec3(-g.x*uWet,-g.y*uWet,1.)));gl_Position=projectionMatrix*viewMatrix*w;}`;
puddle.material.fragmentShader=`uniform float uTime,uWet,uHeal;uniform vec3 uSun;varying vec3 vP;varying vec2 vUv;varying vec3 vN;
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
puddle.material.needsUpdate=true;
const caustics=new T.Mesh(new T.PlaneGeometry(12,10),new T.ShaderMaterial({
transparent:true,depthWrite:false,blending:T.AdditiveBlending,
uniforms:{uT:{value:0},uC:{value:new T.Color(0x66e6dc)},uW:{value:1}},
vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
fragmentShader:"varying vec2 vUv;uniform float uT,uW;uniform vec3 uC;void main(){vec2 uv=vUv*7.;float t=uT*0.4;float c=sin(uv.x*3.1+t)*sin(uv.y*2.7-t)+sin((uv.x+uv.y)*4.3+t*1.3)+sin(length(uv-3.5)*5.-t*2.);c=pow(max(0.,c*0.33),3.);float fade=1.-smoothstep(.2,.5,length(vUv-.5));gl_FragColor=vec4(uC*c,c*fade*.3*uW);}",
}));
caustics.rotation.x=-Math.PI / 2;caustics.position.set(PC.x,.008,PC.z);
caustics.visible=level>=1;jobSite.add(caustics);
const mover=new T.Group();mover.scale.setScalar(.85);mover.rotation.y=-.12;jobSite.add(mover);
const CY=1.45;
const drum=new T.Mesh(new T.CylinderGeometry(1,1,.95,72,1,true).rotateX(Math.PI / 2),polyYellow);
drum.position.y=CY;
const lining=new T.Mesh(new T.CylinderGeometry(.97,.97,.9,48,1,true).rotateX(Math.PI / 2),innerDark);
lining.position.y=CY;
const back=new T.Mesh(new T.CircleGeometry(.98,64),plasticDark);
back.position.set(0,CY,-.4);
const bezel=new T.Mesh(new T.TorusGeometry(.98,.045,16,96),plasticDark);
bezel.position.set(0,CY,.475);
mover.add(drum,lining,back,bezel);
const bezelHalo=new T.Sprite(new T.SpriteMaterial({map:sparkTexture(),color:0xffa64d,transparent:true,opacity:.22,blending:T.AdditiveBlending,depthWrite:false}));
bezelHalo.scale.set(3,3,1);bezelHalo.position.set(0,CY,.5);mover.add(bezelHalo);
const rivets=new T.InstancedMesh(boltGeo(.022,.015),steelGalv,48);
for(let i=0;i<48;i++){
const a=(i%24 / 24)*Math.PI*2,z=i<24?.46:-.46;
_o.position.set(Math.cos(a)*.99,CY + Math.sin(a)*.99,z);
_o.rotation.set(0,0,0);_o.updateMatrix();
rivets.setMatrixAt(i,_o.matrix);
}
rivets.instanceMatrix.needsUpdate=true;mover.add(rivets);
const weld=new T.Mesh(new T.TorusGeometry(1.0,.012,8,72),plasticDark);
weld.position.set(0,CY,0);mover.add(weld);
const rotor=new T.Group();rotor.position.set(0,CY,.05);mover.add(rotor);
const bs=new T.Shape();
bs.moveTo(.06,-.03);bs.bezierCurveTo(.18,-.1,.32,-.09,.36,.02);
bs.bezierCurveTo(.32,.1,.18,.1,.06,.05);bs.closePath();
const bladeGeo=new T.ExtrudeGeometry(bs,{depth:.012,bevelEnabled:true,bevelThickness:.003,bevelSize:.004,bevelSegments:2});
for(let i=0;i<9;i++){
const hold=new T.Group();
const b=new T.Mesh(bladeGeo,steelGalv);
b.rotation.x=.55;hold.add(b);
hold.rotation.z=(i / 9)*Math.PI*2;rotor.add(hold);
}
rotor.add(new T.Mesh(new T.CylinderGeometry(.16,.16,.45,24).rotateX(Math.PI / 2),plasticDark));
rotor.add(new T.Mesh(new T.ConeGeometry(.14,.2,20).rotateX(Math.PI / 2),steelGalv));
[-.25,.25].forEach((z)=>{
const r=new T.Mesh(new T.TorusGeometry(.78,.03,8,64),steelGalv);
r.position.z=z;rotor.add(r);
});
[.3,.55,.8].forEach((r)=>{
const t=new T.Mesh(new T.TorusGeometry(r,.012,6,64),plasticDark);
t.position.set(0,CY,.5);mover.add(t);
});
const sp=new T.InstancedMesh(new T.BoxGeometry(.82,.012,.02),plasticDark,18);
for(let i=0;i<18;i++){
const a=(i / 18)*Math.PI*2;
_o.position.set(Math.cos(a)*.41,CY + Math.sin(a)*.41,.5);
_o.rotation.set(0,0,a);_o.updateMatrix();
sp.setMatrixAt(i,_o.matrix);
}
sp.instanceMatrix.needsUpdate=true;mover.add(sp);
const outlet=new T.Mesh(roundedBox(.95,.8,1.0,.2),polyYellow);
outlet.position.set(-1.2,1.5,0);outlet.rotation.z=.4;
const slit=new T.Mesh(new T.BoxGeometry(.04,.6,.9),plasticDark);
slit.position.set(-1.62,1.35,0);slit.rotation.z=.4;
const louv=new T.InstancedMesh(new T.BoxGeometry(.02,.16,.86),steelGalv,3);
for(let i=0;i<3;i++){
_o.position.set(-1.66,1.15 + i*.2,0);_o.rotation.set(0,0,.7);_o.updateMatrix();
louv.setMatrixAt(i,_o.matrix);
}
louv.instanceMatrix.needsUpdate=true;
mover.add(outlet,slit,louv);
const mouthAnchor=new T.Object3D();mouthAnchor.position.set(-1.85,1.28,0);mover.add(mouthAnchor);
const panel=new T.Mesh(roundedBox(.5,.14,.32,.03),plasticDark);
panel.position.set(.4,CY + 1.02,-.1);mover.add(panel);
const knob=new T.Mesh(new T.CylinderGeometry(.06,.07,.06,20),steelGalv);
knob.position.set(.28,CY + 1.11,-.1);mover.add(knob);
const panelLed=new T.Mesh(new T.CircleGeometry(.025,12).rotateX(-Math.PI / 2),ledGreen);
panelLed.position.set(.5,CY + 1.095,-.1);mover.add(panelLed);
const plate=new T.Mesh(new T.BoxGeometry(.34,.16,.004),
new T.MeshStandardMaterial({color:0xdadfe6,metalness:.4,roughness:.5}));
plate.position.set(.55,CY + .55,.47);mover.add(plate);
for(let i=0;i<4;i++){
const ln=new T.Mesh(new T.PlaneGeometry(.24,.008),new T.MeshBasicMaterial({color:0x2c3542}));
ln.position.set(.55,CY + .6 - i*.028,.474);mover.add(ln);
}
const stand=new T.Mesh(roundedBox(2.0,.34,1.15,.12),plasticDark);
stand.position.y=.45;
const handle=new T.Mesh(new T.TorusGeometry(.55,.05,10,32,Math.PI),polyYellow);
handle.position.set(0,2.45,0);
const grips=new T.InstancedMesh(new T.TorusGeometry(.055,.012,6,12),rubber,5);
for(let i=0;i<5;i++){
const a=Math.PI*(.25 + i*.125);
_o.position.set(Math.cos(a)*.55,2.45 + Math.sin(a)*.55,0);
_o.rotation.set(0,Math.PI / 2,0);_o.updateMatrix();
grips.setMatrixAt(i,_o.matrix);
}
grips.instanceMatrix.needsUpdate=true;
mover.add(stand,handle,grips);
function caster(x,z,parent,sy){
const g=new T.Group();g.position.set(x,sy,z);
const fork=new T.Mesh(new T.BoxGeometry(.06,.16,.14),plasticDark);
fork.position.y=-.08;
const wh=new T.Mesh(new T.CylinderGeometry(.12,.12,.08,20).rotateZ(Math.PI / 2),rubber);
wh.position.y=-.16;
const cap=new T.Mesh(boltGeo(.03,.1),steelGalv);
cap.rotation.y=Math.PI / 2;cap.position.set(.05,-.16,0);
g.add(fork,wh,cap);parent.add(g);
}
[-.8,.8].forEach((x)=>[-.45,.45].forEach((z)=>caster(x,z,mover,.28)));
const moverHit=new T.Mesh(new T.BoxGeometry(3.4,3,2.4),new T.MeshBasicMaterial({visible:false}));
moverHit.position.y=1.4;moverHit.userData.key="mover";mover.add(moverHit);
mover.traverse((mm)=>{if(mm.isMesh)mm.castShadow=true;});
const extractor=new T.Group();extractor.position.set(-1.2,0,3.5);extractor.rotation.y=.35;jobSite.add(extractor);
const exBody=new T.Mesh(roundedBox(1.3,1.0,1.0,.1),polyBlue);
exBody.position.y=.55;exBody.castShadow=true;extractor.add(exBody);
const exTop=new T.Mesh(roundedBox(1.2,.15,.9,.06),polyYellow);
exTop.position.y=1.1;extractor.add(exTop);
const exLid=new T.Mesh(new T.CylinderGeometry(.42,.42,.08,32),steelGalv);
exLid.position.set(0,1.17,0);extractor.add(exLid);
const exHandle=new T.Mesh(new T.TorusGeometry(.25,.03,8,24,Math.PI),plasticDark);
exHandle.position.set(0,1.2,0);exHandle.rotation.x=Math.PI / 2;extractor.add(exHandle);
const exGauge=new T.Mesh(new T.CircleGeometry(.1,24),new T.MeshStandardMaterial({color:0xf3f4f0,roughness:.5}));
exGauge.position.set(-.35,1.2,.4);exGauge.rotation.x=-.4;extractor.add(exGauge);
const exGaugeNeedle=new T.Mesh(new T.BoxGeometry(.004,.07,.002),new T.MeshBasicMaterial({color:0xd12a2a}));
exGaugeNeedle.geometry.translate(0,.035,0);
exGaugeNeedle.position.set(-.35,1.2,.42);exGaugeNeedle.rotation.z=-.5;extractor.add(exGaugeNeedle);
const exHose=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([
V(.6,.7,.4),V(1.0,.4,.7),V(1.4,.15,1.4),V(1.8,.08,2.6),
],false,"catmullrom",.3),40,.045,8,false),cordMat);
extractor.add(exHose);
const exNozzle=new T.Mesh(new T.ConeGeometry(.12,.35,12).rotateX(Math.PI / 2),steelGalv);
exNozzle.position.set(1.8,.08,2.75);extractor.add(exNozzle);
const exWand=new T.Mesh(new T.CylinderGeometry(.025,.025,1.4,12).rotateX(Math.PI / 2),steelGalv);
exWand.position.set(1.8,.08,3.4);extractor.add(exWand);
const exWandHead=new T.Mesh(roundedBox(.35,.04,.12,.02),steelGalv);
exWandHead.position.set(1.8,.05,4.1);extractor.add(exWandHead);
const exLed=new T.Mesh(new T.CircleGeometry(.02,10),ledGreen);
exLed.position.set(.5,.9,.5);extractor.add(exLed);
const exHit=new T.Mesh(new T.BoxGeometry(1.6,1.4,1.3),new T.MeshBasicMaterial({visible:false}));
exHit.position.y=.7;exHit.userData.key="extractor";extractor.add(exHit);
extractor.traverse((mm)=>{if(mm.isMesh)mm.castShadow=true;});
const dehu=new T.Group();dehu.position.set(4.6,0,-2.8);dehu.rotation.y=-.5;jobSite.add(dehu);
const dBody=new T.Mesh(roundedBox(1.1,1.5,.8,.1),polyBlue);
dBody.position.y=.99;dBody.castShadow=true;dehu.add(dBody);
const dTop=new T.Mesh(roundedBox(1.05,.1,.75,.06),polyYellow);
dTop.position.y=1.78;dehu.add(dTop);
const dFace=new T.Mesh(new T.PlaneGeometry(.8,.4),new T.MeshStandardMaterial({color:0x14181d,roughness:.9}));
dFace.position.set(0,1.45,.41);dehu.add(dFace);
const dLou=new T.InstancedMesh(new T.BoxGeometry(.8,.02,.01),steelGalv,10);
for(let i=0;i<10;i++){
_o.position.set(0,1.05 - i*.045,.405);_o.rotation.set(.5,0,0);_o.updateMatrix();
dLou.setMatrixAt(i,_o.matrix);
}
dLou.instanceMatrix.needsUpdate=true;dehu.add(dLou);
const dLed=new T.Mesh(new T.CircleGeometry(.03,16),ledGreen);
dLed.position.set(-.3,1.6,.41);dehu.add(dLed);
const alertLed=new T.Mesh(new T.CircleGeometry(.03,16),ledRed);
alertLed.position.set(-.18,1.6,.41);dehu.add(alertLed);
const alertHalo=new T.Sprite(new T.SpriteMaterial({map:sparkTexture(),color:0xd12a2a,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));
alertHalo.scale.set(.5,.5,1);alertHalo.position.set(-.18,1.6,.5);dehu.add(alertHalo);
const dCanvas=document.createElement("canvas");dCanvas.width=256;dCanvas.height=128;
const dCtx=dCanvas.getContext("2d");
const dTex=new T.CanvasTexture(dCanvas);dTex.colorSpace=T.SRGBColorSpace;
const dLcd=new T.Mesh(new T.PlaneGeometry(.5,.25),new T.MeshBasicMaterial({map:dTex}));
dLcd.position.set(.12,1.6,.415);dehu.add(dLcd);
const dHalo=new T.Sprite(new T.SpriteMaterial({map:sparkTexture(),color:0xffb060,transparent:true,opacity:.22,blending:T.AdditiveBlending,depthWrite:false}));
dHalo.scale.set(1.2,1.2,1);dHalo.position.set(.12,1.6,.5);dehu.add(dHalo);
[-.4,.4].forEach((x)=>[-.3,.3].forEach((z)=>caster(x,z,dehu,.24)));
const dehuHit=new T.Mesh(new T.BoxGeometry(1.4,1.9,1.1),new T.MeshBasicMaterial({visible:false}));
dehuHit.position.y=1;dehuHit.userData.key="dehu";dehu.add(dehuHit);
dehu.traverse((mm)=>{if(mm.isMesh)mm.castShadow=true;});
const bucketPos=V(3.5,0,-1.5);
const hose=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([
V(4.1,.6,-2.6),V(3.85,.35,-2.2),V(3.65,.3,-1.8),V(3.5,.55,-1.5),
],false,"catmullrom",.3),60,.03,8,false),cordMat);
jobSite.add(hose);
const bucket=new T.Mesh(new T.CylinderGeometry(.34,.28,.55,24,1,true),plasticDark);
bucket.position.set(bucketPos.x,.275,bucketPos.z);jobSite.add(bucket);
const bWater=new T.Mesh(new T.CircleGeometry(.3,24).rotateX(-Math.PI / 2),
new T.MeshPhysicalMaterial({color:0x5a4a38,roughness:.12,transparent:true,opacity:.8}));
bWater.position.set(bucketPos.x,.06,bucketPos.z);jobSite.add(bWater);
const NDP=mobile?0:14;
const dpPos=new Float32Array(NDP*3),dpVel=new Float32Array(NDP);
function dpSpawn(i){
dpPos[i*3]=bucketPos.x +(Math.random()- .5)*.05;
dpPos[i*3 + 1]=.55;
dpPos[i*3 + 2]=bucketPos.z +(Math.random()- .5)*.05;
dpVel[i]=0;
}
for(let i=0;i<NDP;i++)dpSpawn(i);
const dpGeo=new T.BufferGeometry();dpGeo.setAttribute("position",new T.BufferAttribute(dpPos,3));
const bucketDrips=new T.Points(dpGeo,new T.PointsMaterial({size:.03,map:dotTexture(),color:0xb8f0ff,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending}));
bucketDrips.frustumCulled=false;bucketDrips.visible=NDP>0;jobSite.add(bucketDrips);
const meter=new T.Group();meter.position.set(-3.4,.06,1.4);meter.rotation.y=.4;jobSite.add(meter);
const mBody=new T.Mesh(roundedBox(.62,.1,.36,.03),polyYellow);
const mCanvas=document.createElement("canvas");mCanvas.width=256;mCanvas.height=128;
const mCtx=mCanvas.getContext("2d");
const mTex=new T.CanvasTexture(mCanvas);mTex.colorSpace=T.SRGBColorSpace;
const mScreen=new T.Mesh(new T.PlaneGeometry(.42,.16).rotateX(-Math.PI / 2),new T.MeshBasicMaterial({map:mTex}));
mScreen.position.set(0,.052,0);
const mHalo=new T.Sprite(new T.SpriteMaterial({map:sparkTexture(),color:0x7dffb0,transparent:true,opacity:.28,blending:T.AdditiveBlending,depthWrite:false}));
mHalo.scale.set(1,1,1);mHalo.position.set(0,.2,0);
const pins=new T.InstancedMesh(new T.ConeGeometry(.012,.12,8),steelGalv,2);
_o.position.set(-.06,-.08,.2);_o.rotation.set(Math.PI,0,0);_o.updateMatrix();pins.setMatrixAt(0,_o.matrix);
_o.position.set(.06,-.08,.2);_o.updateMatrix();pins.setMatrixAt(1,_o.matrix);
pins.instanceMatrix.needsUpdate=true;
const btns=new T.InstancedMesh(new T.CylinderGeometry(.02,.02,.02,10),rubber,3);
for(let i=0;i<3;i++){
_o.position.set(-.12 + i*.12,.055,-.13);_o.rotation.set(0,0,0);_o.updateMatrix();
btns.setMatrixAt(i,_o.matrix);
}
btns.instanceMatrix.needsUpdate=true;
meter.add(mBody,mScreen,mHalo,pins,btns);
const mCable=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([
V(-3.7,.08,1.25),V(-4.1,.05,1.0),V(-4.4,.05,.6),V(-4.2,.05,.2),
],false,"catmullrom",.3),40,.015,6,false),cordMat);
jobSite.add(mCable);
const meterHit=new T.Mesh(new T.BoxGeometry(.8,.35,.5),new T.MeshBasicMaterial({visible:false}));
meterHit.position.y=.1;meterHit.userData.key="meter";meter.add(meterHit);
const tripod=new T.Group();tripod.position.set(2.3,0,2.7);jobSite.add(tripod);
for(let i=0;i<3;i++){
const a=(i / 3)*Math.PI*2;
const leg=new T.Mesh(new T.CylinderGeometry(.02,.025,1.15,8),plasticDark);
leg.position.set(Math.cos(a)*.18,.55,Math.sin(a)*.18);
leg.rotation.set(Math.sin(a)*.28,0,-Math.cos(a)*.28);
tripod.add(leg);
}
const tHead=new T.Mesh(roundedBox(.22,.3,.14,.03),scrubGray);
tHead.position.y=1.2;
const tLed=new T.Mesh(new T.CircleGeometry(.02,10),ledAmber);
tLed.position.set(0,1.26,.075);
const tAnt=new T.Mesh(new T.CylinderGeometry(.006,.006,.34,6),steelGalv);
tAnt.position.set(.07,1.5,0);
const tHalo=new T.Sprite(new T.SpriteMaterial({map:sparkTexture(),color:0xffb060,transparent:true,opacity:.25,blending:T.AdditiveBlending,depthWrite:false}));
tHalo.scale.set(.7,.7,1);tHalo.position.set(0,1.26,.1);
tripod.add(tHead,tLed,tAnt,tHalo);
const sign=new T.Group();sign.position.set(.8,0,2.1);sign.rotation.y=.5;jobSite.add(sign);
const signA=new T.Mesh(new T.PlaneGeometry(.46,.62),signYellow);
signA.position.set(0,.31,.12);signA.rotation.x=-.25;sign.add(signA);
const signB=new T.Mesh(new T.PlaneGeometry(.46,.62),signYellow);
signB.position.set(0,.31,-.12);signB.rotation.x=.25;sign.add(signB);
const stripe=new T.Mesh(new T.PlaneGeometry(.3,.08),signBlack);
stripe.position.set(0,.34,.145);stripe.rotation.x=-.25;sign.add(stripe);
const stripe2=new T.Mesh(new T.PlaneGeometry(.3,.05),signBlack);
stripe2.position.set(0,.22,.155);stripe2.rotation.x=-.25;sign.add(stripe2);
sign.traverse((mm)=>{if(mm.isMesh)mm.castShadow=true;});
const sheet=new T.Mesh(new T.PlaneGeometry(4.5,3.2),sheetPlastic);
sheet.position.set(5.4,1.6,-3.4);sheet.rotation.y=-.55;jobSite.add(sheet);
const tape=new T.Mesh(new T.BoxGeometry(4.5,.08,.02),new T.MeshStandardMaterial({color:0x3a6ea5,roughness:.6}));
tape.position.set(5.4,3.18,-3.4);tape.rotation.y=-.55;jobSite.add(tape);
const scrubber=new T.Group();scrubber.position.set(-4.4,0,-1.8);scrubber.rotation.y=.7;jobSite.add(scrubber);
const sBody=new T.Mesh(roundedBox(.85,1.0,.75,.06),scrubGray);
sBody.position.y=.55;sBody.castShadow=true;scrubber.add(sBody);
for(let r=.12;r<=.32;r +=.07){
const ring=new T.Mesh(new T.TorusGeometry(r,.012,6,40),plasticDark);
ring.position.set(0,.6,.38);scrubber.add(ring);
}
const sSpokes=new T.InstancedMesh(new T.BoxGeometry(.34,.012,.012),plasticDark,4);
for(let i=0;i<4;i++){
const a=(i / 4)*Math.PI*2 + .4;
_o.position.set(Math.cos(a)*.16,.6 + Math.sin(a)*.16,.38);
_o.rotation.set(0,0,a);_o.updateMatrix();
sSpokes.setMatrixAt(i,_o.matrix);
}
sSpokes.instanceMatrix.needsUpdate=true;scrubber.add(sSpokes);
const sHandle=new T.Mesh(new T.TorusGeometry(.22,.03,8,24,Math.PI),plasticDark);
sHandle.position.set(0,1.08,0);scrubber.add(sHandle);
const sLed=new T.Mesh(new T.CircleGeometry(.02,10),ledGreen);
sLed.position.set(.3,.95,.38);scrubber.add(sLed);
const scrubHit=new T.Mesh(new T.BoxGeometry(1.0,1.2,.9),new T.MeshBasicMaterial({visible:false}));
scrubHit.position.y=.6;scrubHit.userData.key="scrub";scrubber.add(scrubHit);
const scrubFront=scrubber.localToWorld(V(0,.6,.45));
const scrubDir=scrubber.localToWorld(V(0,.6,.0)).sub(scrubFront).normalize();
const NSC=mobile?0:[0,34,54][Q_MAX];
const scPos=new Float32Array(NSC*3),scVel=new Float32Array(NSC*3);
function scSpawn(i,init){
const a=Math.random()*6.283,r=Math.sqrt(Math.random())*.7;
scPos[i*3]=scrubFront.x + Math.cos(a)*r +(init?scrubDir.x*Math.random()*1.2:0);
scPos[i*3 + 1]=scrubFront.y + Math.sin(a)*r*.7 +(init?Math.random()*.6:0);
scPos[i*3 + 2]=scrubFront.z + Math.sin(a)*r +(init?scrubDir.z*Math.random()*1.2:0);
const s=.7 + Math.random()*.6;
scVel[i*3]=scrubDir.x*s;scVel[i*3 + 1]=scrubDir.y*s;scVel[i*3 + 2]=scrubDir.z*s;
}
for(let i=0;i<NSC;i++)scSpawn(i,true);
const scGeo=new T.BufferGeometry();scGeo.setAttribute("position",new T.BufferAttribute(scPos,3));
const scrubAir=new T.Points(scGeo,new T.PointsMaterial({size:.06,map:dotTexture(),color:0xbdf4ee,transparent:true,opacity:.3,depthWrite:false,blending:T.AdditiveBlending}));
scrubAir.frustumCulled=false;scrubAir.visible=NSC>0;jobSite.add(scrubAir);
const outletBox=new T.Mesh(new T.BoxGeometry(.14,.2,.05),outletWhite);
outletBox.position.set(4.6,.4,-5.93);jobSite.add(outletBox);
[-.04,.04].forEach((sy)=>{
const slot=new T.Mesh(new T.BoxGeometry(.02,.05,.01),signBlack);
slot.position.set(4.6,.4 + sy,-5.9);jobSite.add(slot);
});
const cord2=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([
V(4.6,.32,-5.9),V(4.7,.2,-5.2),V(4.6,.18,-4.2),V(4.45,.3,-3.3),
],false,"catmullrom",.3),40,.025,8,false),cordMat);
jobSite.add(cord2);
const workTripod=new T.Group();workTripod.position.set(2.6,0,2.2);jobSite.add(workTripod);
for(let i=0;i<3;i++){
const a=(i / 3)*Math.PI*2 + .5;
const leg=new T.Mesh(new T.CylinderGeometry(.02,.025,1.7,8),new T.MeshStandardMaterial({color:0x2f3338,roughness:.6,metalness:.4}));
leg.position.set(Math.cos(a)*.22,.82,Math.sin(a)*.22);
leg.rotation.set(Math.sin(a)*.22,0,-Math.cos(a)*.22);
workTripod.add(leg);
}
const lightHead=new T.Mesh(roundedBox(.34,.26,.12,.03),new T.MeshStandardMaterial({color:0x2f3338,roughness:.55,metalness:.3}));
lightHead.position.y=1.72;workTripod.add(lightHead);
const lightFace=new T.Mesh(new T.PlaneGeometry(.28,.2),new T.MeshBasicMaterial({color:0xffd9a0}));
lightFace.position.set(0,1.72,.065);workTripod.add(lightFace);
const lightHalo=new T.Sprite(new T.SpriteMaterial({map:sparkTexture(),color:0xffc07a,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false}));
lightHalo.scale.set(1.6,1.6,1);lightHalo.position.set(0,1.72,.12);workTripod.add(lightHalo);
const workSpot=new T.SpotLight(0xffc07a,55,20,.75,.55,1.3);
workSpot.position.set(2.6,1.72,2.2);
workSpot.castShadow=false;
if(!mobile){
workSpot.shadow.mapSize.set(1024,1024);
workSpot.shadow.bias=-.0004;workSpot.shadow.radius=4;
}
const workTarget=new T.Object3D();workTarget.position.set(ANCHOR_X - 1.2,.2,.4);
jobSite.add(workSpot,workTarget);workSpot.target=workTarget;
let lightOn=1,workI=55;
const moverGlow=new T.PointLight(0xffa64d,18,10);jobSite.add(moverGlow);
const lightHit=new T.Mesh(new T.BoxGeometry(.5,.4,.3),new T.MeshBasicMaterial({visible:false}));
lightHit.position.y=1.72;lightHit.userData.key="light";workTripod.add(lightHit);
const NF=mobile?0:8;
const footprintGeo=new T.PlaneGeometry(.22,.34);
const footprintMat=new T.MeshBasicMaterial({color:0x1a1410,transparent:true,opacity:.55,depthWrite:false});
const footprints=[];
for(let i=0;i<NF;i++){
const f=new T.Mesh(footprintGeo,footprintMat.clone());
f.rotation.x=-Math.PI / 2;
const t=i /(NF - 1);
f.position.set(-1 + t*2.5 +(Math.random()- .5)*.15,.013,-1 + t*1.5 +(Math.random()- .5)*.15);
f.rotation.z=Math.random()*.5 - .25;
jobSite.add(f);footprints.push(f);
}
const NSP=mobile?48:116;
const spPos=new Float32Array(NSP*3),spVel=new Float32Array(NSP*3),spLife=new Float32Array(NSP);
function spraySeed(i){
const j=i*3;
spPos[j]=CRACK.x;spPos[j + 1]=CRACK.y;spPos[j + 2]=CRACK.z;
_v1.set(PC.x - CRACK.x,-1.6,PC.z - CRACK.z).normalize().multiplyScalar(3.4 + Math.random()*1.4);
spVel[j]=_v1.x +(Math.random()- .5)*.8;
spVel[j + 1]=_v1.y + Math.random()*1.2;
spVel[j + 2]=_v1.z +(Math.random()- .5)*.8;
spLife[i]=Math.random();
}
for(let i=0;i<NSP;i++)spraySeed(i);
const spGeo=new T.BufferGeometry();spGeo.setAttribute("position",new T.BufferAttribute(spPos,3));
const spray=new T.Points(spGeo,new T.PointsMaterial({size:.09,map:dotTexture(),color:0xd2fbf6,transparent:true,opacity:.7,depthWrite:false,blending:T.AdditiveBlending}));
spray.frustumCulled=false;jobSite.add(spray);
const NM=mobile?88:168;
const mp=new Float32Array(NM*3),ms=new Float32Array(NM);
const mistSeed=(i,wet)=>{
const a=Math.random()*6.283,r=Math.sqrt(Math.random())*2.4*(.3 + .7*wet);
mp[i*3]=PC.x + Math.cos(a)*r;
mp[i*3 + 1]=Math.random()*2.2;
mp[i*3 + 2]=PC.z + Math.sin(a)*r;
ms[i]=.25 + Math.random()*.45;
};
for(let i=0;i<NM;i++)mistSeed(i,1);
const mg=new T.BufferGeometry();mg.setAttribute("position",new T.BufferAttribute(mp,3));
const mist=new T.Points(mg,new T.PointsMaterial({size:.16,map:dotTexture(),color:0x8fd8d2,transparent:true,opacity:.3,depthWrite:false,blending:T.AdditiveBlending}));
mist.frustumCulled=false;jobSite.add(mist);
const NV=mobile?0:96;
const vp=new Float32Array(NV*3),vs=new Float32Array(NV);
const vapSeed=(i,wet)=>{
const a=Math.random()*6.283,r=Math.sqrt(Math.random())*2.2*(.3 + .7*wet);
vp[i*3]=PC.x + Math.cos(a)*r;vp[i*3 + 1]=.05;vp[i*3 + 2]=PC.z + Math.sin(a)*r;
vs[i]=.4 + Math.random()*.6;
};
for(let i=0;i<NV;i++)vapSeed(i,1);
const vg=new T.BufferGeometry();vg.setAttribute("position",new T.BufferAttribute(vp,3));
const vapor=new T.Points(vg,new T.PointsMaterial({size:.22,map:dotTexture(),color:0xd8d2c8,transparent:true,opacity:.25,depthWrite:false,blending:T.AdditiveBlending}));
vapor.frustumCulled=false;vapor.visible=false;jobSite.add(vapor);
const NJ=level===2?150:(level===1?64:0);
const jp=new Float32Array(NJ*3),jv=new Float32Array(NJ*3),jl=new Float32Array(NJ);
const jg=new T.BufferGeometry();jg.setAttribute("position",new T.BufferAttribute(jp,3));
const jet=new T.Points(jg,new T.PointsMaterial({size:.07,map:dotTexture(),color:0xbdf4ee,transparent:true,opacity:.35,depthWrite:false,blending:T.AdditiveBlending}));
jet.frustumCulled=false;jet.visible=NJ>0;jobSite.add(jet);
const ND=mobile?96:192,dp=new Float32Array(ND*3);
for(let i=0;i<ND;i++){
dp[i*3]=(Math.random()- .5)*16;
dp[i*3 + 1]=Math.random()*5;
dp[i*3 + 2]=(Math.random()- .5)*12;
}
const dg=new T.BufferGeometry();dg.setAttribute("position",new T.BufferAttribute(dp,3));
const dust=new T.Points(dg,new T.PointsMaterial({size:.05,map:dotTexture(),color:0xd8cbb8,transparent:true,opacity:.3,depthWrite:false,blending:T.AdditiveBlending}));
dust.frustumCulled=false;jobSite.add(dust);
const ripples=[];
const ripGeo=new T.RingGeometry(.3,.34,32).rotateX(-Math.PI / 2);
for(let i=0;i<10;i++){
const r=new T.Mesh(ripGeo,new T.MeshBasicMaterial({color:0xf0ede6,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));
r.position.y=.02;r.visible=false;jobSite.add(r);ripples.push({m:r,age:9});
}
function spawnRipple(x,z){
for(const r of ripples)if(r.age>.9){r.age=0;r.m.visible=true;r.m.position.x=x;r.m.position.z=z;return;}
}
const waves=[];
const waveGeo=new T.RingGeometry(.5,.56,40);
for(let i=0;i<8;i++){
const w=new T.Mesh(waveGeo,new T.MeshBasicMaterial({color:0xffc07a,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
w.visible=false;jobSite.add(w);waves.push({m:w,age:9});
}
function spawnWave(pos){
for(const w of waves)if(w.age>.7){w.age=0;w.m.visible=true;w.m.position.copy(pos);return;}
}
const NB2=mobile?48:84;
const bPos=new Float32Array(NB2*3),bVel=new Float32Array(NB2*3),bLife=new Float32Array(NB2),bCol=new Float32Array(NB2*3);
for(let i=0;i<NB2;i++)bLife[i]=9;
const bGeo=new T.BufferGeometry();
bGeo.setAttribute("position",new T.BufferAttribute(bPos,3));
bGeo.setAttribute("color",new T.BufferAttribute(bCol,3));
const burst=new T.Points(bGeo,new T.PointsMaterial({size:.11,map:sparkTexture(),vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
burst.frustumCulled=false;jobSite.add(burst);
let bCur=0;
function spawnBurst(pos,col,n,speed){
for(let k=0;k<n;k++){
const i=bCur=(bCur + 1)%NB2,j=i*3;
bPos[j]=pos.x;bPos[j + 1]=pos.y;bPos[j + 2]=pos.z;
const a=Math.random()*6.283,b2=Math.random()*Math.PI*.5;
const s=speed*(.5 + Math.random());
bVel[j]=Math.cos(a)*Math.cos(b2)*s;
bVel[j + 1]=Math.sin(b2)*s;
bVel[j + 2]=Math.sin(a)*Math.cos(b2)*s;
bCol[j]=col.r;bCol[j + 1]=col.g;bCol[j + 2]=col.b;
bLife[i]=0;
}
}
const SPLASH=new T.Color(.85,.88,.9),DUSTW=new T.Color(1.0,.72,.38);
const jetSpotM=new T.SpotLight(0xffe6c0,0,14,.55,.65,1.2);
const jetTarget=new T.Object3D();
jobSite.add(jetSpotM,jetTarget);jetSpotM.target=jetTarget;
const shaft=new T.Mesh(new T.CylinderGeometry(.2,1.5,6,24,1,true),
new T.MeshBasicMaterial({color:0xffe6c0,transparent:true,opacity:0,blending:T.AdditiveBlending,side:T.DoubleSide,depthWrite:false}));
jobSite.add(shaft);
const pulseRings=[];
for(let i=0;i<5;i++){
const r=new T.Mesh(new T.RingGeometry(.9,1,56).rotateX(-Math.PI / 2),
new T.MeshBasicMaterial({color:0xffd9a0,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
r.position.y=.06;jobSite.add(r);pulseRings.push(r);
}
jobSite.traverse((mm)=>{if(!mm.isMesh||!mm.material)return;const mt=mm.material;if(mt.transparent||mt.isShaderMaterial||mt.isShadowMaterial||mt.isMeshBasicMaterial||mm.geometry.type==='PlaneGeometry'||mm.geometry.type==='RingGeometry')return;mm.geometry.computeBoundingSphere();if(mm.geometry.boundingSphere.radius<.05)return;mm.castShadow=true;});
const hitMeshes=[moverHit,dehuHit,meterHit,puddle,scrubHit,lightHit,exHit];
const lastHitPoint=new T.Vector3();
let hovered=null,frameNo=0,boost=0,boostKick=0,meterSpike=0,dehuFlash=0,scrubHover=0,exHover=0;
let pints=0;
canvas.addEventListener("pointerdown",()=>{
if(!hovered)return;
if(hovered==="mover"){
boostKick=1;
_v1.setFromMatrixPosition(mouthAnchor.matrixWorld);
spawnWave(_v1);spawnBurst(_v1,DUSTW,14,2.5);
}else if(hovered==="puddle"){
spawnBurst(lastHitPoint,SPLASH,18,2.2);
spawnRipple(lastHitPoint.x,lastHitPoint.z);
meterSpike=1;
}else if(hovered==="dehu"){
pints +=3;dehuFlash=1;
spawnWave(dehu.position.clone().setY(1.2));
}else if(hovered==="meter"){
meterSpike=1;
}else if(hovered==="scrub"){
boostKick=.6;
spawnWave(scrubFront);
}else if(hovered==="light"){
lightOn=lightOn?0:1;
}else if(hovered==="extractor"){
boostKick=.8;
spawnWave(extractor.position.clone().setY(.6));
spawnBurst(extractor.position.clone().setY(.6),SPLASH,12,2.0);
}
});
let lcdClock=0;
function drawMeter(moist){
mCtx.fillStyle="#0b3d2e";mCtx.fillRect(0,0,256,128);
mCtx.fillStyle="#7dffb0";mCtx.font="bold 40px monospace";
mCtx.fillText("MOIST " + Math.round(moist).toString().padStart(2,"0")+ "%",14,56);
mCtx.strokeStyle="#1d6b4a";mCtx.strokeRect(14,76,228,26);
const w2=Math.max(0,Math.min(1,moist / 100))*224;
mCtx.fillStyle=moist>60?"#ff5d5d":moist>30?"#ffd166":"#7dffb0";
mCtx.fillRect(16,78,w2,22);
mTex.needsUpdate=true;
}
function drawDehu(rh,pt){
dCtx.fillStyle="#1a1408";dCtx.fillRect(0,0,256,128);
dCtx.fillStyle="#ffb060";dCtx.font="bold 34px monospace";
dCtx.fillText("RH " + Math.round(rh)+ "%",16,50);
dCtx.fillText("PINT " + pt.toFixed(1),16,96);
dTex.needsUpdate=true;
}
drawMeter(87);drawDehu(75,0);
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;let _sf=0;
S.onFrame(()=>{renderer.shadowMap.needsUpdate=(++_sf&1)===0;});
const perf={acc:0,n:0,cool:0};
function applyLevel(){
renderer.setPixelRatio(Math.min(devicePixelRatio||1,[1,1.25,1.5][level]));
caustics.visible=level===2;
vapor.visible=NV>0&&level>=1;
jet.visible=NJ>0&&level>=1;
shaft.visible=level>=1;
scrubAir.visible=NSC>0&&level>=1;
dust.visible=level>=1;
mist.geometry.setDrawRange(0,level===0?140:NM);
scGeo.setDrawRange(0,level===0?40:NSC);
if(!mobile&&workSpot.shadow.map){
const sm=1024;
if(workSpot.shadow.map.width!==sm){
workSpot.shadow.mapSize.set(sm,sm);
workSpot.shadow.map.dispose();workSpot.shadow.map=null;
}
}
}
applyLevel();
function adapt(dt){
perf.acc +=dt;perf.n++;
if(perf.cool>0)perf.cool -=dt;
if(perf.n>=120){
const avg=perf.acc / perf.n;perf.acc=0;perf.n=0;
if(perf.cool<=0){
if(avg>.022&&level>0){level--;applyLevel();perf.cool=2.5;}
else if(avg<.0155&&level<Q_MAX){level++;applyLevel();perf.cool=2.5;}
}
}
}
const REV=[[sign,.0],[meter,.05],[extractor,.12],[mover,.18],[tripod,.26],[dehu,.33],[sheet,.4],[scrubber,.47],[workTripod,.54]]
.map(([o,at])=>({o,at,y0:o.position.y,s0:o.scale.x,landed:false}));
const visChain=(o)=>{for(;o;o=o.parent)if(!o.visible)return false;return true;};
const dryRing=[0,1].map((i)=>{
const m=new T.Mesh(new T.RingGeometry(.96,1,48).rotateX(-Math.PI / 2),new T.MeshBasicMaterial({color:i?0xffffff:0xa7dbe1,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));
m.position.set(PC.x,.035,PC.z);m.visible=false;jobSite.add(m);return m;
});
let healBurst=false;
S.onFrame((dt,t,p,m)=>{
frameNo++;adapt(dt);
const wet=1 - smooth(.15,.9,p);
const leakOn=1 - smooth(.02,.18,p);
const dryOn=smooth(.08,.35,p);
const floorDry=smooth(.55,.95,p);
boostKick=Math.max(0,boostKick - dt*1.4);
meterSpike=Math.max(0,meterSpike - dt*1.6);
dehuFlash=Math.max(0,dehuFlash - dt*2);
for(const r of REV){
const k=clamp01((p - r.at)/ .07),o=r.o;
o.visible=k>.001;o.scale.setScalar(Math.max(.001,r.s0*eOB(k)));
o.position.y=r.y0 +(1 - eOC(k))*2.6;
if(k>=1&&!r.landed){r.landed=true;_v3.set(o.position.x,.05,o.position.z);spawnWave(_v3);spawnRipple(o.position.x,o.position.z);spawnBurst(_v3.setY(.2),SPLASH,16,2.4);}
if(k<=0)r.landed=false;
if(r.o===dehu)r.o.userData.baseY=r.o.position.y;
}
if(frameNo%2===0){
raycaster.setFromCamera(_v2.set(m.x,-m.y,0),camera);
const hits=raycaster.intersectObjects(hitMeshes.filter(visChain),false);
const nh=hits.length?hits[0].object.userData.key:null;
if(hits.length)lastHitPoint.copy(hits[0].point);
if(nh!==hovered){hovered=nh;canvas.style.cursor=hovered?"pointer":"default";}
}
const hoverBoost=hovered==="mover"?1:0;
scrubHover +=((hovered==="scrub"?1:0)- scrubHover)*Math.min(1,dt*4);
exHover +=((hovered==="extractor"?1:0)- exHover)*Math.min(1,dt*4);
boost +=((hoverBoost + boostKick)- boost)*Math.min(1,dt*4);
pu.uWet.value=wet;pu.uTime.value=t;shaftU.uT.value=t;shaftU.uI.value=.85 + .15*Math.sin(t*.5);
const heal=smooth(.5,.92,p);pu.uHeal.value=heal;
hemi.color.setHex(0xc8e0e8).lerp(C_WARMW,heal);hemi.groundColor.setHex(0x465960).lerp(C_GRND,heal);hemi.intensity=.85 + .18*heal;
windowFill.color.setHex(0xdbeaf0).lerp(C_WARMW,heal);windowFill.intensity=1.65 + .4*heal;
oculus.color.setHex(0xe8f3f6).lerp(C_WARMW,heal);coolRim.intensity=10*(1 - heal*.5);
scene.fog.color.setHex(0xc8d9df).lerp(C_FOG,heal);scene.fog.density=.009 - .006*heal;
shaftU.uCol.value.setRGB(.55,.78,.84).lerp(C_WARMW,heal);renderer.toneMappingExposure=1.0 - .06*heal;
const rk=smooth(.52,.88,p);
dryRing.forEach((r,i)=>{const k=clamp01(rk*1.2 - i*.12);r.visible=k>0&&k<1;r.scale.setScalar(.5 + k*11);r.material.opacity=Math.sin(Math.PI*k)*(i?.5:.8);});
if(p>.52&&!healBurst){healBurst=true;_v3.set(PC.x,.3,PC.z);spawnBurst(_v3,DUSTW,60,3.2);spawnWave(_v3.setY(.05));}
if(p<.5)healBurst=false;
if(caustics.visible){caustics.material.uniforms.uT.value=t;caustics.material.uniforms.uW.value=wet;}
workI +=((lightOn?55:0)- workI)*Math.min(1,dt*6);
workSpot.intensity=workI*(.92 + .05*Math.sin(t*13.7)+ .03*Math.sin(t*31.1))*(workTripod.visible?1:0);
lightFace.material.color.setHSL(.09,.6,.2 + .55*(workI / 55));
lightHalo.material.opacity=.55*(workI / 55);
mover.position.set(lerp(5.4,2.2,smooth(.1,.75,p)),mover.position.y,.9);
moverGlow.position.set(mover.position.x - 1.6,1.4,1.4);
moverGlow.intensity=(18 + boost*26)*(mover.visible?1:0);
const rotorSpeed=(5 + 22*smooth(0,.35,p))*(1 + boost*1.3);
rotor.rotation.z -=rotorSpeed*dt;
knob.rotation.y +=rotorSpeed*dt*.05;
mover.updateWorldMatrix(true,false);
_v1.setFromMatrixPosition(mouthAnchor.matrixWorld);
_v2.set(-1,.16,0).applyQuaternion(mover.quaternion).normalize();
const jetStrength=smooth(0,.3,p)*(1 + boost)*(mover.visible?1:0);
jetSpotM.position.copy(_v1);
jetTarget.position.copy(_v1).addScaledVector(_v2,7);
jetSpotM.intensity=50*jetStrength;
if(shaft.visible){
shaft.position.copy(_v1).addScaledVector(_v2,3);
shaft.quaternion.setFromUnitVectors(UP,_v2);
shaft.material.opacity=.06*jetStrength + Math.sin(t*3)*.012;
}
panelLed.material.color.setHSL(.38,.8,.35 + .2*Math.sin(t*(4 + boost*8)));
bezelHalo.material.opacity=.15 + .2*jetStrength + Math.sin(t*2.5)*.05;
pulseRings.forEach((r,i)=>{
const k=(t*.45 + i / pulseRings.length)%1;
_v3.copy(_v1).addScaledVector(_v2,k*6);_v3.y=.06;
r.position.copy(_v3);
const s=.4 + k*5;
r.scale.set(s,1,s);
r.material.opacity=(1 - k)*(1 - k)*.4*jetStrength;
});
if(jet.visible){
for(let i=0;i<NJ;i++){
const j=i*3;
jl[i]+=dt;
if(jl[i]>1.6){
jl[i]=0;
jp[j]=_v1.x +(Math.random()- .5)*.3;
jp[j + 1]=_v1.y +(Math.random()- .5)*.3;
jp[j + 2]=_v1.z +(Math.random()- .5)*.3;
const s=3.5 + Math.random()*2.5 + boost*2;
jv[j]=_v2.x*s;jv[j + 1]=_v2.y*s - .3;jv[j + 2]=_v2.z*s;
}
jv[j + 1]-=.6*dt;
jp[j]+=jv[j]*dt + Math.sin(t*6 + i)*.004;
jp[j + 1]+=jv[j + 1]*dt;
jp[j + 2]+=jv[j + 2]*dt;
if(jp[j + 1]<.03)jl[i]=99;
}
jg.attributes.position.needsUpdate=true;
}
if(scrubAir.visible){
const sFlow=.8 + scrubHover*1.6;
for(let i=0;i<NSC;i++){
const j=i*3;
scPos[j]+=scVel[j]*dt*sFlow;
scPos[j + 1]+=scVel[j + 1]*dt*sFlow;
scPos[j + 2]+=scVel[j + 2]*dt*sFlow;
const d=Math.hypot(scPos[j]- scrubFront.x,scPos[j + 2]- scrubFront.z);
if(d<.15)scSpawn(i,false);
}
scGeo.attributes.position.needsUpdate=true;
scrubAir.material.opacity=.25 + scrubHover*.2;
}
sLed.material.color.setHSL(.38,.9,.35 + scrubHover*.25 + .08*Math.sin(t*5));
exLed.material.color.setHSL(.38,.9,.35 + exHover*.3 + .08*Math.sin(t*3));
exGaugeNeedle.rotation.z=-.5 +(.3 + exHover*.4)*Math.sin(t*1.8);
spray.visible=leakOn>.01;
spray.material.opacity=.7*leakOn;
if(spray.visible){
for(let i=0;i<NSP;i++){
const j=i*3;
spVel[j + 1]-=6*dt;
spPos[j]+=spVel[j]*dt;
spPos[j + 1]+=spVel[j + 1]*dt;
spPos[j + 2]+=spVel[j + 2]*dt;
if(spPos[j + 1]<.03){
if(Math.random()<.12)spawnRipple(spPos[j],spPos[j + 2]);
spraySeed(i);
}
}
spGeo.attributes.position.needsUpdate=true;
}
for(let i=0;i<NM;i++){
mp[i*3 + 1]+=ms[i]*dt;
mp[i*3]+=Math.sin(t + i)*.003 + _v2.x*jetStrength*dt*.5;
mp[i*3 + 2]+=_v2.z*jetStrength*dt*.5;
if(mp[i*3 + 1]>2.4)mistSeed(i,wet);
}
mg.attributes.position.needsUpdate=true;
mist.material.opacity=.12*wet;
if(vapor.visible){
const evap=.25 + .75*Math.sin(Math.PI*Math.min(1,Math.max(0,wet)));
for(let i=0;i<NV;i++){
vp[i*3 + 1]+=vs[i]*dt;
vp[i*3]+=Math.sin(t*.7 + i*1.7)*.004;
if(vp[i*3 + 1]>2.6)vapSeed(i,wet);
}
vg.attributes.position.needsUpdate=true;
vapor.material.opacity=.25*evap*wet;
}
dust.rotation.y=t*.01;
for(const r of ripples){
if(r.age<.9){
r.age +=dt;
const k=r.age / .9;
r.m.scale.setScalar(.4 + k*2.6);
r.m.material.opacity=(1 - k)*.45;
}else r.m.visible=false;
}
for(const w of waves){
if(w.age<.7){
w.age +=dt;
const k=w.age / .7;
w.m.scale.setScalar(.5 + k*3);
w.m.material.opacity=(1 - k)*.7;
w.m.lookAt(camera.position);
}else w.m.visible=false;
}
for(let i=0;i<NB2;i++){
if(bLife[i]<1){
bLife[i]+=dt;
const j=i*3;
bVel[j + 1]-=4*dt;
bPos[j]+=bVel[j]*dt;bPos[j + 1]+=bVel[j + 1]*dt;bPos[j + 2]+=bVel[j + 2]*dt;
bCol[j]*=.98;bCol[j + 1]*=.98;bCol[j + 2]*=.98;
if(bLife[i]>.99){bCol[j]=0;bCol[j + 1]=0;bCol[j + 2]=0;}
}
}
bGeo.attributes.position.needsUpdate=true;
bGeo.attributes.color.needsUpdate=true;
if(bucketDrips.visible){
for(let i=0;i<NDP;i++){
dpVel[i]+=3.5*dt;
dpPos[i*3 + 1]-=dpVel[i]*dt;
if(dpPos[i*3 + 1]<bWater.position.y)dpSpawn(i);
}
dpGeo.attributes.position.needsUpdate=true;
}
pints +=dt*(.5 + wet*1.5)*dryOn;
const level01=Math.min(1,pints / 40);
bWater.position.y=.08 + level01*.4;
dehu.position.y=(dehu.userData.baseY||0)+ Math.sin(t*38)*.0015*dryOn;
const alertOn=level01>.8;
ledRed.color.setHSL(.0,.9,alertOn?(.4 + .2*Math.sin(t*6)):.08);
alertHalo.material.opacity=alertOn?(.25 + .2*Math.sin(t*6)):0;
dLed.material.color.setHSL(.38,.8,.3 + .15*Math.sin(t*3)+ dehuFlash*.3);
dHalo.material.opacity=.15 + dehuFlash*.4 + dryOn*.12;
tLed.material.color.setHSL(.08,.9,.4 + .25*(Math.sin(t*5)>.6?1:0));
tHalo.material.opacity=.2 +(Math.sin(t*5)>.6?.25:0);
mHalo.material.opacity=.2 + meterSpike*.45;
for(const f of footprints){
f.material.opacity=.55*(1 - floorDry);
}
lcdClock +=dt;
if(lcdClock>.25){
lcdClock=0;
const moist=Math.min(99,wet*87 + meterSpike*8 + Math.sin(t*1.7)*1.5);
drawMeter(moist);
drawDehu(40 + wet*35 - dryOn*8,pints);
}
const[ang,rad,h,fv,lookY,lx,roll]=track(p,[
[.00,-.55,13.0,2.4,48,1.6,2.3,.035],
[.20,.05,9.8,3.4,40,1.8,2.0,.010],
[.42,.80,6.8,2.8,34,1.3,1.7,-.020],
[.65,1.40,5.4,1.9,29,.9,1.5,.020],
[.85,1.05,8.2,4.6,36,1.4,1.8,.000],
[1.00,.30,11.5,4.2,42,1.6,2.2,.000],
]);
const a=ang + m.x*.12 + Math.sin(t*.3)*.006;
camera.position.set(Math.sin(a)*rad,h - m.y*.3 + Math.sin(t*.45)*.04,Math.cos(a)*rad);
camera.lookAt(ANCHOR_X + lx*Math.min(1,camera.aspect / 1.6),lookY,.2);
camera.rotateZ(roll);
const fvx=fv + 7*Math.exp(-Math.pow((p - .52)/ .035,2));
if(Math.abs(camera.fov - fvx)>.01){camera.fov=fvx;camera.updateProjectionMatrix();}
});
S.render();
return S;
}
