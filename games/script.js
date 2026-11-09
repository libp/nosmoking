import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);
const state = { mode: 'healthy', exposure: 0, target: 0, recovery: 0, lastExposure: .7, paused: false, sound: false, time: 0 };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer, scene, camera, controls, composer, heart, bloom;
let audio, lastBeat = -1, frameTime = 0, renderTime = 0;
const clock = new THREE.Clock();
const bodyMaterials = [], vessels = [], flowPaths = [], hotpoints = [];
const narrowingVessels=[];
const damageUniform={value:0};
let damageGroup,damagePlaques,damageScars;
const damageFieldGLSL=`
 uniform float uDamage;
 float lesionField(vec3 p){
   float r=.09+uDamage*.53;
   float a=length((p-vec3(-.43,.03,.63))*vec3(1.,1.25,2.1));
   float b=length((p-vec3(.43,-.68,.45))*vec3(1.1,1.,2.));
   float c=length((p-vec3(-.48,.65,.55))*vec3(1.,1.6,2.));
   float d=min(a,min(b,c));
   float jag=.035*sin(p.x*57.+sin(p.y*31.)*2.)*sin(p.y*43.);
   return (1.-smoothstep(r*.35,r,d+jag))*smoothstep(.13,.75,uDamage);
 }
`;
const accent = new THREE.Color('#d7a27c');
const damagedColor = new THREE.Color('#332a28');
const v3 = (x,y,z) => new THREE.Vector3(x,y,z);
const smooth = (x) => x*x*(3-2*x);
let seed = 173;
const random = () => { seed = (seed * 16807) % 2147483647; return (seed-1) / 2147483646; };

function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').classList.remove('visible'), 2600); }
function dialog(kicker,title,content) { $('dialog-kicker').textContent=kicker; $('dialog-title').textContent=title; $('dialog-content').innerHTML=content; $('info-dialog').showModal(); }
$('info-dialog').querySelector('.dialog-close').onclick=()=>$('info-dialog').close();
$('info-dialog').addEventListener('click',e=>{if(e.target===$('info-dialog')) { const r=e.target.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close(); }});
$('about').onclick=()=>dialog('ABOUT THE EXPERIENCE','余生，是每一次新的心跳。','<p>这是一场可以亲手改变的心脏艺术实验。旋转模型，走近冠脉，让烟草的影响逐渐显现，再给身体一次重新开始的机会。</p><p>拖动旋转 · 滚轮缩放 · 双指缩放 · 点击解剖标记<br>支持自动旋转、心跳声音与画面导出。</p><p class="note">模型为程序生成的解剖意象，并非医学扫描。心率、颜色、血流和恢复进度均为机制示意；暴露强度不对应具体支数、年数或疾病概率。</p>');
$('sources').onclick=()=>dialog('SCIENCE & CONTEXT','看见机制，理解选择。','<p>吸烟会损伤血管内壁，促进斑块形成与血栓，使心脏供血受到影响。一氧化碳也会影响血液运输氧气的能力。</p><p>戒烟有益于心血管健康。CDC 指出，戒烟后 1–2 年冠心病风险会显著下降，之后继续逐步降低。这并不意味着已有损伤会立即逆转。</p><p><a href="https://www.cdc.gov/tobacco/about/cigarettes-and-cardiovascular-disease.html" target="_blank" rel="noopener noreferrer">CDC · 吸烟与心血管疾病 ↗</a><br><a href="https://www.cdc.gov/tobacco/hcp/patient-care-settings/cardiovascular.html" target="_blank" rel="noopener noreferrer">CDC · 心血管健康与戒烟 ↗</a><br><a href="https://www.fda.gov/tobacco-products/health-effects-tobacco-use/how-smoking-affects-heart-health" target="_blank" rel="noopener noreferrer">FDA · 吸烟如何影响心脏 ↗</a></p><p class="note">本作品用于科普与艺术体验，不提供诊断、心电监测或个体风险评估。恢复滑杆表达方向，不代表真实康复时间。</p>');

