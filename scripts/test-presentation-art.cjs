const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict'),vm=require('node:vm'),ts=require('typescript');
function load(name){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/scripts/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:()=>({}),Math});return exports;}
function readAlpha(path){
  const f=fs.readFileSync(path),w=f.readUInt32BE(16),h=f.readUInt32BE(20);assert.equal(f[24],8);assert.equal(f[25],6,'真实透明RGBA');assert.ok(w<=2048&&h<=2048);
  const idat=[];for(let p=8;p<f.length;){const n=f.readUInt32BE(p);if(f.toString('ascii',p+4,p+8)==='IDAT')idat.push(f.subarray(p+8,p+8+n));p+=n+12;}
  const data=zlib.inflateSync(Buffer.concat(idat)),alpha=new Uint8Array(w*h);let previous=new Uint8Array(w);
  const paeth=(a,b,c)=>{const p=a+b-c,x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);return x<=y&&x<=z?a:y<=z?b:c;};
  for(let y=0;y<h;y++){const row=new Uint8Array(w),s=y*(w*4+1),filter=data[s];assert.ok(filter<=4);
    for(let x=0;x<w;x++){const a=x?row[x-1]:0,b=previous[x],c=x?previous[x-1]:0;row[x]=(data[s+1+x*4+3]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;alpha[y*w+x]=row[x];}previous=row;
  }
  assert.ok(alpha.filter(a=>a===0).length>w*h*.2,'透明底和物体间隔');return {w,h,alpha};
}
const {WEAPON_ICON_RECTS,WEAPON_ICON_PATCH_RECTS,BUTCHER_ICON_RECT,HERO_PART_RECTS}=load('presentation-art'),icons=readAlpha('assets/presentation/icons.png'),heroes=readAlpha('assets/presentation/heroes.png');
assert.equal(Object.keys(WEAPON_ICON_RECTS).length+Object.keys(WEAPON_ICON_PATCH_RECTS).length+1,11);
function checkRect(image,rect,minimum=.17){const [x,y,w,h]=rect;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=image.w&&y+h<=image.h,'裁格在纹理内');let visible=0;
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(image.alpha[yy*image.w+xx]>8)visible++;
  assert.ok(visible>w*h*minimum,'裁格确实含完整图案');
  const edge=[];for(let xx=x;xx<x+w;xx++)edge.push(image.alpha[y*image.w+xx],image.alpha[(y+h-1)*image.w+xx]);for(let yy=y;yy<y+h;yy++)edge.push(image.alpha[yy*image.w+x],image.alpha[yy*image.w+x+w-1]);
  assert.ok(edge.filter(a=>a>8).length<4,'裁格不截断武器/头发/胡须轮廓');
}
for(const rect of Object.values(WEAPON_ICON_RECTS))checkRect(icons,rect);
const patch=readAlpha('assets/presentation/weapon-revision.png'),knife=readAlpha('assets/presentation/butcher-knife.png');
for(const rect of Object.values(WEAPON_ICON_PATCH_RECTS))checkRect(patch,rect,.05);checkRect(knife,BUTCHER_ICON_RECT,.05);
for(const [id,rects]of Object.entries(HERO_PART_RECTS)){
  rects.forEach(rect=>checkRect(heroes,rect));assert.equal(rects.length,3);assert.equal(rects[0][2],rects[1][2]);assert.equal(rects[0][3],rects[1][3]);
  const [a,b]=rects;let intersection=0,union=0;for(let y=0;y<a[3];y++)for(let x=0;x<a[2];x++){
    const open=heroes.alpha[(a[1]+y)*heroes.w+a[0]+x]>32,closed=heroes.alpha[(b[1]+y)*heroes.w+b[0]+x]>32;
    if(open&&closed)intersection++;if(open||closed)union++;
  }assert.ok(intersection/union>.94,id+'眨眼轮廓稳定，不突然换头/缩放');
}
assert.equal(JSON.parse(fs.readFileSync('assets/presentation.meta')).userData.bundleName,'presentation');
const {heroIdlePose}=load('hero-idle');
for(const hero of Object.keys(HERO_PART_RECTS)){
  const samples=Array.from({length:3000},(_,i)=>heroIdlePose(hero,i/60,0));const closed=samples.filter(p=>p.eyesClosed).length;
  assert.ok(closed>15&&closed<180,'50秒内可见短暂自然眨眼，不常闭眼');
  for(const pose of samples){assert.ok(Math.abs(pose.headAngle)<5&&Math.abs(pose.headX)<2&&Math.abs(pose.headY)<3);}
  for(let i=0;i<1000;i++){const p=heroIdlePose(hero,i/60,1);assert.ok(Math.abs(p.headAngle)<1e-12);assert.ok(Math.abs(p.headX)<1e-12);assert.ok(Math.abs(p.headY)<1e-12);assert.equal(heroIdlePose(hero,i/60,0,true).eyesClosed,false);}
}
console.log('通过：11武器和三英雄分层图真实透明/纹理尺寸/实测裁格留白/眨眼对齐、三套待机节奏/短眨眼/移动收敛/受击抑制');