function tissueMaterial(color,roughness=.43) {
  const mat = new THREE.MeshPhysicalMaterial({color,roughness,metalness:.08,clearcoat:.35,clearcoatRoughness:.34,envMapIntensity:.65});
  mat.userData.baseColor=new THREE.Color(color);
  mat.onBeforeCompile = shader => {
    shader.uniforms.uDamage=damageUniform;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTissue;\n'+damageFieldGLSL).replace('#include <begin_vertex>',`#include <begin_vertex>
      vTissue = position;
      float lesion=lesionField(position);
      float fissure=pow(abs(sin(position.y*24.+sin(position.x*16.)*2.)),18.);
      transformed+=normal*lesion*(-.12-uDamage*.07+fissure*.07);
      transformed.x+=lesion*uDamage*.035*sin(position.y*38.);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vTissue;
      ${damageFieldGLSL}
      float hashT(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noiseT(vec3 p){vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);return mix(mix(mix(hashT(i),hashT(i+vec3(1,0,0)),f.x),mix(hashT(i+vec3(0,1,0)),hashT(i+vec3(1,1,0)),f.x),f.y),mix(mix(hashT(i+vec3(0,0,1)),hashT(i+vec3(1,0,1)),f.x),mix(hashT(i+vec3(0,1,1)),hashT(i+vec3(1,1,1)),f.x),f.y),f.z);}
    `).replace('#include <color_fragment>',`#include <color_fragment>
      float tissue = noiseT(vTissue*12.)*.55+noiseT(vTissue*37.)*.25+noiseT(vTissue*110.)*.2;
      float fiber = sin(vTissue.y*135.+sin(vTissue.x*18.)*3.+vTissue.z*24.);
      diffuseColor.rgb *= .58+tissue*.72+fiber*.035;
      float injury=lesionField(vTissue);
      float fracture=pow(abs(sin(vTissue.y*24.+sin(vTissue.x*16.)*2.)),18.);
      vec3 scar=mix(vec3(.075,.055,.043),vec3(.31,.22,.13),tissue);
      scar=mix(scar,vec3(.015,.009,.008),fracture*.85);
      diffuseColor.rgb=mix(diffuseColor.rgb,scar,injury*.94);
    `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.96,lesionField(vTissue));');
  };
  bodyMaterials.push(mat);return mat;
}

// A closed asymmetric ventricular envelope; the apex twists toward the anatomical left.
function ventricularGeometry(){
  const geometry=new THREE.SphereGeometry(1,160,120); const pos=geometry.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const bottom=(1-y)/2;
    const width=1.04-.49*Math.pow(bottom,2.4);
    let px=x*width+.48*Math.pow(bottom,2.5)-.1;
    const py=y*1.42-.12;
    let pz=z*(.77-.2*bottom);
    const groove=Math.exp(-Math.pow((x-.13-y*.19)*9,2))*.065*Math.max(0,z);
    pz-=groove;
    const striation=1+.003*Math.sin(y*28+x*9)*Math.sin(z*24)+.002*Math.sin(x*55+y*19);
    pos.setXYZ(i,px*striation,py,pz*striation);
  }geometry.computeVertexNormals();return geometry;
}
function ellipsoid(position,scale,material,rotation=0){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,64,48),material);mesh.position.copy(position);mesh.scale.copy(scale);mesh.rotation.z=rotation;heart.add(mesh);return mesh;}
function tube(points,radius,material,{end=false,flow=false}={}){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?v3(...p):p));
 const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(32,points.length*15),radius,12,false),material);heart.add(mesh);
 if(flow){flowPaths.push(curve);narrowingVessels.push({mesh,curve,base:mesh.geometry.attributes.position.array.slice(),segments:Math.max(32,points.length*15)});}
 if(end){const p=curve.getPoint(1), tangent=curve.getTangent(1);const ring=new THREE.Mesh(new THREE.TorusGeometry(radius*.86,radius*.17,12,36),material);ring.position.copy(p);ring.quaternion.setFromUnitVectors(v3(0,0,1),tangent);heart.add(ring);const inner=new THREE.Mesh(new THREE.CircleGeometry(radius*.71,32),new THREE.MeshStandardMaterial({color:'#210f14',roughness:1,side:THREE.DoubleSide}));inner.position.copy(p).addScaledVector(tangent,-.006);inner.quaternion.copy(ring.quaternion);heart.add(inner);}
 return curve;
}
function makeHeart(){
 heart=new THREE.Group();scene.add(heart);heart.rotation.set(-.04,-.18,-.12);
 const tissue=tissueMaterial('#752028');
 heart.add(new THREE.Mesh(ventricularGeometry(),tissue));
 const atrium=tissueMaterial('#792a30',.55);
 ellipsoid(v3(-.72,.79,.03),v3(.49,.57,.55),atrium,.3);
 ellipsoid(v3(.61,.86,-.12),v3(.43,.47,.43),atrium,-.4);
 ellipsoid(v3(-.77,.66,.43),v3(.28,.29,.18),tissue,-.4);
 const aorta=tissueMaterial('#973a3a',.37), pulmonary=tissueMaterial('#6c565f',.45), vein=tissueMaterial('#4e4656',.4);
 tube([[.05,.91,-.12],[.03,1.55,-.12],[.25,1.99,-.08],[.64,2.01,-.17],[.83,1.62,-.33],[.78,1.05,-.39]],.205,aorta,{end:true});
 tube([[.27,1.92,-.13],[.19,2.25,-.1],[.2,2.42,-.07]],.075,aorta,{end:true});
 tube([[.48,2.02,-.14],[.54,2.29,-.15],[.64,2.43,-.13]],.073,aorta,{end:true});
 tube([[.67,1.97,-.2],[.88,2.2,-.22],[1.02,2.25,-.2]],.067,aorta,{end:true});
 tube([[-.36,.9,.37],[-.22,1.32,.42],[.07,1.54,.34],[.54,1.56,.25],[.91,1.65,.19]],.17,pulmonary,{end:true});
 tube([[-.12,1.39,.35],[-.4,1.63,.12],[-.83,1.62,-.04]],.125,pulmonary,{end:true});
 tube([[-.77,.84,-.14],[-.91,1.3,-.2],[-.91,1.69,-.2]],.18,vein,{end:true});
 tube([[-.81,.44,-.22],[-1.03,.17,-.27],[-1.01,-.28,-.35]],.15,vein,{end:true});
 tube([[.63,.79,-.34],[1.02,.89,-.37],[1.2,.97,-.3]],.106,aorta,{end:true});
 tube([[.57,.54,-.39],[.96,.55,-.38],[1.15,.59,-.3]],.1,aorta,{end:true});
 const artery=new THREE.MeshPhysicalMaterial({color:'#c38163',metalness:.32,roughness:.39,clearcoat:.5,emissive:'#7e311c',emissiveIntensity:.13});
 const venous=new THREE.MeshPhysicalMaterial({color:'#616078',metalness:.25,roughness:.38});
 vessels.push(artery);
 const front=[[.02,.93,.56],[.24,.57,.76],[.2,.17,.79],[.24,-.23,.73],[.39,-.75,.53],[.43,-1.32,.23]];
 tube(front,.034,artery,{flow:true});
 tube(front.map(([x,y,z])=>[x-.08,y,z+.006]),.026,venous,{flow:true});
 tube([[-.7,.77,.49],[-.71,.45,.64],[-.72,.12,.67],[-.56,-.32,.66],[-.23,-.82,.52],[.27,-1.27,.24]],.035,artery,{flow:true});
 tube([[.13,.64,.72],[.52,.64,.65],[.79,.38,.53],[.88,.04,.34],[.72,-.48,.28]],.032,artery,{flow:true});
 const branches=[
 [[.23,.38,.8],[-.1,.2,.81],[-.4,-.04,.76],[-.56,-.24,.68]],
 [[.2,.09,.79],[-.05,-.22,.78],[-.2,-.56,.64]],
 [[.24,-.23,.74],[.52,-.37,.66],[.66,-.69,.45]],
 [[.34,-.67,.57],[.04,-.78,.57],[-.06,-1.05,.38]],
 [[-.72,.32,.67],[-.49,.34,.76],[-.28,.54,.77]],
 [[-.64,-.17,.7],[-.42,-.39,.71],[-.38,-.65,.57]],
 [[.65,.51,.59],[.54,.26,.72],[.6,-.04,.69]],
 [[-.7,.59,.58],[-.92,.3,.43],[-.98,-.04,.25]]
 ];
 branches.forEach((points,i)=>{
   const curve=tube(points,.014+(i%3)*.003,artery,{flow:true});
   for(let j=0;j<3;j++) {const t=.3+j*.2,p=curve.getPoint(t),dir=i%2?1:-1;tube([p,p.clone().add(v3(dir*.12,-.09,-.01)),p.clone().add(v3(dir*.22,-.24,-.07))],.0065,artery);}
 });
 // Fine epicardial fibers catch the rim light, laid onto the ventricular surface.
 const fiberMat=new THREE.LineBasicMaterial({color:'#dd8075',transparent:true,opacity:.018});
 for(let i=0;i<50;i++){
  const y=-1.23+i*.047,points=[];
  for(let j=0;j<65;j++){
    const a=-1.2+j/64*2.4;const ny=(y+.12)/1.42, b=(1-ny)/2;
    const r=Math.sqrt(Math.max(0,1-ny*ny));
    points.push(v3(Math.sin(a)*r*(1.04-.49*b**2.4)+.48*b**2.5-.1,y+Math.sin(a)*.065,Math.cos(a)*r*(.77-.2*b)+.006));
  }heart.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),fiberMat));
 }
}

function makeAtmosphere(){
 const count=1100,p=new Float32Array(count*3),sizes=new Float32Array(count);
 for(let i=0;i<count;i++){p[i*3]=(random()-.5)*14;p[i*3+1]=(random()-.5)*10;p[i*3+2]=(random()-.5)*10;sizes[i]=random();}
 const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(p,3));geom.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uExposure:{value:0},uPixel:{value:Math.min(devicePixelRatio,1.75)}},vertexShader:`attribute float aSize; uniform float uTime,uPixel; varying float vA; void main(){vec3 p=position;p.y=mod(p.y+5.+uTime*(.025+aSize*.05),10.)-5.;p.x+=sin(uTime*.08+p.y)*.14;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(1.+aSize*2.)*uPixel*(7./-mv.z);vA=aSize;}`,fragmentShader:`uniform float uExposure;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.08,d);gl_FragColor=vec4(mix(vec3(.58,.39,.22),vec3(.46,.39,.31),uExposure),a*(.1+vA*.2));}`});
 const dust=new THREE.Points(geom,mat);scene.add(dust);
 const smokeUniforms={uTime:{value:0},uExposure:{value:0}};
 const smokeMat=new THREE.ShaderMaterial({uniforms:smokeUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uTime,uExposure;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+3.2;a*=.5;}return v;}void main(){vec2 uv=vUv;vec2 p=uv*4.;float t=uTime*.07;float f=fbm(p+vec2(fbm(p+vec2(t,-t)),fbm(p+vec2(-t,t)))*3.-vec2(0,t));float edge=smoothstep(.48,.12,length((uv-.5)*vec2(1.,1.)));float alpha=smoothstep(.32,.8,f)*edge*uExposure*.34;gl_FragColor=vec4(mix(vec3(.26,.25,.21),vec3(.36,.3,.24),f),alpha);}`});
 const smoke=new THREE.Group();scene.add(smoke);
 for(let i=0;i<7;i++){const plane=new THREE.Mesh(new THREE.PlaneGeometry(5.4,6.8),smokeMat);plane.position.set((random()-.5)*3,random()*.8,.5-i*.5);plane.rotation.z=(random()-.5)*2;smoke.add(plane);}
 const glow=new THREE.Mesh(new THREE.PlaneGeometry(11,11),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uExposure:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uExposure;void main(){float d=length(vUv-.5);float a=exp(-d*d*24.)*.13;gl_FragColor=vec4(mix(vec3(.6,.18,.07),vec3(.27,.25,.16),uExposure),a);}`}));glow.position.set(0,.2,-2);scene.add(glow);
 const rings=new THREE.Group();rings.position.y=-1.93;scene.add(rings);
 const ringMat=new THREE.LineBasicMaterial({color:'#bca17a',transparent:true,opacity:.11});
 for(let j=0;j<4;j++){const points=[];const r=1.7+j*.26;for(let i=0;i<=180;i++){const a=i/180*Math.PI*2;points.push(v3(Math.sin(a)*r,0,Math.cos(a)*r));}rings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),ringMat));}
 const ticks=[];for(let i=0;i<90;i++){const a=i/90*Math.PI*2;const r=2.49; ticks.push(v3(Math.sin(a)*r,0,Math.cos(a)*r),v3(Math.sin(a)*(r+(i%5===0?.13:.045)),0,Math.cos(a)*(r+(i%5===0?.13:.045))));}rings.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks),ringMat));
 return {dust,smoke,smokeUniforms,glow,rings};
}

let atmosphere,flowParticles,flowData;
function makeBloodFlow(){
 const count=260,positions=new Float32Array(count*3),aPhase=new Float32Array(count);flowData=[];
 for(let i=0;i<count;i++){flowData.push({curve:flowPaths[i%flowPaths.length],offset:random(),speed:.09+random()*.12});aPhase[i]=random();}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aPhase',new THREE.BufferAttribute(aPhase,1));
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uExposure:{value:0},uPixel:{value:Math.min(devicePixelRatio,1.75)}},vertexShader:`attribute float aPhase;varying float vP;uniform float uPixel;void main(){vP=aPhase;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(2.5+aPhase*2.)*uPixel*(7./-mv.z);}`,fragmentShader:`uniform float uExposure;varying float vP;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.05,d);gl_FragColor=vec4(mix(vec3(1.,.55,.29),vec3(.7,.25,.08),uExposure),a*(.6-uExposure*.35));}`});
 flowParticles=new THREE.Points(geometry,material);heart.add(flowParticles);
}

function makeDamage(){
 damageGroup=new THREE.Group();heart.add(damageGroup);
 const plaqueMat=new THREE.MeshStandardMaterial({color:'#bd954c',roughness:.85,metalness:.08,transparent:true});
 const count=86;damagePlaques=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),plaqueMat,count);damagePlaques.userData.items=[];
 const centers=[v3(.22,.2,.79),v3(-.69,.27,.66),v3(.62,.54,.6)];
 const dummy=new THREE.Object3D();
 for(let i=0;i<count;i++){const p=centers[i%3].clone().add(v3((random()-.5)*.095,(random()-.5)*.24,(random()-.5)*.07));damagePlaques.userData.items.push({p,r:.018+random()*.027,phase:random()});dummy.position.copy(p);dummy.scale.setScalar(.0001);dummy.updateMatrix();damagePlaques.setMatrixAt(i,dummy.matrix);}damageGroup.add(damagePlaques);
 damageScars=new THREE.Group();damageGroup.add(damageScars);
 const scarMat=new THREE.MeshStandardMaterial({color:'#1d100d',roughness:.98,transparent:true});
 const scarEdge=new THREE.MeshStandardMaterial({color:'#9a714b',roughness:.9,transparent:true});
 [[-.43,.03,.645],[.43,-.68,.475],[-.48,.65,.565]].forEach(([x,y,z],k)=>{
  for(let i=0;i<10;i++){
   const a=i/10*Math.PI*2+random()*.35,len=.12+random()*.22;
   const points=[v3(x,y,z),v3(x+Math.sin(a)*len*.55,y+Math.cos(a)*len*.55,z-.008),v3(x+Math.sin(a+.25)*len,y+Math.cos(a+.25)*len,z-.04)];
   const scar=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),12,.009+random()*.008,5,false),i%3?scarMat:scarEdge);scar.userData.threshold=.22+k*.09+random()*.22;damageScars.add(scar);
  }
 });
 damageGroup.userData.dummy=dummy;
}
let lastDeformation=-1;
function updateDamage(e){
 damageUniform.value=e;
 damagePlaques.material.opacity=smooth(Math.min(1,e*1.6));
 const dummy=damageGroup.userData.dummy;
 damagePlaques.userData.items.forEach(({p,r,phase},i)=>{const growth=Math.max(.001,(e-.12-phase*.3)*1.9);dummy.position.copy(p);dummy.scale.set(r*growth,r*growth*.8,r*growth);dummy.rotation.set(phase*5,phase*3,phase*8);dummy.updateMatrix();damagePlaques.setMatrixAt(i,dummy.matrix);});damagePlaques.instanceMatrix.needsUpdate=true;
 damageScars.children.forEach(scar=>{scar.visible=e>scar.userData.threshold;});
 damageScars.children[0].material.opacity=Math.min(1,e*1.5);damageScars.children[1].material.opacity=Math.min(1,e*1.5);
 heart.rotation.z=-.12-e*.085;
 if(Math.abs(lastDeformation-e)>.004){
  narrowingVessels.forEach(({mesh,curve,base,segments})=>{const attr=mesh.geometry.attributes.position;for(let i=0;i<=segments;i++){const t=i/segments,p=curve.getPointAt(t),factor=1-e*.79*Math.exp(-Math.pow((t-.42)/.095,2));for(let j=0;j<13;j++){const k=i*13+j;attr.setXYZ(k,p.x+(base[k*3]-p.x)*factor,p.y+(base[k*3+1]-p.y)*factor,p.z+(base[k*3+2]-p.z)*factor);}}attr.needsUpdate=true;mesh.geometry.computeVertexNormals();});lastDeformation=e;
 }
 $('damage-stage').textContent=e>.78?'III · 供血受限 / 组织损伤':e>.43?'II · 斑块累积 / 血流受阻':e>.12?'I · 心脏负荷增加':'BASELINE · 鲜活状态';
 $('damage-stage').classList.toggle('severe',e>.6);
}

const descriptions=[
 {name:'主动脉',en:'01 / THE AORTA',pos:[.36,1.91,.03],body:'<p>主动脉将富含氧气的血液从心脏送往全身，是体循环的主要通道。</p><p>烟草中的尼古丁可使心率加快、血管收缩，增加心脏的工作负担。切换到「烟草侵入」，观察节律与空间氛围的变化。</p>'},
 {name:'冠状动脉',en:'02 / CORONARY ARTERIES',pos:[.23,.28,.83],body:'<p>冠状动脉为心肌本身提供血液。吸烟会损伤血管内壁，促进动脉粥样硬化与血栓形成，影响供血。</p><div class="cross-section"><div class="artery" style="--plaque:PLAQpx"></div><span>血管横截面 · 概念示意<br>浅金色代表斑块的形成。<br>当前为艺术化暴露状态。</span></div><p>发光粒子代表血流方向。滑杆会改变流速和亮度，表达供血受影响的机制。</p>'},
 {name:'心肌',en:'03 / THE MYOCARDIUM',pos:[-.46,-.62,.59],body:'<p>心肌持续收缩，把血液泵向身体。氧气通过冠脉血流送达心肌，为每次心跳提供能量。</p><p>香烟烟雾中的一氧化碳会影响血液携氧能力。心肌供氧不足，会让这项持续一生的工作更加艰难。</p><p>戒烟有助于降低心血管风险。恢复是一个过程，值得从现在开始。</p>'}
];
function makeHotspots(){descriptions.forEach((item,i)=>{const btn=document.createElement('button');btn.className='hotspot';btn.textContent=item.name;btn.setAttribute('aria-label',`探索${item.name}`);btn.onclick=()=>dialog(item.en,item.name,item.body.replace('PLAQ',Math.round(state.exposure*17)));$('hotspots').append(btn);hotpoints.push({el:btn,point:v3(...item.pos),world:new THREE.Vector3()});});}

function resize(){
 const w=$('scene').clientWidth,h=$('scene').clientHeight;
 document.querySelector('.interaction-hint').innerHTML=w<=700?'<span>⤧</span> 单指旋转 <i>·</i> 双指缩放 <i>·</i> 轻触标记探索':'<span>⤧</span> 拖动旋转 <i>·</i> 滚轮缩放 <i>·</i> 点击标记探索';
 renderer.setSize(w,h);composer.setSize(w,h);camera.aspect=w/h;
 if(w<=700){controls.maxDistance=13;camera.position.set(0,.4,7.4);controls.target.set(0,.25,0);camera.clearViewOffset();}else{controls.maxDistance=15;camera.position.set(0,.4,w<1100?11.4:10.8);controls.target.set(0,.25,0);camera.setViewOffset(w,h,-w*.075,h*.095,w,h);}
 camera.updateProjectionMatrix();controls.update();
}

async function init(){
 try{
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor('#101110');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 $('scene').append(renderer.domElement);renderer.domElement.setAttribute('aria-label','三维心脏模型，拖动旋转，滚轮缩放');
 scene=new THREE.Scene();scene.background=new THREE.Color('#101110');scene.fog=new THREE.FogExp2('#101110',.028);
 camera=new THREE.PerspectiveCamera(37,1,.1,60);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.enablePan=false;controls.minDistance=5.6;controls.maxDistance=15;controls.autoRotateSpeed=.65;
 controls.addEventListener('start',()=>{controls.autoRotate=false;$('rotate').setAttribute('aria-pressed','false');});
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();const env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.45;room.dispose();pmrem.dispose();
 scene.add(new THREE.AmbientLight('#ccc3b0',.3));
 const key=new THREE.SpotLight('#ffe0c5',38,25,.65,.8,1.5);key.position.set(-3,5,5);scene.add(key);
 const rim=new THREE.PointLight('#fa5f42',24,15,1.7);rim.position.set(3,1,-2);scene.add(rim);
 const cool=new THREE.PointLight('#769aab',16,15,1.8);cool.position.set(-3,.2,-2);scene.add(cool);
 const top=new THREE.PointLight('#f6d4ac',18,12,1.8);top.position.set(1,4,1);scene.add(top);
 makeHeart();atmosphere=makeAtmosphere();makeBloodFlow();makeDamage();makeHotspots();
 composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.28,.6,.85);composer.addPass(bloom);composer.addPass(new OutputPass());
 resize();window.addEventListener('resize',resize);$('scene').addEventListener('dblclick',resetView);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('图形上下文中断，请刷新页面重新加载。');});
 $('loading').classList.add('done');setTimeout(()=>$('loading').remove(),1200);
 window.__heartLab={state,renderer,scene,camera,controls,ready:true,get frameTime(){return frameTime;},get drawCalls(){return renderer.info.render.calls;},get damage(){return {level:damageUniform.value,visibleScars:damageScars.children.filter(m=>m.visible).length,plaqueOpacity:damagePlaques.material.opacity};}};
 animate();
 }catch(error){console.error(error);$('loading').innerHTML='<span class="loading-symbol">✳</span><p>当前设备无法开启 3D 体验。</p><small>请使用支持 WebGL 2 的浏览器并启用硬件加速。</small>';}
}

function setMode(mode){
 state.mode=mode;document.body.dataset.mode=mode;
 document.querySelectorAll('[data-mode]').forEach(btn=>btn.setAttribute('aria-selected',String(btn.dataset.mode===mode)));
 const isRecovery=mode==='recovery';
 $('slider-label').textContent=isRecovery?'恢复旅程 · 示意进度':'吸烟时长 · 年';$('exposure').setAttribute('aria-label',isRecovery?'恢复旅程进度':'吸烟时长');
 $('exposure').max=isRecovery?'100':'30';
 $('range-start').textContent=isRecovery?'开始戒烟':'从未吸烟';$('range-end').textContent=isRecovery?'持续恢复':'30 年';
 if(mode==='healthy'){state.target=0;$('exposure').value=0;}
 if(mode==='exposure'){state.target=state.lastExposure;$('exposure').value=Math.round(state.target*30);}
 if(isRecovery){state.recovery=0;state.target=state.lastExposure;$('exposure').value=0;}
 const copy={healthy:['A HEART IN BALANCE','此刻，让生命自然流动。','让烟草侵入','HEALTHY / 鲜活','01','BEYOND THE SMOKE','烟草影响的不只是呼吸。<br>它也改变了血液流经心脏的方式。'],exposure:['THE INVISIBLE BURDEN','有些改变，在烟雾散去后才开始。','开始重获新生','EXPOSED / 负荷','02','AN INVISIBLE COST','血管收缩，供氧受影响。<br>每一次搏动，都承担着更多。'],recovery:['EVERY CHOICE MATTERS','从此刻起，给心脏多一点余地。','重返鲜活之心','RECOVERING / 重生','03','A NEW BEGINNING','停止暴露，改变从此刻开始。<br>风险随时间下降，恢复值得等待。']}[mode];
 $('control-kicker').textContent=copy[0];$('control-description').textContent=copy[1];$('journey').innerHTML=`${copy[2]} <span>↗</span>`;$('scene-state').textContent=copy[3];document.querySelector('.chapter-number').innerHTML=`${copy[4]}<span>/ 03</span>`;$('insight-kicker').textContent=copy[5];$('insight-text').innerHTML=copy[6];updateSlider();
}
function updateSlider(){const value=Number($('exposure').value),max=Number($('exposure').max);$('exposure-value').innerHTML=`${value} <small>${state.mode==='recovery'?'/ 100':'年'}</small>`;$('exposure').style.setProperty('--progress',`${value/max*100}%`);}
document.querySelectorAll('[data-mode]').forEach(btn=>btn.onclick=()=>setMode(btn.dataset.mode));
document.querySelector('.mode-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...document.querySelectorAll('[data-mode]')],i=tabs.indexOf(document.activeElement);const next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;tabs[next].focus();setMode(tabs[next].dataset.mode);});
$('exposure').oninput=()=>{const value=Number($('exposure').value)/Number($('exposure').max);if(state.mode==='recovery'){state.recovery=value;state.target=state.lastExposure*(1-value*.86);}else{if(value>0&&state.mode==='healthy')setMode('exposure');state.target=value;state.lastExposure=Math.max(.05,value);$('exposure').value=Math.round(value*30);}updateSlider();};
$('journey').onclick=()=>setMode({healthy:'exposure',exposure:'recovery',recovery:'healthy'}[state.mode]);
function resetView(){if(!controls)return;controls.autoRotate=false;$('rotate').setAttribute('aria-pressed','false');resize();toast('已回到初始视角');}
$('reset').onclick=resetView;
$('rotate').onclick=()=>{if(!controls)return;controls.autoRotate=!controls.autoRotate;$('rotate').setAttribute('aria-pressed',String(controls.autoRotate));};
$('sound').onclick=async()=>{if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();await audio.resume();state.sound=!state.sound;$('sound').setAttribute('aria-pressed',String(state.sound));toast(state.sound?'心跳声音已开启':'心跳声音已关闭');};
function heartbeatSound(){if(!state.sound||!audio||document.hidden)return;const t=audio.currentTime;[0,.16].forEach((delay,i)=>{const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(i?66:82,t+delay);osc.frequency.exponentialRampToValueAtTime(35,t+delay+.12);gain.gain.setValueAtTime(.001,t+delay);gain.gain.exponentialRampToValueAtTime(i?.1:.17,t+delay+.012);gain.gain.exponentialRampToValueAtTime(.001,t+delay+.16);osc.connect(gain);gain.connect(audio.destination);osc.start(t+delay);osc.stop(t+delay+.18);});}
$('capture').onclick=()=>{if(!renderer)return;composer.render();const a=document.createElement('a');a.download=`afterglow-${state.mode}.png`;a.href=renderer.domElement.toDataURL('image/png');a.click();toast('已保存 3D 场景画面');};
for(let i=0;i<17;i++)$('flow-bars').appendChild(document.createElement('i'));
const ecg=$('ecg').getContext('2d');
function drawECG(t,bpm){const w=260,h=62;ecg.clearRect(0,0,w,h);ecg.strokeStyle='#adb39b12';ecg.lineWidth=1;for(let x=0;x<w;x+=16){ecg.beginPath();ecg.moveTo(x,0);ecg.lineTo(x,h);ecg.stroke();}ecg.beginPath();ecg.strokeStyle=state.exposure>.5?'#ce9a7c':'#a9b39b';ecg.lineWidth=1.5;for(let x=0;x<w;x++){const phase=((x/w*2.2+t*bpm/60)%1);const y=31-3*Math.exp(-Math.pow((phase-.14)/.045,2))+6*Math.exp(-Math.pow((phase-.29)/.015,2))-27*Math.exp(-Math.pow((phase-.32)/.012,2))+12*Math.exp(-Math.pow((phase-.35)/.019,2))-5*Math.exp(-Math.pow((phase-.55)/.08,2));if(x===0)ecg.moveTo(x,y);else ecg.lineTo(x,y);}ecg.stroke();}

function animate(){
 requestAnimationFrame(animate);const delta=Math.min(clock.getDelta(),.05);if(document.hidden||$('app').hidden)return;
 // Cap to 45fps on high-density/mobile devices, without tying simulation speed to frames.
 renderTime+=delta;if(renderTime<1/45)return;const dt=renderTime;renderTime=0;const start=performance.now();
 state.time+=dt;const t=state.time;state.exposure=THREE.MathUtils.damp(state.exposure,state.target,2.2,dt);
 const e=state.exposure,bpm=72+e*36;frameTime=dt;updateDamage(e);
 state.phase=(state.phase||0)+dt*bpm/60*(1+e*.12*Math.sin(t*4.1)*Math.sin(t*2.3));const beat=state.phase%1;
 const pulse=(Math.exp(-Math.pow((beat-.12)/.065,2))*.052+Math.exp(-Math.pow((beat-.33)/.09,2))*.025)*(1-e*.5);
 heart.scale.setScalar(1+(reducedMotion?0:pulse));heart.position.y=reducedMotion?0:Math.sin(t*.55)*.035;
 bodyMaterials.forEach((m,i)=>m.color.copy(m.userData.baseColor).lerp(damagedColor,e*(i>2?.65:1)));
 vessels[0].color.copy(accent).lerp(new THREE.Color('#806145'),e*.8);
 atmosphere.dust.material.uniforms.uTime.value=t;atmosphere.dust.material.uniforms.uExposure.value=e;
 atmosphere.smokeUniforms.uTime.value=t;atmosphere.smokeUniforms.uExposure.value=e;
 atmosphere.glow.material.uniforms.uExposure.value=e;
 atmosphere.smoke.rotation.z=Math.sin(t*.06)*.08;
 flowParticles.material.uniforms.uExposure.value=e;
 const attr=flowParticles.geometry.attributes.position;
 for(let i=0;i<flowData.length;i++){const f=flowData[i];const bottleneck=1-e*.96*Math.exp(-Math.pow((f.offset-.42)/.08,2));f.offset=(f.offset+dt*f.speed*(1-e*.5)*bottleneck*(1+pulse*8))%1;const p=f.curve.getPoint(f.offset);attr.setXYZ(i,p.x,p.y,p.z+.018);}attr.needsUpdate=true;
 controls.update();heart.updateMatrixWorld();
 const w=$('scene').clientWidth,h=$('scene').clientHeight,sceneTop=$('scene').offsetTop;
 hotpoints.forEach(({el,point,world})=>{world.copy(point);heart.localToWorld(world);world.project(camera);const x=(world.x*.5+.5)*w;el.style.left=`${w<=700?THREE.MathUtils.clamp(x,8,w-el.offsetWidth-8):x}px`;el.style.top=`${sceneTop+(-world.y*.5+.5)*h}px`;const facing=v3(0,0,1).applyQuaternion(heart.quaternion).dot(camera.position.clone().normalize());el.style.opacity=facing>-.35?'1':'0';el.style.pointerEvents=facing>-.35?'auto':'none';});
 if(Math.floor(state.phase)!==lastBeat){lastBeat=Math.floor(state.phase);heartbeatSound();}
 $('bpm').textContent=Math.round(bpm);$('flow-label').textContent=e>.65?'供血受限':e>.25?'流动减缓':'平稳流动';
 [...$('flow-bars').children].forEach((bar,i)=>{bar.style.opacity=i<17-e*11?'1':'.15';bar.style.background=e>.4?'#c39573':'#8d9d83';});drawECG(t,bpm);
 composer.render();window.__heartLab.lastRenderMs=performance.now()-start;
}
export function openHeart(years=0){
 if(!renderer)init();else resize();
 if(years>0){state.lastExposure=Math.min(years/30,1);setMode('exposure');}else setMode('healthy');
}
